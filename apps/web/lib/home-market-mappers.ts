import type {
  BagsCategoryData,
  BagsMarketData,
  BagsMarketItem,
} from "@/lib/bags-api";
import {
  formatMarketCap,
  formatPercent,
  formatPrice,
} from "@/lib/market-format";

const unavailableGlobalStats: Array<[string, string, string?]> = [
  ["Bags Launches", "N/A"],
  ["Active Pools", "N/A"],
  ["Live DBC", "N/A"],
  ["Migrated", "N/A"],
  ["Quote Mint", "N/A"],
];

export const leaderboardPageSize = 50;

export type HomeLeaderboardCategory = "all" | "top-earners";

export type BagsTableRow = {
  rank: number;
  name: string;
  symbol: string;
  image?: string | null;
  creator?: BagsMarketItem["creator"];
  badge: string;
  price: string;
  h1: string;
  h24: string;
  d7: string;
  lifetimeFees: string;
  marketCap: string;
  amount: string;
  volume24h: string;
  tokenMint: string;
  sparkline: number[];
  positive: boolean;
};

export type BagsMarketPagination = BagsMarketData["pagination"];

const shortenKey = (value: string) =>
  value.length > 13 ? `${value.slice(0, 6)}...${value.slice(-5)}` : value;

const buildSyntheticSparkline = (
  score: number,
  rank: number,
  positive: boolean,
) => {
  const base = Math.max(score, 1);
  const step = Math.max(base * 0.035, 0.35);
  const shape = [0, 2, 1, 3, 2, 5, 3, 6, 5, 8, 7, 9];

  return shape.map((offset, index) => {
    const trend = positive ? offset : shape.at(-1)! - offset;
    const wobble = ((index + rank) % 3) * step * 0.35;

    return Number((base + trend * step + wobble).toFixed(6));
  });
};

const getSparkline = (item: BagsMarketItem, positive: boolean) => {
  const sparkline =
    item.sparkline?.filter((point) => Number.isFinite(point)) ?? [];

  return sparkline.length >= 2
    ? sparkline
    : buildSyntheticSparkline(item.score, item.rank, positive);
};

const formatUsdcAmount = (value?: number | null) => {
  const formatted = formatMarketCap(value);

  return formatted === "-" ? formatted : `${formatted} USDC`;
};

export const parseLeaderboardCategory = (
  value: string | string[] | undefined,
): HomeLeaderboardCategory => {
  const rawValue = Array.isArray(value) ? value.at(0) : value;
  const normalizedValue = rawValue?.replace(/^-+/u, "");

  return normalizedValue === "top-earners" ? "top-earners" : "all";
};

export const buildGlobalStats = (
  category: BagsCategoryData | null,
): Array<[string, string, string?]> => {
  if (!category) {
    return unavailableGlobalStats;
  }

  return [
    ["Bags Launches", category.stats.launches.toLocaleString()],
    ["Active Pools", category.stats.activePools.toLocaleString()],
    ["Live DBC", category.stats.liveDbcPools.toLocaleString()],
    ["Migrated", `${category.stats.migratedPools.toLocaleString()} pools`],
    ["Quote Mint", shortenKey(category.stats.quoteMint)],
  ];
};

export const mapLeaderboardToRows = (
  leaderboard: BagsMarketItem[] | undefined,
  options: { metricColumn?: "marketCap" | "metric" } = {},
): BagsTableRow[] | null => {
  if (!leaderboard || leaderboard.length === 0) {
    return null;
  }

  return leaderboard.map((item) => {
    const positive = (item.change24h ?? item.score) >= 0;

    return {
      rank: item.rank,
      name: item.name,
      symbol: item.symbol,
      image: item.image,
      creator: item.creator ?? null,
      badge: (item.symbol || item.name || "??").slice(0, 2).toUpperCase(),
      price: formatPrice(item.price),
      h1: formatPercent(item.change1h),
      h24: formatPercent(item.change24h),
      d7: formatPercent(item.change7d),
      lifetimeFees: item.metric,
      marketCap:
        options.metricColumn === "metric"
          ? item.metric
          : formatMarketCap(item.marketCap),
      amount: formatUsdcAmount(
        item.amountUsdc ??
          (options.metricColumn === "metric" ? item.marketCap : null),
      ),
      volume24h: formatMarketCap(item.volume24h),
      tokenMint: item.tokenMint,
      sparkline:
        options.metricColumn === "metric"
          ? getSparkline(item, positive)
          : (item.sparkline?.filter((point) => Number.isFinite(point)) ?? []),
      positive,
    };
  });
};

export const parsePage = (value: string | string[] | undefined) => {
  const rawValue = Array.isArray(value) ? value.at(0) : value;
  const page = Number(rawValue);

  return Number.isInteger(page) && page > 0 ? page : 1;
};
