import type { Prisma } from "@prisma/client";
import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";

import { env } from "../../../../../config/env";
import { BagsApiError, bagsClient } from "../../../../../lib/bags-client";
import {
  findCachedToken,
  tokenWithDetailsToResponse,
  upsertCachedCreators,
} from "../../../../../lib/bags-db";
import { getDexScreenerMarketData } from "../../../../../lib/dexscreener-client";
import {
  buildLaunchViews,
  calculateQuotePrice,
  findLaunchByIdentifier,
  getMarketSignal,
  getNullableQuote,
} from "../../../../../lib/bags-market";
import { upsertLaunch } from "../../../../../lib/bags-sync";
import { getWindowChange } from "../../../../../lib/market-change";
import { withStaleRedisCache } from "../../../../../lib/redis-cache";
import { getTokenSupply } from "../../../../../lib/solana-rpc";

const creatorSchema = z.object({
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
});

const leaderboardRankSchema = z.object({
  kind: z.string(),
  rank: z.number(),
  label: z.string(),
  metric: z.string(),
});

const coinNewsSchema = z.object({
  headline: z.string(),
  detail: z.string(),
  href: z.string().nullable(),
  source: z.string(),
  createdAt: z.string(),
});

const coinDetailResponseSchema = z.object({
  success: z.literal(true),
  response: z.object({
    token: z.object({
      name: z.string(),
      symbol: z.string(),
      description: z.string().nullable().optional(),
      image: z.string().nullable().optional(),
      tokenMint: z.string(),
      status: z.string(),
      migrationStatus: z.enum(["migrated", "dbc", "launching"]),
      bagsUrl: z.string(),
      website: z.string().nullable().optional(),
      twitter: z.string().nullable().optional(),
      uri: z.string().nullable().optional(),
      launchSignature: z.string().nullable().optional(),
      dbcPoolKey: z.string().nullable().optional(),
      dbcConfigKey: z.string().nullable().optional(),
    }),
    pool: z
      .object({
        tokenMint: z.string(),
        dbcConfigKey: z.string(),
        dbcPoolKey: z.string(),
        dammV2PoolKey: z.string().nullable().optional(),
      })
      .nullable(),
    creators: z.array(creatorSchema),
    lifetimeFeesLamports: z.string().nullable(),
    quote: z.unknown().nullable(),
    marketSignal: z.object({
      value: z.number(),
      source: z.literal("derived_from_bags_pool_state"),
    }),
    market: z.object({
      price: z.number().nullable().optional(),
      marketCap: z.number().nullable().optional(),
      change1h: z.number().nullable().optional(),
      change6h: z.number().nullable().optional(),
      change24h: z.number().nullable().optional(),
      change7d: z.number().nullable().optional(),
      volume24h: z.number().nullable().optional(),
      liquidityUsd: z.number().nullable().optional(),
      tokenSupply: z.string().nullable().optional(),
      dexPairAddress: z.string().nullable().optional(),
      dexTokenName: z.string().nullable().optional(),
      dexTokenSymbol: z.string().nullable().optional(),
      dexImage: z.string().nullable().optional(),
      marketDataSource: z.string().nullable().optional(),
      lastUpdatedAt: z.string().nullable().optional(),
    }),
    marketHistory: z.array(
      z.object({
        capturedAt: z.string(),
        price: z.number().nullable(),
        marketCap: z.number().nullable(),
        marketSignal: z.number().nullable(),
        priceChange1h: z.number().nullable(),
        priceChange6h: z.number().nullable(),
        priceChange24h: z.number().nullable(),
        volume24h: z.number().nullable(),
        liquidityUsd: z.number().nullable(),
      }),
    ),
    leaderboardRanks: z.array(leaderboardRankSchema),
    news: z.array(coinNewsSchema),
    quoteMint: z.string(),
  }),
});

const coinCacheFreshSeconds = 300;
const coinCacheStaleSeconds = 6 * 60 * 60;

const coinDetailRoute: FastifyPluginAsync = async (fastify) => {
  fastify.withTypeProvider<ZodTypeProvider>().get(
    "/",
    {
      schema: {
        params: z.object({
          identifier: z.string().min(1),
        }),
        response: {
          200: coinDetailResponseSchema,
        },
      },
    },
    async function (request) {
      const { identifier } = request.params;

      try {
        return await withStaleRedisCache(
          fastify,
          {
            freshTtlSeconds: coinCacheFreshSeconds,
            key: `bags:coin:v1:${identifier}`,
            staleTtlSeconds: coinCacheStaleSeconds,
          },
          async () => {
            const cachedToken = await findCachedToken(fastify.prisma, identifier);

            if (cachedToken) {
              const { creators, latestSnapshot, launch } =
                tokenWithDetailsToResponse(cachedToken);
              const [leaderboardRanks, news] = await Promise.all([
                fastify.prisma.marketLeaderboardEntry.findMany({
                  where: {
                    tokenMint: launch.tokenMint,
                  },
                  orderBy: {
                    rank: "asc",
                  },
                  select: {
                    kind: true,
                    rank: true,
                    label: true,
                    metric: true,
                  },
                }),
                fastify.prisma.marketNews.findMany({
                  where: {
                    tokenMint: launch.tokenMint,
                  },
                  orderBy: {
                    createdAt: "desc",
                  },
                  take: 6,
                  select: {
                    headline: true,
                    detail: true,
                    href: true,
                    source: true,
                    createdAt: true,
                  },
                }),
              ]);
              const marketHistory = cachedToken.snapshots
                .slice()
                .reverse()
                .map((snapshot) => ({
                  capturedAt: snapshot.capturedAt.toISOString(),
                  price: snapshot.price ?? null,
                  marketCap: snapshot.marketCap ?? null,
                  marketSignal: snapshot.marketSignal ?? null,
                  priceChange1h: snapshot.priceChange1h ?? null,
                  priceChange6h: snapshot.priceChange6h ?? null,
                  priceChange24h: snapshot.priceChange24h ?? null,
                  volume24h: snapshot.volume24h ?? null,
                  liquidityUsd: snapshot.liquidityUsd ?? null,
                }));
              const change7d = getWindowChange(
                latestSnapshot?.price ?? null,
                null,
                marketHistory,
              );

              return {
                success: true as const,
                response: {
                  token: {
                    name: launch.name,
                    symbol: launch.symbol,
                    description: launch.description,
                    image: launch.image,
                    tokenMint: launch.tokenMint,
                    status: launch.status,
                    migrationStatus: launch.migrationStatus,
                    bagsUrl: launch.bagsUrl,
                    website: launch.website,
                    twitter: launch.twitter,
                    uri: launch.uri,
                    launchSignature: launch.launchSignature,
                    dbcPoolKey: launch.dbcPoolKey,
                    dbcConfigKey: launch.dbcConfigKey,
                  },
                  pool: launch.pool,
                  creators,
                  lifetimeFeesLamports:
                    latestSnapshot?.lifetimeFeesLamports ?? null,
                  quote: latestSnapshot?.rawQuote ?? null,
                  marketSignal: {
                    value:
                      latestSnapshot?.marketSignal ?? getMarketSignal(launch, 0),
                    source: "derived_from_bags_pool_state" as const,
                  },
                  market: {
                    price: latestSnapshot?.price ?? null,
                    marketCap: latestSnapshot?.marketCap ?? null,
                    change1h: latestSnapshot?.priceChange1h ?? null,
                    change6h: latestSnapshot?.priceChange6h ?? null,
                    change24h: latestSnapshot?.priceChange24h ?? null,
                    change7d,
                    volume24h: latestSnapshot?.volume24h ?? null,
                    liquidityUsd: latestSnapshot?.liquidityUsd ?? null,
                    tokenSupply: latestSnapshot?.tokenSupply ?? null,
                    dexPairAddress: latestSnapshot?.dexPairAddress ?? null,
                    dexTokenName: latestSnapshot?.dexTokenName ?? null,
                    dexTokenSymbol: latestSnapshot?.dexTokenSymbol ?? null,
                    dexImage: latestSnapshot?.dexImage ?? null,
                    marketDataSource: latestSnapshot?.marketDataSource ?? null,
                    lastUpdatedAt: latestSnapshot?.capturedAt.toISOString() ?? null,
                  },
                  marketHistory,
                  leaderboardRanks,
                  news: news.map((item) => ({
                    ...item,
                    createdAt: item.createdAt.toISOString(),
                  })),
                  quoteMint: env.priceQuoteMint,
                },
              };
            }

            const [feed, pools] = await Promise.all([
              bagsClient.getTokenLaunchFeed(),
              bagsClient.getPools(false),
            ]);
            const launches = buildLaunchViews(feed, pools);
            const launch = findLaunchByIdentifier(launches, identifier);

            if (!launch) {
              throw fastify.httpErrors.notFound(
                `No Bags token found for "${identifier}"`,
              );
            }

            const [creatorsResult, feesResult, quote, supplyResult, dexResult] =
              await Promise.allSettled([
                bagsClient.getTokenLaunchCreators(launch.tokenMint),
                bagsClient.getTokenLifetimeFees(launch.tokenMint),
                getNullableQuote(launch.tokenMint),
                getTokenSupply(launch.tokenMint),
                getDexScreenerMarketData([launch.tokenMint]),
              ]);
            const creators =
              creatorsResult.status === "fulfilled" ? creatorsResult.value : [];
            const lifetimeFeesLamports =
              feesResult.status === "fulfilled" ? feesResult.value : null;
            const quotePayload = quote.status === "fulfilled" ? quote.value : null;
            const supply =
              supplyResult.status === "fulfilled" ? supplyResult.value : null;
            const dexMarketData =
              dexResult.status === "fulfilled"
                ? dexResult.value.get(launch.tokenMint)
                : undefined;
            const price = dexMarketData?.price ?? calculateQuotePrice(quotePayload);
            const marketCap =
              dexMarketData?.marketCap ??
              (price !== null && supply?.uiAmount
                ? Number((price * supply.uiAmount).toFixed(2))
                : null);
            const marketSignal = getMarketSignal(launch, launches.indexOf(launch));

            await upsertLaunch(fastify.prisma, launch);

            const snapshot = await fastify.prisma.tokenMarketSnapshot.create({
              data: {
                tokenMint: launch.tokenMint,
                quoteMint: env.priceQuoteMint,
                outAmount: quotePayload?.outAmount,
                priceImpactPct: quotePayload?.priceImpactPct,
                lifetimeFeesLamports,
                ...(quotePayload
                  ? { rawQuote: quotePayload as Prisma.InputJsonValue }
                  : {}),
                tokenSupply: supply?.uiAmountString,
                price,
                marketCap,
                priceChange1h: dexMarketData?.priceChange1h,
                priceChange6h: null,
                priceChange24h: dexMarketData?.priceChange24h,
                volume24h: dexMarketData?.volume24h,
                liquidityUsd: dexMarketData?.liquidityUsd,
                dexPairAddress: dexMarketData?.dexPairAddress,
                dexTokenName: dexMarketData?.name,
                dexTokenSymbol: dexMarketData?.symbol,
                dexImage: dexMarketData?.image,
                marketDataSource: dexMarketData
                  ? "dexscreener"
                  : price
                    ? "bags_quote"
                    : undefined,
                marketSignal,
                migrationStatus: launch.migrationStatus,
              },
            });

            if (creators.length > 0) {
              await upsertCachedCreators(
                fastify.prisma,
                launch.tokenMint,
                creators as Array<Record<string, unknown>>,
              );
            }

            return {
              success: true as const,
              response: {
                token: {
                  name: launch.name,
                  symbol: launch.symbol,
                  description: launch.description,
                  image: launch.image,
                  tokenMint: launch.tokenMint,
                  status: launch.status,
                  migrationStatus: launch.migrationStatus,
                  bagsUrl: launch.bagsUrl,
                  website: launch.website,
                  twitter: launch.twitter,
                  uri: launch.uri,
                  launchSignature: launch.launchSignature,
                  dbcPoolKey: launch.dbcPoolKey,
                  dbcConfigKey: launch.dbcConfigKey,
                },
                pool: launch.pool,
                creators,
                lifetimeFeesLamports,
                quote: quotePayload,
                marketSignal: {
                  value: marketSignal,
                  source: "derived_from_bags_pool_state" as const,
                },
                market: {
                  price,
                  marketCap,
                  change1h: dexMarketData?.priceChange1h ?? null,
                  change6h: dexMarketData?.priceChange6h ?? null,
                  change24h: dexMarketData?.priceChange24h ?? null,
                  change7d: null,
                  volume24h: dexMarketData?.volume24h ?? null,
                  liquidityUsd: dexMarketData?.liquidityUsd ?? null,
                  tokenSupply: supply?.uiAmountString ?? null,
                  dexPairAddress: dexMarketData?.dexPairAddress ?? null,
                  dexTokenName: dexMarketData?.name ?? null,
                  dexTokenSymbol: dexMarketData?.symbol ?? null,
                  dexImage: dexMarketData?.image ?? null,
                  marketDataSource: dexMarketData
                    ? "dexscreener"
                    : price
                      ? "bags_quote"
                      : null,
                  lastUpdatedAt: snapshot.capturedAt.toISOString(),
                },
                marketHistory: [
                  {
                    capturedAt: snapshot.capturedAt.toISOString(),
                    price,
                    marketCap,
                    marketSignal,
                    priceChange1h: dexMarketData?.priceChange1h ?? null,
                    priceChange6h: dexMarketData?.priceChange6h ?? null,
                    priceChange24h: dexMarketData?.priceChange24h ?? null,
                    volume24h: dexMarketData?.volume24h ?? null,
                    liquidityUsd: dexMarketData?.liquidityUsd ?? null,
                  },
                ],
                leaderboardRanks: [],
                news: [],
                quoteMint: env.priceQuoteMint,
              },
            };
          },
        );
      } catch (error) {
        if (error instanceof BagsApiError) {
          throw fastify.httpErrors.createError(error.statusCode, error.message);
        }

        throw error;
      }
    },
  );
};

export default coinDetailRoute;
