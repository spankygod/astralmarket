export type BagsLaunch = {
  name: string;
  symbol: string;
  tokenMint: string;
  status: string;
  website?: string | null;
  twitter?: string | null;
  uri?: string | null;
  dbcPoolKey?: string | null;
  pool: {
    dbcPoolKey: string;
    dammV2PoolKey?: string | null;
  } | null;
  migrationStatus: "migrated" | "dbc" | "launching";
};

export type BagsCategoryData = {
  stats: {
    launches: number;
    activePools: number;
    migratedPools: number;
    liveDbcPools: number;
    quoteMint: string;
  };
  launches: BagsLaunch[];
};

export type BagsMarketItem = {
  rank: number;
  name: string;
  symbol: string;
  image?: string | null;
  tokenMint: string;
  metric: string;
  score: number;
  price?: number | null;
  marketCap?: number | null;
  volume24h?: number | null;
  change1h?: number | null;
  change24h?: number | null;
  change7d?: number | null;
  sparkline?: number[];
  label: string;
  href: string;
  source: "bags";
};

export type BagsMarketNewsItem = {
  headline: string;
  detail: string;
  tokenMint?: string;
  href: string;
  source: string;
  createdAt: string;
};

export type BagsMarketData = {
  stats: BagsCategoryData["stats"];
  leaderboard: BagsMarketItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  trending: BagsMarketItem[];
  topGainers: BagsMarketItem[];
  insights: BagsMarketNewsItem[];
  latestBagsSignals: BagsMarketNewsItem[];
  latestCryptoNews: BagsMarketNewsItem[];
  latestMarketNews: BagsMarketNewsItem[];
};

export type BagsCoinDetailData = {
  token: {
    name: string;
    symbol: string;
    description?: string | null;
    image?: string | null;
    tokenMint: string;
    status: string;
    migrationStatus: "migrated" | "dbc" | "launching";
    bagsUrl: string;
    website?: string | null;
    twitter?: string | null;
    uri?: string | null;
    launchSignature?: string | null;
    dbcPoolKey?: string | null;
    dbcConfigKey?: string | null;
  };
  pool: {
    tokenMint: string;
    dbcConfigKey: string;
    dbcPoolKey: string;
    dammV2PoolKey?: string | null;
  } | null;
  creators: Array<{
    username?: string | null;
    pfp?: string | null;
    royaltyBps?: number | null;
    isCreator?: boolean | null;
    wallet?: string | null;
    provider?: string | null;
    providerUsername?: string | null;
    twitterUsername?: string | null;
    bagsUsername?: string | null;
    isAdmin?: boolean | null;
  }>;
  lifetimeFeesLamports: string | null;
  quote: unknown | null;
  marketSignal: {
    value: number;
    source: "derived_from_bags_pool_state";
  };
  market: {
    price?: number | null;
    marketCap?: number | null;
    change1h?: number | null;
    change6h?: number | null;
    change24h?: number | null;
  };
  marketHistory: Array<{
    capturedAt: string;
    price: number | null;
    marketCap: number | null;
    marketSignal: number | null;
  }>;
  quoteMint: string;
};

type ApiEnvelope<T> = {
  success: true;
  response: T;
};

type FetchBackendOptions = {
  revalidate: number;
  tags?: string[];
};

export const getBackendBaseUrl = () =>
  (process.env.ASTRALMARKET_API_BASE_URL ?? "http://127.0.0.1:4000").replace(
    /\/$/u,
    "",
  );

const fetchBackend = async <T>(
  path: string,
  options: FetchBackendOptions,
): Promise<T | null> => {
  try {
    const response = await fetch(`${getBackendBaseUrl()}${path}`, {
      next: {
        revalidate: options.revalidate,
        tags: options.tags,
      },
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as ApiEnvelope<T>;
    return payload.success ? payload.response : null;
  } catch {
    return null;
  }
};

export const fetchBagsCategory = () =>
  fetchBackend<BagsCategoryData>("/v1/bags/category", {
    revalidate: 300,
    tags: ["bags-category"],
  });

export const fetchBagsMarket = (
  options: { page?: number; pageSize?: number } = {},
) => {
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? 25;

  return fetchBackend<BagsMarketData>(
    `/v1/bags/market?limit=${pageSize}&page=${page}`,
    {
      revalidate: 30,
      tags: ["bags-market"],
    },
  );
};

export const fetchBagsCoin = (identifier: string) =>
  fetchBackend<BagsCoinDetailData>(
    `/v1/bags/coins/${encodeURIComponent(identifier)}`,
    {
      revalidate: 60,
      tags: ["bags-coin", `bags-coin-${identifier}`],
    },
  );
