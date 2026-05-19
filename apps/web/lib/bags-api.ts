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
    totalMarketCap: number | null;
    totalVolume24h: number | null;
    history: Array<{
      capturedAt: string;
      totalMarketCap: number | null;
      totalVolume24h: number | null;
    }>;
  };
  launches: BagsLaunch[];
};

export type BagsMarketItem = {
  rank: number;
  name: string;
  symbol: string;
  image?: string | null;
  twitter?: string | null;
  tokenMint: string;
  metric: string;
  score: number;
  price?: number | null;
  marketCap?: number | null;
  amountUsdc?: number | null;
  volume24h?: number | null;
  change1h?: number | null;
  change24h?: number | null;
  change7d?: number | null;
  sparkline?: number[];
  label: string;
  href: string;
  source: "bags";
  creator?: BagsCreator | null;
};

export type BagsCreator = {
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
  topEarners?: BagsMarketItem[];
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
    change7d?: number | null;
    volume24h?: number | null;
    liquidityUsd?: number | null;
    tokenSupply?: string | null;
    dexPairAddress?: string | null;
    dexTokenName?: string | null;
    dexTokenSymbol?: string | null;
    dexImage?: string | null;
    marketDataSource?: string | null;
    lastUpdatedAt?: string | null;
  };
  marketHistory: Array<{
    capturedAt: string;
    price: number | null;
    marketCap: number | null;
    marketSignal: number | null;
    priceChange1h: number | null;
    priceChange6h: number | null;
    priceChange24h: number | null;
    volume24h: number | null;
    liquidityUsd: number | null;
  }>;
  leaderboardRanks?: Array<{
    kind: string;
    rank: number;
    label: string;
    metric: string;
  }>;
  news?: Array<{
    headline: string;
    detail: string;
    href: string | null;
    source: string;
    createdAt: string;
  }>;
  quoteMint: string;
};

export type BagsTradeRouteLeg = {
  venue: string;
  inAmount: string;
  outAmount: string;
  inputMint: string;
  outputMint: string;
  inputMintDecimals: number;
  outputMintDecimals: number;
  marketKey: string;
  data?: string | null;
};

export type BagsTradeQuote = {
  requestId: string;
  contextSlot: number;
  inAmount: string;
  inputMint: string;
  outAmount: string;
  outputMint: string;
  minOutAmount: string;
  otherAmountThreshold: string;
  priceImpactPct: string;
  slippageBps: number;
  routePlan: BagsTradeRouteLeg[];
  platformFee?: {
    amount?: string | null;
    feeBps?: number | null;
    feeAccount?: string | null;
    segmenterFeeAmount?: string | null;
    segmenterFeePct?: number | null;
  };
  outTransferFee?: string | null;
  simulatedComputeUnits?: number;
};

export type BagsSwapTransaction = {
  swapTransaction: string;
  computeUnitLimit: number;
  lastValidBlockHeight: number;
  prioritizationFeeLamports: number;
};

type ApiEnvelope<T> = {
  success: true;
  response: T;
};

type FetchBackendOptions = {
  body?: unknown;
  method?: "GET" | "POST";
  revalidate?: number;
  tags?: string[];
};

type TradeApiResult<T> = {
  response: T | null;
  status: number | null;
};

export const getBackendBaseUrl = () =>
  (
    process.env.NEXT_PUBLIC_ASTRALMARKET_API_BASE_URL ??
    process.env.ASTRALMARKET_API_BASE_URL ??
    (process.env.NODE_ENV === "development"
      ? "http://127.0.0.1:4000"
      : "https://api.astralmarket.xyz")
  ).replace(/\/$/u, "");

const fetchBackend = async <T>(
  path: string,
  options: FetchBackendOptions,
): Promise<T | null> => {
  try {
    const isServer = typeof window === "undefined";
    const method = options.method ?? "GET";
    const fetchOptions =
      !isServer || process.env.NODE_ENV === "development" || method !== "GET"
        ? { cache: "no-store" as const }
        : {
            next: {
              revalidate: options.revalidate,
              tags: options.tags,
            },
          };
    const headers =
      options.body === undefined
        ? undefined
        : {
            "Content-Type": "application/json",
          };
    const response = await fetch(`${getBackendBaseUrl()}${path}`, {
      ...fetchOptions,
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
      headers,
      method,
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

const fetchTradeBackend = async <T>(
  path: string,
  body: unknown,
): Promise<TradeApiResult<T>> => {
  try {
    const response = await fetch(`${getBackendBaseUrl()}${path}`, {
      body: JSON.stringify(body),
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    if (!response.ok) {
      return {
        response: null,
        status: response.status,
      };
    }

    const payload = (await response.json()) as ApiEnvelope<T>;

    return {
      response: payload.success ? payload.response : null,
      status: response.status,
    };
  } catch {
    return {
      response: null,
      status: null,
    };
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
    `/v1/bags/market?limit=${pageSize}&page=${page}&schema=amount-creator-v1`,
    {
      revalidate: 300,
      tags: ["bags-market"],
    },
  );
};

export const fetchBagsCoin = (identifier: string) =>
  fetchBackend<BagsCoinDetailData>(
    `/v1/bags/coins/${encodeURIComponent(identifier)}`,
    {
      revalidate: 300,
      tags: ["bags-coin", `bags-coin-${identifier}`],
    },
  );

export const fetchBagsTradeQuote = (body: {
  amount: number;
  inputMint: string;
  outputMint: string;
  slippageBps?: number;
  slippageMode?: "auto" | "manual";
}) =>
  fetchTradeBackend<BagsTradeQuote>("/v1/bags/trade/quote", body).then(
    (result) => result.response,
  );

export const fetchBagsTradeQuoteResult = (body: {
  amount: number;
  inputMint: string;
  outputMint: string;
  slippageBps?: number;
  slippageMode?: "auto" | "manual";
}) => fetchTradeBackend<BagsTradeQuote>("/v1/bags/trade/quote", body);

export const createBagsSwapTransaction = (body: {
  quoteResponse: BagsTradeQuote;
  userPublicKey: string;
}) =>
  fetchTradeBackend<BagsSwapTransaction>("/v1/bags/trade/swap", body).then(
    (result) => result.response,
  );

export const createBagsSwapTransactionResult = (body: {
  quoteResponse: BagsTradeQuote;
  userPublicKey: string;
}) => fetchTradeBackend<BagsSwapTransaction>("/v1/bags/trade/swap", body);

export const sendBagsSignedTransaction = (body: { transaction: string }) =>
  fetchBackend<string>("/v1/bags/trade/send", {
    body,
    method: "POST",
  });
