import { Prisma, type PrismaClient } from "@prisma/client";

import {
  rankMarketCapLeaderboard,
  rankTopGainers,
  rankTrendingTokens,
} from "../bags-leaderboards";
import { getDexScreenerMarketData } from "../dexscreener-client";
import { getMarketSignal, type BagsLaunchView } from "../bags-market";
import {
  chunk,
  toJson,
  type LifetimeFeesTopToken,
  type SnapshotRow,
} from "./shared";

const cachedLeaderboardSideListLimit = 100;
const lamportsPerSol = 1_000_000_000;
const wrappedSolMint = "So11111111111111111111111111111111111111112";
const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
const referenceToleranceMs = 2 * 60 * 60 * 1000;
const maxSparklinePoints = 120;

type SyncLeaderboardEntry = {
  launch: BagsLaunchView;
  latestSignal: number;
  latestSnapshot: SnapshotRow;
  trendScore: number;
};

type TokenMarketHistoryPoint = {
  capturedAt: Date;
  price: number | null;
  tokenMint: string;
};

type MarketHistoryByMint = Map<string, TokenMarketHistoryPoint[]>;
type MarketHistoryReferenceByMint = Map<string, number>;

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

const downsamplePoints = (points: number[], maxPoints = maxSparklinePoints) => {
  if (points.length <= maxPoints) {
    return points;
  }

  return Array.from({ length: maxPoints }, (_, index) => {
    const sourceIndex = Math.round(
      (index / (maxPoints - 1)) * (points.length - 1),
    );

    return points[sourceIndex] as number;
  });
};

const getPriceSparkline = (history: TokenMarketHistoryPoint[] | undefined) => {
  const points =
    history
      ?.filter((snapshot) => snapshot.price !== null)
      .map((snapshot) => snapshot.price as number) ?? [];

  return downsamplePoints(points);
};

const getSevenDayChange = (
  currentPrice: number | null | undefined,
  referencePrice: number | undefined,
) => {
  if (
    currentPrice === null ||
    currentPrice === undefined ||
    referencePrice === undefined ||
    !Number.isFinite(currentPrice) ||
    !Number.isFinite(referencePrice) ||
    referencePrice <= 0
  ) {
    return null;
  }

  return Number(
    (((currentPrice - referencePrice) / referencePrice) * 100).toFixed(2),
  );
};

const getSevenDayMarketHistory = async (
  prisma: PrismaClient,
  tokenMints: string[],
  capturedAt: Date,
) => {
  const historyByMint: MarketHistoryByMint = new Map();
  const referenceByMint: MarketHistoryReferenceByMint = new Map();

  if (tokenMints.length === 0) {
    return {
      historyByMint,
      referenceByMint,
    };
  }

  const sevenDaysAgo = new Date(capturedAt.getTime() - sevenDaysMs);
  const referenceStart = new Date(
    sevenDaysAgo.getTime() - referenceToleranceMs,
  );
  const [history, references] = await Promise.all([
    prisma.tokenMarketSnapshot.findMany({
      where: {
        tokenMint: {
          in: tokenMints,
        },
        price: {
          not: null,
        },
        capturedAt: {
          gte: sevenDaysAgo,
        },
      },
      orderBy: {
        capturedAt: "asc",
      },
      select: {
        capturedAt: true,
        price: true,
        tokenMint: true,
      },
    }),
    prisma.$queryRaw<
      Array<{
        price: number;
        tokenMint: string;
      }>
    >(Prisma.sql`
      SELECT DISTINCT ON ("tokenMint")
        "tokenMint",
        "price"
      FROM "TokenMarketSnapshot"
      WHERE "tokenMint" IN (${Prisma.join(tokenMints)})
        AND "price" IS NOT NULL
        AND "capturedAt" >= ${referenceStart}
        AND "capturedAt" <= ${sevenDaysAgo}
      ORDER BY "tokenMint", "capturedAt" DESC
    `),
  ]);

  for (const snapshot of history) {
    const points = historyByMint.get(snapshot.tokenMint) ?? [];
    points.push(snapshot);
    historyByMint.set(snapshot.tokenMint, points);
  }

  for (const snapshot of references) {
    referenceByMint.set(snapshot.tokenMint, snapshot.price);
  }

  return {
    historyByMint,
    referenceByMint,
  };
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

const getSolUsdPrice = async () => {
  const solMarketData = await getDexScreenerMarketData([wrappedSolMint]);

  return solMarketData.get(wrappedSolMint)?.price ?? null;
};

const toMarketLeaderboardRow = (
  kind: string,
  entry: SyncLeaderboardEntry,
  rank: number,
  metric: string,
  historyByMint: MarketHistoryByMint,
  referenceByMint: MarketHistoryReferenceByMint,
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
  change7d: getSevenDayChange(
    entry.latestSnapshot.price,
    referenceByMint.get(entry.launch.tokenMint),
  ),
  sparkline: toJson(
    getPriceSparkline(historyByMint.get(entry.launch.tokenMint)),
  ),
  label: getLeaderboardLabel(entry.launch),
  href: `/coins/${encodeURIComponent(entry.launch.tokenMint)}`,
  source: "bags",
});

const toTopEarnerLeaderboardRow = (
  entry: LifetimeFeesTopToken,
  launch: BagsLaunchView,
  rank: number,
  solUsdPrice: number | null,
): Prisma.MarketLeaderboardEntryCreateManyInput => {
  const lifetimeFeesSol = Number(entry.lifetimeFees) / lamportsPerSol;

  return {
    kind: "top_earners",
    rank,
    name: entry.tokenInfo?.name ?? launch.name,
    symbol: entry.tokenInfo?.symbol ?? launch.symbol,
    image: entry.tokenInfo?.icon ?? launch.image,
    tokenMint: entry.token,
    metric: formatLifetimeFees(entry.lifetimeFees),
    score: lifetimeFeesSol,
    price: null,
    marketCap:
      solUsdPrice === null || !Number.isFinite(lifetimeFeesSol)
        ? null
        : Number((lifetimeFeesSol * solUsdPrice).toFixed(2)),
    volume24h: null,
    change1h: null,
    change24h: null,
    change7d: null,
    sparkline: toJson(getSparkline(rank + 16, rank)),
    label: "Lifetime creator fees",
    href: `/coins/${encodeURIComponent(entry.token)}`,
    source: "bags",
  };
};

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
  const historyTokenMints = [
    ...new Set(entries.map((entry) => entry.launch.tokenMint)),
  ];
  const { historyByMint, referenceByMint } = await getSevenDayMarketHistory(
    prisma,
    historyTokenMints,
    snapshotRows[0]?.capturedAt instanceof Date
      ? snapshotRows[0].capturedAt
      : new Date(),
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
      historyByMint,
      referenceByMint,
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
        historyByMint,
        referenceByMint,
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
        historyByMint,
        referenceByMint,
      ),
    );
  const solUsdPrice = await getSolUsdPrice().catch(() => null);
  const topEarnerRows = lifetimeFeesTopTokens
    .map((entry, index) => {
      const launch = launchesByMint.get(entry.token);

      if (!launch) {
        return null;
      }

      return toTopEarnerLeaderboardRow(entry, launch, index + 1, solUsdPrice);
    })
    .filter(
      (row): row is Prisma.MarketLeaderboardEntryCreateManyInput =>
        row !== null,
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
