import { type Prisma, type PrismaClient } from "@prisma/client";

import {
  rankMarketCapLeaderboard,
  rankTopGainers,
  rankTrendingTokens,
} from "../bags-leaderboards";
import { getMarketSignal, type BagsLaunchView } from "../bags-market";
import {
  chunk,
  toJson,
  type LifetimeFeesTopToken,
  type SnapshotRow,
} from "./shared";

const cachedLeaderboardSideListLimit = 100;
const lamportsPerSol = 1_000_000_000;

type SyncLeaderboardEntry = {
  launch: BagsLaunchView;
  latestSignal: number;
  latestSnapshot: SnapshotRow;
  trendScore: number;
};

const getPoolStateScore = (launch: BagsLaunchView) => {
  if (launch.migrationStatus === "migrated") {
    return 14;
  }

  if (launch.migrationStatus === "dbc") {
    return 9;
  }

  return 3;
};

const getSparkline = (score: number, rank: number) => {
  const start = Math.max(score - 8 - rank, 1);

  return Array.from({ length: 12 }, (_, index) =>
    Number((start + index * 0.7 + ((index + rank) % 3) * 0.45).toFixed(2)),
  );
};

const getLeaderboardLabel = (launch: BagsLaunchView) =>
  launch.migrationStatus === "migrated"
    ? "Migrated pool"
    : launch.migrationStatus === "dbc"
      ? "Live DBC"
      : "Fresh launch";

const getTrendingMetric = (entry: SyncLeaderboardEntry) => {
  const change24h = entry.latestSnapshot.priceChange24h;

  if (change24h !== null && change24h !== undefined) {
    return `${change24h >= 0 ? "+" : ""}${change24h.toFixed(1)}%`;
  }

  const marketCap = entry.latestSnapshot.marketCap;

  if (marketCap !== null && marketCap !== undefined) {
    return `$${marketCap.toLocaleString(undefined, {
      maximumFractionDigits: 0,
    })}`;
  }

  return "N/A";
};

const formatLifetimeFees = (lifetimeFees: string) => {
  const lamports = Number(lifetimeFees);

  if (!Number.isFinite(lamports) || lamports <= 0) {
    return "0 SOL";
  }

  const sol = lamports / lamportsPerSol;

  return `${sol.toLocaleString(undefined, {
    maximumFractionDigits: sol >= 100 ? 0 : 2,
  })} SOL`;
};

const toMarketLeaderboardRow = (
  kind: string,
  entry: SyncLeaderboardEntry,
  rank: number,
  metric: string,
): Prisma.MarketLeaderboardEntryCreateManyInput => ({
  kind,
  rank,
  name: entry.launch.name,
  symbol: entry.launch.symbol,
  image: entry.launch.image,
  tokenMint: entry.launch.tokenMint,
  metric,
  score: entry.latestSignal,
  price: entry.latestSnapshot.price ?? null,
  marketCap: entry.latestSnapshot.marketCap ?? null,
  volume24h: entry.latestSnapshot.volume24h ?? null,
  change1h: entry.latestSnapshot.priceChange1h ?? null,
  change24h: entry.latestSnapshot.priceChange24h ?? null,
  change7d: null,
  sparkline: toJson(getSparkline(entry.latestSignal, rank)),
  label: getLeaderboardLabel(entry.launch),
  href: `/coins/${encodeURIComponent(entry.launch.tokenMint)}`,
  source: "bags",
});

const toTopEarnerLeaderboardRow = (
  entry: LifetimeFeesTopToken,
  launch: BagsLaunchView,
  rank: number,
): Prisma.MarketLeaderboardEntryCreateManyInput => ({
  kind: "top_earners",
  rank,
  name: entry.tokenInfo?.name ?? launch.name,
  symbol: entry.tokenInfo?.symbol ?? launch.symbol,
  image: entry.tokenInfo?.icon ?? launch.image,
  tokenMint: entry.token,
  metric: formatLifetimeFees(entry.lifetimeFees),
  score: Number(entry.lifetimeFees) / lamportsPerSol,
  price: null,
  marketCap: null,
  volume24h: null,
  change1h: null,
  change24h: null,
  change7d: null,
  sparkline: toJson(getSparkline(rank + 16, rank)),
  label: "Lifetime creator fees",
  href: `/coins/${encodeURIComponent(entry.token)}`,
  source: "bags",
});

export const refreshMarketLeaderboardCache = async (
  prisma: PrismaClient,
  launches: BagsLaunchView[],
  snapshotRows: SnapshotRow[],
  lifetimeFeesTopTokens: LifetimeFeesTopToken[],
) => {
  const snapshotsByMint = new Map(
    snapshotRows.map((snapshot) => [snapshot.tokenMint, snapshot]),
  );
  const launchesByMint = new Map(
    launches.map((launch) => [launch.tokenMint, launch]),
  );
  const entries = launches
    .map((launch, index): SyncLeaderboardEntry | null => {
      const latestSnapshot = snapshotsByMint.get(launch.tokenMint);

      if (!latestSnapshot) {
        return null;
      }

      const latestSignal =
        latestSnapshot.marketSignal ?? getMarketSignal(launch, index);
      const recencyScore = Math.max(12 - index * 0.002, 0);
      const trendScore = Number(
        (latestSignal + getPoolStateScore(launch) + recencyScore).toFixed(2),
      );

      return {
        launch,
        latestSignal,
        latestSnapshot,
        trendScore,
      };
    })
    .filter((entry): entry is SyncLeaderboardEntry => entry !== null);
  const launchFeedEntries = entries.filter(
    (entry) => entry.launch.status !== "POOL_ONLY",
  );
  const marketRows = rankMarketCapLeaderboard(entries).map((entry, index) =>
    toMarketLeaderboardRow(
      "market",
      entry,
      index + 1,
      entry.latestSnapshot.marketCap === null ||
        entry.latestSnapshot.marketCap === undefined
        ? "N/A"
        : `$${entry.latestSnapshot.marketCap.toLocaleString(undefined, {
            maximumFractionDigits: 0,
          })}`,
    ),
  );
  const trendingRows = rankTrendingTokens(launchFeedEntries)
    .slice(0, cachedLeaderboardSideListLimit)
    .map((entry, index) =>
      toMarketLeaderboardRow(
        "trending",
        entry,
        index + 1,
        getTrendingMetric(entry),
      ),
    );
  const topGainerRows = rankTopGainers(launchFeedEntries)
    .slice(0, cachedLeaderboardSideListLimit)
    .map((entry, index) =>
      toMarketLeaderboardRow(
        "top_gainers",
        entry,
        index + 1,
        `${entry.latestSnapshot.priceChange24h?.toFixed(1) ?? "N/A"}%`,
      ),
    );
  const topEarnerRows = lifetimeFeesTopTokens
    .map((entry, index) => {
      const launch = launchesByMint.get(entry.token);

      if (!launch) {
        return null;
      }

      return toTopEarnerLeaderboardRow(entry, launch, index + 1);
    })
    .filter(
      (
        row,
      ): row is Prisma.MarketLeaderboardEntryCreateManyInput => row !== null,
    );
  const rows = [
    ...marketRows,
    ...trendingRows,
    ...topGainerRows,
    ...topEarnerRows,
  ];

  await prisma.$transaction(async (tx) => {
    await tx.marketLeaderboardEntry.deleteMany();

    for (const rowChunk of chunk(rows, 1000)) {
      if (rowChunk.length > 0) {
        await tx.marketLeaderboardEntry.createMany({
          data: rowChunk,
        });
      }
    }
  });

  return rows.length;
};
