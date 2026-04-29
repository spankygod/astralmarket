import type { PrismaClient } from "@prisma/client";

import { env } from "../config/env";
import { bagsClient } from "./bags-client";
import {
  getDexScreenerMarketData,
  type DexMarketData,
} from "./dexscreener-client";
import {
  buildLaunchViews,
  buildMarketStats,
  calculateQuotePrice,
  getMarketSignal,
  getNullableQuote,
  type BagsLaunchView,
} from "./bags-market";
import { upsertLaunch } from "./bags-sync/launch-cache";
import { refreshMarketLeaderboardCache } from "./bags-sync/leaderboard-cache";
import { syncCryptoNews } from "./bags-sync/news";
import {
  derivePriceChange,
  getHistoricalPriceReferences,
  pruneExpiredMarketSnapshots,
} from "./bags-sync/snapshots";
import {
  chunk,
  toJson,
  type BagsSyncResult,
} from "./bags-sync/shared";
import { getTokenSupply } from "./solana-rpc";

export { upsertLaunch } from "./bags-sync/launch-cache";
export type { BagsSyncResult } from "./bags-sync/shared";

const fallbackQuoteLimit = 100;

const marketDataPriorityScore = (
  launch: BagsLaunchView,
  dexMarketData: DexMarketData | undefined,
  index: number,
) => {
  if (
    dexMarketData?.marketCap !== null &&
    dexMarketData?.marketCap !== undefined
  ) {
    return dexMarketData.marketCap;
  }

  if (
    dexMarketData?.liquidityUsd !== null &&
    dexMarketData?.liquidityUsd !== undefined
  ) {
    return dexMarketData.liquidityUsd;
  }

  if (
    dexMarketData?.volume24h !== null &&
    dexMarketData?.volume24h !== undefined
  ) {
    return dexMarketData.volume24h;
  }

  return getMarketSignal(launch, index);
};

const getFallbackQuoteTargets = (
  launches: BagsLaunchView[],
  dexResults: Map<string, DexMarketData>,
) =>
  launches
    .map((launch, index) => ({
      launch,
      priorityScore: marketDataPriorityScore(
        launch,
        dexResults.get(launch.tokenMint),
        index,
      ),
    }))
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, fallbackQuoteLimit)
    .map((item) => item.launch);

export const syncBagsMarket = async (
  prisma: PrismaClient,
): Promise<BagsSyncResult> => {
  const startedAt = Date.now();
  const syncRun = await prisma.syncRun.create({
    data: {
      source: "bags",
      status: "running",
    },
  });

  try {
    const [feed, pools, lifetimeFeesTopTokens] = await Promise.all([
      bagsClient.getTokenLaunchFeed(),
      bagsClient.getPools(false),
      bagsClient.getLifetimeFeesTopTokens().catch(() => []),
    ]);
    const launches = buildLaunchViews(feed, pools);
    const launchMints = new Set(launches.map((launch) => launch.tokenMint));
    const poolOnlyLaunches = pools
      .filter((pool) => !launchMints.has(pool.tokenMint))
      .map(
        (pool): BagsLaunchView => ({
          name: pool.tokenMint,
          symbol: "",
          tokenMint: pool.tokenMint,
          status: "POOL_ONLY",
          pool,
          migrationStatus: pool.dammV2PoolKey ? "migrated" : "dbc",
          bagsUrl: `https://bags.fm/${pool.tokenMint}`,
        }),
      );
    const quoteResults = new Map<
      string,
      Awaited<ReturnType<typeof getNullableQuote>>
    >();
    const supplyResults = new Map<
      string,
      Awaited<ReturnType<typeof getTokenSupply>>
    >();
    const dexResults = new Map<string, DexMarketData>();
    const allLaunches = [...launches, ...poolOnlyLaunches];

    for (const dexChunk of chunk(allLaunches, 30)) {
      const dexMarketData = await getDexScreenerMarketData(
        dexChunk.map((launch) => launch.tokenMint),
      );

      for (const [tokenMint, marketData] of dexMarketData.entries()) {
        dexResults.set(tokenMint, marketData);
      }
    }

    const enrichedLaunches = allLaunches.map((launch) => {
      const dexMarketData = dexResults.get(launch.tokenMint);

      if (launch.status !== "POOL_ONLY" || !dexMarketData) {
        return launch;
      }

      return {
        ...launch,
        image: dexMarketData.image ?? launch.image,
        name: dexMarketData.name ?? launch.name,
        symbol: dexMarketData.symbol ?? launch.symbol,
      };
    });

    let rowsWritten = 0;

    for (const launchChunk of chunk(enrichedLaunches, 25)) {
      await Promise.all(
        launchChunk.map(async (launch) => {
          await upsertLaunch(prisma, launch);
        }),
      );
      rowsWritten += launchChunk.length;
    }

    const fallbackQuoteTargets = getFallbackQuoteTargets(
      enrichedLaunches,
      dexResults,
    );

    for (const marketDataChunk of chunk(fallbackQuoteTargets, 5)) {
      const marketData = await Promise.all(
        marketDataChunk.map(async (launch) => ({
          tokenMint: launch.tokenMint,
          quote: await getNullableQuote(launch.tokenMint),
          supply: await getTokenSupply(launch.tokenMint),
        })),
      );

      for (const result of marketData) {
        quoteResults.set(result.tokenMint, result.quote);
        supplyResults.set(result.tokenMint, result.supply);
      }
    }

    const snapshotCapturedAt = new Date();
    const historicalPriceReferences = await getHistoricalPriceReferences(
      prisma,
      enrichedLaunches.map((launch) => launch.tokenMint),
      snapshotCapturedAt,
    );
    let derivedPriceChanges = 0;

    const snapshotRows = enrichedLaunches.map((launch, index) => {
      const quote = quoteResults.get(launch.tokenMint);
      const supply = supplyResults.get(launch.tokenMint);
      const dexMarketData = dexResults.get(launch.tokenMint);
      const price = dexMarketData?.price ?? calculateQuotePrice(quote);
      const marketCap =
        dexMarketData?.marketCap ??
        (price !== null && supply?.uiAmount
          ? Number((price * supply.uiAmount).toFixed(2))
          : null);
      const priceReferences = historicalPriceReferences.get(launch.tokenMint);
      const priceChange1h =
        dexMarketData?.priceChange1h ??
        derivePriceChange(price, priceReferences?.h1);
      const priceChange24h =
        dexMarketData?.priceChange24h ??
        derivePriceChange(price, priceReferences?.h24);

      if (dexMarketData?.priceChange1h == null && priceChange1h !== null) {
        derivedPriceChanges += 1;
      }

      if (dexMarketData?.priceChange24h == null && priceChange24h !== null) {
        derivedPriceChanges += 1;
      }

      return {
        tokenMint: launch.tokenMint,
        quoteMint: env.priceQuoteMint,
        outAmount: quote?.outAmount,
        priceImpactPct: quote?.priceImpactPct,
        rawQuote: quote ? toJson(quote) : undefined,
        tokenSupply: supply?.uiAmountString,
        price,
        marketCap,
        priceChange1h,
        priceChange6h: null,
        priceChange24h,
        volume24h: dexMarketData?.volume24h ?? null,
        liquidityUsd: dexMarketData?.liquidityUsd ?? null,
        dexPairAddress: dexMarketData?.dexPairAddress ?? null,
        dexTokenName: dexMarketData?.name ?? null,
        dexTokenSymbol: dexMarketData?.symbol ?? null,
        dexImage: dexMarketData?.image ?? null,
        marketDataSource: dexMarketData
          ? "dexscreener"
          : price
            ? "bags_quote"
            : undefined,
        marketSignal: getMarketSignal(launch, index),
        migrationStatus: launch.migrationStatus,
        capturedAt: snapshotCapturedAt,
      };
    });

    await prisma.tokenMarketSnapshot.createMany({
      data: snapshotRows,
    });
    rowsWritten += enrichedLaunches.length;
    rowsWritten += await refreshMarketLeaderboardCache(
      prisma,
      enrichedLaunches,
      snapshotRows,
      lifetimeFeesTopTokens,
    );
    const snapshotsPruned = await pruneExpiredMarketSnapshots(
      prisma,
      snapshotCapturedAt,
    );

    for (const newsChunk of chunk(launches.slice(0, 100), 25)) {
      await Promise.all(
        newsChunk.map(async (launch) => {
          const displaySymbol = launch.symbol.trim() || launch.name;
          const detail =
            launch.migrationStatus === "migrated"
              ? "Pool has migrated to DAMM v2."
              : launch.migrationStatus === "dbc"
                ? "Token has an active DBC pool."
                : "Token is still in launch state.";

          await prisma.marketNews.upsert({
            where: {
              sourceKey: `bags_launch_feed:${launch.tokenMint}:${launch.status}`,
            },
            create: {
              sourceKey: `bags_launch_feed:${launch.tokenMint}:${launch.status}`,
              tokenMint: launch.tokenMint,
              headline: `${displaySymbol} entered the Bags launch feed as ${launch.status.replace(/_/gu, " ")}`,
              detail,
              source: "bags_launch_feed",
              href: `/coins/${encodeURIComponent(launch.tokenMint)}`,
            },
            update: {
              headline: `${displaySymbol} entered the Bags launch feed as ${launch.status.replace(/_/gu, " ")}`,
              detail,
              href: `/coins/${encodeURIComponent(launch.tokenMint)}`,
            },
          });
        }),
      );
      rowsWritten += newsChunk.length;
    }
    rowsWritten += await syncCryptoNews(prisma);

    const stats = buildMarketStats(feed, pools);
    const coverage = {
      durationMs: Date.now() - startedAt,
      tokensScanned: enrichedLaunches.length,
      dexScreenerHits: dexResults.size,
      prices: [...dexResults.values()].filter((item) => item.price !== null)
        .length,
      marketCaps: [...dexResults.values()].filter(
        (item) => item.marketCap !== null,
      ).length,
      images: enrichedLaunches.filter((launch) => launch.image).length,
      skippedNoMarketData: enrichedLaunches.length - dexResults.size,
      derivedPriceChanges,
      priceChanges1h: snapshotRows.filter(
        (snapshot) => snapshot.priceChange1h !== null,
      ).length,
      priceChanges24h: snapshotRows.filter(
        (snapshot) => snapshot.priceChange24h !== null,
      ).length,
      snapshotsPruned,
    };

    await prisma.syncRun.update({
      where: {
        id: syncRun.id,
      },
      data: {
        status: "success",
        finishedAt: new Date(),
        rowsRead: feed.length + pools.length,
        rowsWritten,
      },
    });

    return {
      syncRunId: syncRun.id,
      rowsRead: feed.length + pools.length,
      rowsWritten,
      stats,
      coverage,
    };
  } catch (error) {
    await prisma.syncRun.update({
      where: {
        id: syncRun.id,
      },
      data: {
        status: "failed",
        finishedAt: new Date(),
        error: error instanceof Error ? error.message : String(error),
      },
    });

    throw error;
  }
};
