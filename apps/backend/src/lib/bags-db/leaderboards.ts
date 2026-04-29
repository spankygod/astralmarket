import type { PrismaClient } from "@prisma/client";

import {
  rankMarketCapLeaderboard,
  rankTopGainers,
  rankTrendingTokens,
} from "../bags-leaderboards";
import { getMarketSignal, type BagsLaunchView } from "../bags-market";
import {
  marketLeaderboardEntrySelect,
  tokenLeaderboardSelect,
  tokenToLaunchView,
  type CachedLeaderboardRow,
  type TokenWithLeaderboard,
} from "./shared";

type TokenMarketHistoryPoint = {
  capturedAt: Date;
  price: number | null;
  tokenMint: string;
};

type MarketHistoryByMint = Map<string, TokenMarketHistoryPoint[]>;
type MarketHistoryReferenceByMint = Map<string, number>;

const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
const referenceToleranceMs = 2 * 60 * 60 * 1000;
const maxSparklinePoints = 120;

const getRecencyScore = (updatedAt: Date) => {
  const ageHours = Math.max(
    (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60),
    0,
  );

  return Math.max(12 - ageHours / 2, 0);
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

const buildLeaderboardEntry = (token: TokenWithLeaderboard, index: number) => {
  const launch = tokenToLaunchView(token);
  const latestSnapshot = token.snapshots.at(0);
  const latestSignal =
    latestSnapshot?.marketSignal ?? getMarketSignal(launch, index);
  const previousSignal = token.snapshots.at(1)?.marketSignal ?? null;
  const gainerDelta =
    previousSignal === null
      ? latestSignal
      : Number((latestSignal - previousSignal).toFixed(2));
  const trendScore = Number(
    (
      latestSignal +
      getPoolStateScore(launch) +
      getRecencyScore(token.updatedAt)
    ).toFixed(2),
  );

  return {
    launch,
    gainerDelta,
    latestSignal,
    latestSnapshot,
    trendScore,
  };
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

const getPriceSparkline = (
  history: TokenMarketHistoryPoint[] | undefined,
  fallbackScore: number,
  rank: number,
) => {
  const points =
    history
      ?.filter((snapshot) => snapshot.price !== null)
      .map((snapshot) => snapshot.price as number) ?? [];

  if (points.length >= 2) {
    return downsamplePoints(points);
  }

  return getSparkline(fallbackScore, rank);
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
  capturedAt = new Date(),
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
    prisma.tokenMarketSnapshot.findMany({
      where: {
        tokenMint: {
          in: tokenMints,
        },
        price: {
          not: null,
        },
        capturedAt: {
          gte: referenceStart,
          lte: sevenDaysAgo,
        },
      },
      orderBy: {
        capturedAt: "desc",
      },
      select: {
        capturedAt: true,
        price: true,
        tokenMint: true,
      },
    }),
  ]);

  for (const snapshot of history) {
    const points = historyByMint.get(snapshot.tokenMint) ?? [];
    points.push(snapshot);
    historyByMint.set(snapshot.tokenMint, points);
  }

  for (const snapshot of references) {
    if (snapshot.price !== null && !referenceByMint.has(snapshot.tokenMint)) {
      referenceByMint.set(snapshot.tokenMint, snapshot.price);
    }
  }

  return {
    historyByMint,
    referenceByMint,
  };
};

const toLeaderboardItem = (
  entry: ReturnType<typeof buildLeaderboardEntry>,
  rank: number,
  metric: string,
  historyByMint?: MarketHistoryByMint,
  referenceByMint?: MarketHistoryReferenceByMint,
) => ({
  rank,
  name: entry.launch.name,
  symbol: entry.launch.symbol,
  image: entry.launch.image,
  tokenMint: entry.launch.tokenMint,
  metric,
  score: entry.latestSignal,
  price: entry.latestSnapshot?.price ?? null,
  marketCap: entry.latestSnapshot?.marketCap ?? null,
  volume24h: entry.latestSnapshot?.volume24h ?? null,
  change1h: entry.latestSnapshot?.priceChange1h ?? null,
  change24h: entry.latestSnapshot?.priceChange24h ?? null,
  change7d: getSevenDayChange(
    entry.latestSnapshot?.price ?? null,
    referenceByMint?.get(entry.launch.tokenMint),
  ),
  sparkline: getPriceSparkline(
    historyByMint?.get(entry.launch.tokenMint),
    entry.latestSignal,
    rank,
  ),
  label:
    entry.launch.migrationStatus === "migrated"
      ? "Migrated pool"
      : entry.launch.migrationStatus === "dbc"
        ? "Live DBC"
        : "Fresh launch",
  href: `/coins/${encodeURIComponent(entry.launch.tokenMint)}`,
  source: "bags" as const,
});

const toCachedLeaderboardItem = (row: CachedLeaderboardRow) => ({
  rank: row.rank,
  name: row.name,
  symbol: row.symbol,
  image: row.image,
  tokenMint: row.tokenMint,
  metric: row.metric,
  score: row.score,
  price: row.price,
  marketCap: row.marketCap,
  volume24h: row.volume24h,
  change1h: row.change1h,
  change24h: row.change24h,
  change7d: row.change7d,
  sparkline: Array.isArray(row.sparkline)
    ? row.sparkline.filter((value): value is number => typeof value === "number")
    : [],
  label: row.label,
  href: row.href,
  source: "bags" as const,
});

const getTrendingMetric = (entry: ReturnType<typeof buildLeaderboardEntry>) => {
  const change24h = entry.latestSnapshot?.priceChange24h;

  if (change24h !== null && change24h !== undefined) {
    return `${change24h >= 0 ? "+" : ""}${change24h.toFixed(1)}%`;
  }

  const marketCap = entry.latestSnapshot?.marketCap;

  if (marketCap !== null && marketCap !== undefined) {
    return `$${marketCap.toLocaleString(undefined, {
      maximumFractionDigits: 0,
    })}`;
  }

  return "N/A";
};

export const getCachedLeaderboards = async (
  prisma: PrismaClient,
  options: {
    leaderboardLimit: number;
    leaderboardOffset: number;
    sideListLimit: number;
  },
) => {
  const [
    leaderboardTotal,
    leaderboardRows,
    trendingRows,
    topGainerRows,
    topEarnerRows,
  ] = await Promise.all([
    prisma.marketLeaderboardEntry.count({
      where: {
        kind: "market",
      },
    }),
    prisma.marketLeaderboardEntry.findMany({
      where: {
        kind: "market",
      },
      orderBy: {
        rank: "asc",
      },
      skip: options.leaderboardOffset,
      take: options.leaderboardLimit,
      select: marketLeaderboardEntrySelect,
    }),
    prisma.marketLeaderboardEntry.findMany({
      where: {
        kind: "trending",
      },
      orderBy: {
        rank: "asc",
      },
      take: options.sideListLimit,
      select: marketLeaderboardEntrySelect,
    }),
    prisma.marketLeaderboardEntry.findMany({
      where: {
        kind: "top_gainers",
      },
      orderBy: {
        rank: "asc",
      },
      take: options.sideListLimit,
      select: marketLeaderboardEntrySelect,
    }),
    prisma.marketLeaderboardEntry.findMany({
      where: {
        kind: "top_earners",
      },
      orderBy: {
        rank: "asc",
      },
      take: options.sideListLimit,
      select: marketLeaderboardEntrySelect,
    }),
  ]);

  if (leaderboardTotal > 0) {
    return {
      leaderboard: leaderboardRows.map(toCachedLeaderboardItem),
      leaderboardTotal,
      trending: trendingRows.map(toCachedLeaderboardItem),
      topGainers: topGainerRows.map(toCachedLeaderboardItem),
      topEarners: topEarnerRows.map(toCachedLeaderboardItem),
    };
  }

  const tokens = await prisma.bagsToken.findMany({
    select: tokenLeaderboardSelect,
    orderBy: {
      updatedAt: "desc",
    },
  });
  const entries = tokens.map(buildLeaderboardEntry);
  const launchFeedEntries = entries.filter(
    (entry) => entry.launch.status !== "POOL_ONLY",
  );
  const rankedTrending = rankTrendingTokens(launchFeedEntries).slice(
    0,
    options.sideListLimit,
  );
  const rankedTopGainers = rankTopGainers(launchFeedEntries).slice(
    0,
    options.sideListLimit,
  );
  const rankedLeaderboard = rankMarketCapLeaderboard(entries);
  const pagedLeaderboard = rankedLeaderboard.slice(
    options.leaderboardOffset,
    options.leaderboardOffset + options.leaderboardLimit,
  );
  const historyTokenMints = [
    ...new Set(
      [...rankedTrending, ...rankedTopGainers, ...pagedLeaderboard].map(
        (entry) => entry.launch.tokenMint,
      ),
    ),
  ];
  const { historyByMint, referenceByMint } = await getSevenDayMarketHistory(
    prisma,
    historyTokenMints,
  );
  const trending = rankedTrending.map((entry, index) =>
    toLeaderboardItem(
      entry,
      index + 1,
      getTrendingMetric(entry),
      historyByMint,
      referenceByMint,
    ),
  );
  const topGainers = rankedTopGainers.map((entry, index) =>
    toLeaderboardItem(
      entry,
      index + 1,
      `${entry.latestSnapshot?.priceChange24h?.toFixed(1) ?? "N/A"}%`,
      historyByMint,
      referenceByMint,
    ),
  );
  const leaderboard = pagedLeaderboard.map((entry, index) =>
    toLeaderboardItem(
      entry,
      options.leaderboardOffset + index + 1,
      entry.latestSnapshot?.marketCap === null ||
        entry.latestSnapshot?.marketCap === undefined
        ? "N/A"
        : `$${entry.latestSnapshot.marketCap.toLocaleString(undefined, {
            maximumFractionDigits: 0,
          })}`,
      historyByMint,
      referenceByMint,
    ),
  );

  return {
    leaderboard,
    leaderboardTotal: rankedLeaderboard.length,
    trending,
    topGainers,
    topEarners: [],
  };
};
