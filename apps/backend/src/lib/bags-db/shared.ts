import type { Prisma } from "@prisma/client";

import { getMarketSignal, type BagsLaunchView } from "../bags-market";

export const poolSelect = {
  tokenMint: true,
  dbcConfigKey: true,
  dbcPoolKey: true,
  dammV2PoolKey: true,
} satisfies Prisma.BagsPoolSelect;

export const tokenWithPoolSelect = {
  name: true,
  symbol: true,
  description: true,
  image: true,
  tokenMint: true,
  status: true,
  twitter: true,
  website: true,
  launchSignature: true,
  uri: true,
  migrationStatus: true,
  updatedAt: true,
  pool: {
    select: poolSelect,
  },
} satisfies Prisma.BagsTokenSelect;

export const creatorSelect = {
  username: true,
  pfp: true,
  royaltyBps: true,
  isCreator: true,
  wallet: true,
  provider: true,
  providerUsername: true,
  twitterUsername: true,
  bagsUsername: true,
  isAdmin: true,
} satisfies Prisma.TokenCreatorSelect;

export const leaderboardSnapshotSelect = {
  marketSignal: true,
  price: true,
  marketCap: true,
  volume24h: true,
  priceChange1h: true,
  priceChange24h: true,
} satisfies Prisma.TokenMarketSnapshotSelect;

export const detailSnapshotSelect = {
  capturedAt: true,
  price: true,
  marketCap: true,
  marketSignal: true,
  priceChange1h: true,
  priceChange24h: true,
  lifetimeFeesLamports: true,
} satisfies Prisma.TokenMarketSnapshotSelect;

export const latestSnapshotPayloadSelect = {
  ...detailSnapshotSelect,
  rawQuote: true,
} satisfies Prisma.TokenMarketSnapshotSelect;

export const marketLeaderboardEntrySelect = {
  rank: true,
  name: true,
  symbol: true,
  image: true,
  tokenMint: true,
  metric: true,
  score: true,
  price: true,
  marketCap: true,
  volume24h: true,
  change1h: true,
  change24h: true,
  change7d: true,
  sparkline: true,
  label: true,
  href: true,
  source: true,
} satisfies Prisma.MarketLeaderboardEntrySelect;

export const tokenLeaderboardSelect = {
  ...tokenWithPoolSelect,
  snapshots: {
    orderBy: {
      capturedAt: "desc",
    },
    take: 2,
    select: leaderboardSnapshotSelect,
  },
} satisfies Prisma.BagsTokenSelect;

export type TokenWithPool = Prisma.BagsTokenGetPayload<{
  select: typeof tokenWithPoolSelect;
}>;

export type TokenCreatorView = Prisma.TokenCreatorGetPayload<{
  select: typeof creatorSelect;
}>;

export type TokenDetailSnapshot = Prisma.TokenMarketSnapshotGetPayload<{
  select: typeof latestSnapshotPayloadSelect;
}>;

export type TokenWithDetails = TokenWithPool & {
  creators: TokenCreatorView[];
  snapshots: TokenDetailSnapshot[];
};

export type TokenWithLeaderboard = Prisma.BagsTokenGetPayload<{
  select: typeof tokenLeaderboardSelect;
}>;

export type CachedLeaderboardRow = Prisma.MarketLeaderboardEntryGetPayload<{
  select: typeof marketLeaderboardEntrySelect;
}>;

export const toJson = (value: unknown) => value as Prisma.InputJsonValue;

export const tokenToLaunchView = (token: TokenWithPool): BagsLaunchView => ({
  name: token.name,
  symbol: token.symbol,
  description: token.description,
  image: token.image,
  tokenMint: token.tokenMint,
  status: token.status,
  twitter: token.twitter,
  website: token.website,
  launchSignature: token.launchSignature,
  uri: token.uri,
  dbcPoolKey: token.pool?.dbcPoolKey,
  dbcConfigKey: token.pool?.dbcConfigKey,
  pool: token.pool
    ? {
        tokenMint: token.pool.tokenMint,
        dbcConfigKey: token.pool.dbcConfigKey ?? "",
        dbcPoolKey: token.pool.dbcPoolKey ?? "",
        dammV2PoolKey: token.pool.dammV2PoolKey,
      }
    : null,
  migrationStatus:
    token.migrationStatus === "migrated" || token.migrationStatus === "dbc"
      ? token.migrationStatus
      : "launching",
  bagsUrl: `https://bags.fm/${token.tokenMint}`,
  updatedAt: token.updatedAt,
});

export const buildCachedMarketItem = (
  launch: BagsLaunchView,
  index: number,
) => {
  return {
    name: launch.name,
    symbol: launch.symbol,
    tokenMint: launch.tokenMint,
    status: launch.status,
    metric: `${getMarketSignal(launch, index).toFixed(1)} signal`,
    label:
      launch.migrationStatus === "migrated"
        ? "Migrated pool"
        : launch.migrationStatus === "dbc"
          ? "Live DBC"
          : "Fresh launch",
    href: `/coins/${encodeURIComponent(launch.tokenMint)}`,
    source: "bags" as const,
  };
};
