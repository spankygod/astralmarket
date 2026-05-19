type DexPair = {
  chainId?: string;
  pairAddress?: string;
  baseToken?: {
    address?: string;
    name?: string;
    symbol?: string;
  };
  info?: {
    imageUrl?: string;
    socials?: Array<{
      type?: string;
      url?: string;
    }>;
    websites?: Array<{
      label?: string;
      url?: string;
    }>;
  } | null;
  priceUsd?: string | null;
  priceChange?: {
    h1?: number;
    h6?: number;
    h24?: number;
  } | null;
  volume?: {
    h24?: number;
  } | null;
  liquidity?: {
    usd?: number;
  } | null;
  marketCap?: number | null;
  fdv?: number | null;
};

const parsePair = (pair: unknown): DexPair | null => {
  if (!pair || typeof pair !== "object") {
    return null;
  }

  return pair as DexPair;
};

const chooseBestPair = (tokenMint: string, pairs: DexPair[]) => {
  const normalizedMint = tokenMint.toLowerCase();
  const matchingPairs = pairs.filter(
    (pair) =>
      pair.chainId === "solana" &&
      pair.baseToken?.address?.toLowerCase() === normalizedMint,
  );

  return matchingPairs.sort(
    (a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0),
  )[0];
};

export type DexMarketData = {
  dexPairAddress: string | null;
  image: string | null;
  marketCap: number | null;
  name: string | null;
  price: number | null;
  priceChange1h: number | null;
  priceChange6h: number | null;
  priceChange24h: number | null;
  symbol: string | null;
  twitter: string | null;
  volume24h: number | null;
  website: string | null;
  liquidityUsd: number | null;
};

export const getDexScreenerMarketData = async (
  tokenMints: string[],
): Promise<Map<string, DexMarketData>> => {
  const marketData = new Map<string, DexMarketData>();

  if (tokenMints.length === 0) {
    return marketData;
  }

  const url = `https://api.dexscreener.com/tokens/v1/solana/${tokenMints.join(",")}`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    return marketData;
  }

  let payload: unknown;

  try {
    payload = await response.json();
  } catch {
    return marketData;
  }

  const pairs = Array.isArray(payload)
    ? payload.map(parsePair).filter((pair): pair is DexPair => pair !== null)
    : [];

  for (const tokenMint of tokenMints) {
    const pair = chooseBestPair(tokenMint, pairs);

    if (!pair) {
      continue;
    }

    const price = pair.priceUsd ? Number(pair.priceUsd) : null;

    marketData.set(tokenMint, {
      dexPairAddress: pair.pairAddress ?? null,
      image: pair.info?.imageUrl ?? null,
      marketCap: pair.marketCap ?? pair.fdv ?? null,
      name: pair.baseToken?.name ?? null,
      price: price !== null && Number.isFinite(price) ? price : null,
      priceChange1h: pair.priceChange?.h1 ?? null,
      priceChange6h: pair.priceChange?.h6 ?? null,
      priceChange24h: pair.priceChange?.h24 ?? null,
      symbol: pair.baseToken?.symbol ?? null,
      twitter:
        pair.info?.socials?.find(
          (social) => social.type?.toLowerCase() === "twitter",
        )?.url ?? null,
      volume24h: pair.volume?.h24 ?? null,
      website: pair.info?.websites?.at(0)?.url ?? null,
      liquidityUsd: pair.liquidity?.usd ?? null,
    });
  }

  return marketData;
};
