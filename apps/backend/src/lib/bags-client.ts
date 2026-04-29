import { z } from "zod";

import { env } from "../config/env";

const bagsErrorSchema = z.object({
  success: z.literal(false),
  error: z.string().optional(),
  response: z.string().optional(),
});

const bagsPoolSchema = z.object({
  tokenMint: z.string(),
  dbcConfigKey: z.string(),
  dbcPoolKey: z.string(),
  dammV2PoolKey: z.string().nullable().optional(),
});

const bagsTokenLaunchSchema = z
  .object({
    name: z.string(),
    symbol: z.string(),
    description: z.string().nullable().optional(),
    image: z.string().nullable().optional(),
    tokenMint: z.string(),
    status: z.string(),
    twitter: z.string().nullable().optional(),
    website: z.string().nullable().optional(),
    launchSignature: z.string().nullable().optional(),
    accountKeys: z.array(z.string()).optional(),
    numRequiredSigners: z.number().optional(),
    uri: z.string().nullable().optional(),
    dbcPoolKey: z.string().nullable().optional(),
    dbcConfigKey: z.string().nullable().optional(),
  })
  .passthrough();

const bagsTokenCreatorSchema = z
  .object({
    username: z.string().nullable().optional(),
    pfp: z.string().nullable().optional(),
    royaltyBps: z.number().nullable().optional(),
    isCreator: z.boolean().nullable().optional(),
    wallet: z.string().nullable().optional(),
    provider: z.string().nullable().optional(),
    providerUsername: z.string().nullable().optional(),
    twitterUsername: z.string().nullable().optional(),
    bagsUsername: z.string().nullable().optional(),
    isAdmin: z.boolean().nullable().optional(),
  })
  .passthrough();

const bagsTradeQuoteSchema = z.object({
  requestId: z.string(),
  contextSlot: z.number(),
  inAmount: z.string(),
  inputMint: z.string(),
  outAmount: z.string(),
  outputMint: z.string(),
  minOutAmount: z.string(),
  otherAmountThreshold: z.string(),
  priceImpactPct: z.string(),
  slippageBps: z.number(),
  routePlan: z.array(
    z.object({
      venue: z.string(),
      inAmount: z.string(),
      outAmount: z.string(),
      inputMint: z.string(),
      outputMint: z.string(),
      inputMintDecimals: z.number(),
      outputMintDecimals: z.number(),
      marketKey: z.string(),
      data: z.string(),
    }),
  ),
  platformFee: z
    .object({
      amount: z.string(),
      feeBps: z.number(),
      feeAccount: z.string(),
      segmenterFeeAmount: z.string(),
      segmenterFeePct: z.number(),
    })
    .optional(),
  outTransferFee: z.string().optional(),
  simulatedComputeUnits: z.number().optional(),
});

const bagsLifetimeFeesTopTokenSchema = z
  .object({
    token: z.string(),
    lifetimeFees: z.string(),
    tokenInfo: z
      .object({
        name: z.string().nullable().optional(),
        symbol: z.string().nullable().optional(),
        icon: z.string().nullable().optional(),
      })
      .passthrough()
      .nullable()
      .optional(),
  })
  .passthrough();

type BagsPool = z.infer<typeof bagsPoolSchema>;
type BagsTokenCreator = z.infer<typeof bagsTokenCreatorSchema>;
type BagsLifetimeFeesTopToken = z.infer<typeof bagsLifetimeFeesTopTokenSchema>;
type BagsTokenLaunch = z.infer<typeof bagsTokenLaunchSchema>;
type BagsTradeQuote = z.infer<typeof bagsTradeQuoteSchema>;

type RequestOptions = {
  path: string;
  query?: Record<string, boolean | number | string | undefined>;
};

export class BagsApiError extends Error {
  constructor(
    message: string,
    readonly statusCode = 502,
  ) {
    super(message);
  }
}

const request = async <T extends z.ZodTypeAny>(
  options: RequestOptions,
  responseSchema: T,
): Promise<z.infer<T>> => {
  if (!env.bagsApiKey) {
    throw new BagsApiError(
      "BAGS_API_KEY is required for Bags API requests",
      500,
    );
  }

  const url = new URL(`${env.bagsApiBaseUrl}${options.path}`);

  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url, {
    headers: {
      "x-api-key": env.bagsApiKey,
    },
  });

  let payload: unknown;

  try {
    payload = await response.json();
  } catch {
    throw new BagsApiError("Bags API returned a non-JSON response", response.status);
  }

  const baseResponse = z
    .object({ success: z.boolean() })
    .passthrough()
    .parse(payload);

  if (!baseResponse.success) {
    const apiError = bagsErrorSchema.parse(payload);
    throw new BagsApiError(
      apiError.error ?? apiError.response ?? "Bags API request failed",
      response.status,
    );
  }

  const apiSuccess = z
    .object({
      success: z.literal(true),
      response: z.unknown(),
    })
    .parse(payload);

  return responseSchema.parse(apiSuccess.response);
};

export const bagsClient = {
  getTokenLaunchFeed(): Promise<BagsTokenLaunch[]> {
    return request(
      {
        path: "/token-launch/feed",
      },
      z.array(bagsTokenLaunchSchema),
    );
  },

  getPoolByTokenMint(tokenMint: string): Promise<BagsPool> {
    return request(
      {
        path: "/solana/bags/pools/token-mint",
        query: { tokenMint },
      },
      bagsPoolSchema,
    );
  },

  getPools(onlyMigrated = false): Promise<BagsPool[]> {
    return request(
      {
        path: "/solana/bags/pools",
        query: { onlyMigrated },
      },
      z.array(bagsPoolSchema),
    );
  },

  getTokenLaunchCreators(tokenMint: string): Promise<BagsTokenCreator[]> {
    return request(
      {
        path: "/token-launch/creator/v3",
        query: { tokenMint },
      },
      z.array(bagsTokenCreatorSchema),
    );
  },

  getTokenLifetimeFees(tokenMint: string): Promise<string> {
    return request(
      {
        path: "/token-launch/lifetime-fees",
        query: { tokenMint },
      },
      z.string(),
    );
  },

  getLifetimeFeesTopTokens(): Promise<BagsLifetimeFeesTopToken[]> {
    return request(
      {
        path: "/token-launch/top-tokens/lifetime-fees",
      },
      z.array(bagsLifetimeFeesTopTokenSchema),
    );
  },

  getTradeQuote(
    inputMint: string,
    outputMint: string,
    amount: number,
  ): Promise<BagsTradeQuote> {
    return request(
      {
        path: "/trade/quote",
        query: {
          amount,
          inputMint,
          outputMint,
        },
      },
      bagsTradeQuoteSchema,
    );
  },
};
