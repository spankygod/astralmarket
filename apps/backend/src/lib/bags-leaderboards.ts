export type RankingSnapshot = {
  liquidityUsd: number | null;
  marketCap: number | null;
  priceChange24h: number | null;
  volume24h?: number | null;
};

export type RankingEntry = {
  createdAt?: Date | null;
  latestSignal: number;
  latestSnapshot?: RankingSnapshot | null;
  trendScore: number;
};

const minimumDiscoveryAgeHours = 24;
const minimumDiscoveryLiquidityUsd = 10_000;
const minimumTopGainerLiquidityUsd = 1_000;
const maximumMarketCapLiquidityRatio = 200;

const hoursSince = (date?: Date | null) =>
  date ? (Date.now() - date.getTime()) / (1000 * 60 * 60) : Infinity;

const isFinitePositiveNumber = (
  value: number | null | undefined,
): value is number =>
  value !== null && value !== undefined && Number.isFinite(value) && value > 0;

const hasSaneMarketDepth = (entry: RankingEntry) => {
  const liquidityUsd = entry.latestSnapshot?.liquidityUsd;
  const marketCap = entry.latestSnapshot?.marketCap;

  if (!isFinitePositiveNumber(liquidityUsd)) {
    return false;
  }

  if (liquidityUsd < minimumDiscoveryLiquidityUsd) {
    return false;
  }

  if (!isFinitePositiveNumber(marketCap)) {
    return true;
  }

  return marketCap / liquidityUsd <= maximumMarketCapLiquidityRatio;
};

export const isDiscoveryRankEligible = (entry: RankingEntry) =>
  hoursSince(entry.createdAt) >= minimumDiscoveryAgeHours &&
  hasSaneMarketDepth(entry);

const hasAnyMarketActivity = (entry: RankingEntry) =>
  isFinitePositiveNumber(entry.latestSnapshot?.liquidityUsd) ||
  isFinitePositiveNumber(entry.latestSnapshot?.volume24h) ||
  isFinitePositiveNumber(entry.latestSnapshot?.marketCap);

const hasTopGainerDepth = (entry: RankingEntry) => {
  const liquidityUsd = entry.latestSnapshot?.liquidityUsd;

  return (
    isFinitePositiveNumber(liquidityUsd) &&
    liquidityUsd >= minimumTopGainerLiquidityUsd
  );
};

export const isTrendingEligible = (entry: RankingEntry) =>
  hasAnyMarketActivity(entry);

export const isTopGainerEligible = (entry: RankingEntry) =>
  hasTopGainerDepth(entry) &&
  entry.latestSnapshot?.priceChange24h !== null &&
  entry.latestSnapshot?.priceChange24h !== undefined &&
  Number.isFinite(entry.latestSnapshot.priceChange24h);

const marketCapValue = (entry: RankingEntry) =>
  isDiscoveryRankEligible(entry) ? (entry.latestSnapshot?.marketCap ?? -1) : -1;

const change24hValue = (entry: RankingEntry) =>
  entry.latestSnapshot?.priceChange24h ?? -Infinity;

export const rankMarketCapLeaderboard = <T extends RankingEntry>(
  entries: T[],
) =>
  [...entries].sort(
    (a, b) =>
      marketCapValue(b) - marketCapValue(a) ||
      change24hValue(b) - change24hValue(a) ||
      b.trendScore - a.trendScore,
  );

export const rankTrendingTokens = <T extends RankingEntry>(entries: T[]) =>
  entries
    .filter(isTrendingEligible)
    .sort((a, b) => b.trendScore - a.trendScore);

export const rankTopGainers = <T extends RankingEntry>(entries: T[]) =>
  entries
    .filter(isTopGainerEligible)
    .sort(
      (a, b) =>
        change24hValue(b) - change24hValue(a) ||
        b.latestSignal - a.latestSignal,
    );
