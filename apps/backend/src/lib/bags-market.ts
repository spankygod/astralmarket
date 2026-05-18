import { env } from "../config/env";
import { BagsApiError, bagsClient } from "./bags-client";

type BagsPool = Awaited<ReturnType<typeof bagsClient.getPools>>[number];
type BagsLaunch = Awaited<
  ReturnType<typeof bagsClient.getTokenLaunchFeed>
>[number];

export type BagsLaunchView = {
  name: string;
  symbol: string;
  description?: string | null;
  image?: string | null;
  tokenMint: string;
  status: string;
  twitter?: string | null;
  website?: string | null;
  launchSignature?: string | null;
  uri?: string | null;
  dbcPoolKey?: string | null;
  dbcConfigKey?: string | null;
  pool: BagsPool | null;
  migrationStatus: "migrated" | "dbc" | "launching";
  bagsUrl: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export const getMigrationStatus = (
  launch: { dbcPoolKey?: string | null },
  pool?: { dammV2PoolKey?: string | null } | null,
) => {
  if (pool?.dammV2PoolKey) {
    return "migrated" as const;
  }

  if (pool || launch.dbcPoolKey) {
    return "dbc" as const;
  }

  return "launching" as const;
};

export const getMarketSignal = (
  launch: Pick<BagsLaunchView, "migrationStatus" | "pool">,
  index: number,
) => {
  const base =
    launch.migrationStatus === "migrated"
      ? 18
      : launch.migrationStatus === "dbc"
        ? 12
        : 6;
  const poolBonus = launch.pool ? 5 : 0;
  const feedPositionScore = Math.max(20 - index * 0.25, 0);

  return Number((base + poolBonus + feedPositionScore).toFixed(1));
};

export const formatSignal = (value: number) =>
  `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;

export const calculateQuotePrice = (quote: unknown) => {
  if (!quote || typeof quote !== "object" || Array.isArray(quote)) {
    return null;
  }

  const payload = quote as {
    inAmount?: unknown;
    outAmount?: unknown;
    routePlan?: unknown;
  };

  if (
    typeof payload.inAmount !== "string" ||
    typeof payload.outAmount !== "string" ||
    !Array.isArray(payload.routePlan)
  ) {
    return null;
  }

  const firstRoute = payload.routePlan.at(0) as
    | {
        inputMintDecimals?: unknown;
        outputMintDecimals?: unknown;
      }
    | undefined;

  if (
    typeof firstRoute?.inputMintDecimals !== "number" ||
    typeof firstRoute.outputMintDecimals !== "number"
  ) {
    return null;
  }

  const input = Number(payload.inAmount) / 10 ** firstRoute.inputMintDecimals;
  const output =
    Number(payload.outAmount) / 10 ** firstRoute.outputMintDecimals;

  if (!Number.isFinite(input) || input <= 0 || !Number.isFinite(output)) {
    return null;
  }

  return output / input;
};

export const buildLaunchViews = (
  feed: BagsLaunch[],
  pools: BagsPool[],
): BagsLaunchView[] => {
  const poolsByMint = new Map(pools.map((pool) => [pool.tokenMint, pool]));

  return feed.map((launch) => {
    const pool = poolsByMint.get(launch.tokenMint) ?? null;

    return {
      name: launch.name,
      symbol: launch.symbol,
      description: launch.description,
      image: launch.image,
      tokenMint: launch.tokenMint,
      status: launch.status,
      twitter: launch.twitter,
      website: launch.website,
      launchSignature: launch.launchSignature,
      uri: launch.uri,
      dbcPoolKey: launch.dbcPoolKey,
      dbcConfigKey: launch.dbcConfigKey,
      pool,
      migrationStatus: getMigrationStatus(launch, pool),
      bagsUrl: `https://bags.fm/${launch.tokenMint}`,
    };
  });
};

export const buildMarketStats = (feed: BagsLaunch[], pools: BagsPool[]) => {
  const migratedPools = pools.filter((pool) => pool.dammV2PoolKey).length;

  return {
    launches: feed.length,
    activePools: pools.length,
    migratedPools,
    liveDbcPools: Math.max(pools.length - migratedPools, 0),
    quoteMint: env.priceQuoteMint,
    totalMarketCap: null,
    totalVolume24h: null,
    history: [],
  };
};

const normalizeIdentifier = (value: string) =>
  decodeURIComponent(value).trim().toLowerCase();

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-|-$/gu, "");

export const findLaunchByIdentifier = (
  launches: BagsLaunchView[],
  identifier: string,
) => {
  const normalized = normalizeIdentifier(identifier);

  return (
    launches.find(
      (launch) =>
        launch.tokenMint.toLowerCase() === normalized ||
        launch.symbol.toLowerCase() === normalized ||
        slugify(launch.name) === normalized,
    ) ?? null
  );
};

export const getNullableQuote = async (tokenMint: string) => {
  try {
    return await bagsClient.getTradeQuote(
      tokenMint,
      env.priceQuoteMint,
      1_000_000,
    );
  } catch (error) {
    if (error instanceof BagsApiError) {
      return null;
    }

    throw error;
  }
};
