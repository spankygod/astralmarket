import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";

import { env } from "../../../../config/env";
import { BagsApiError, bagsClient } from "../../../../lib/bags-client";
import {
  getCachedLaunches,
  getCachedMarketStats,
} from "../../../../lib/bags-db";
import { withRedisCache } from "../../../../lib/redis-cache";

const poolSchema = z.object({
  tokenMint: z.string(),
  dbcConfigKey: z.string(),
  dbcPoolKey: z.string(),
  dammV2PoolKey: z.string().nullable().optional(),
});

const launchSchema = z.object({
  name: z.string(),
  symbol: z.string(),
  description: z.string().nullable().optional(),
  image: z.string().nullable().optional(),
  tokenMint: z.string(),
  status: z.string(),
  twitter: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  launchSignature: z.string().nullable().optional(),
  uri: z.string().nullable().optional(),
  dbcPoolKey: z.string().nullable().optional(),
  dbcConfigKey: z.string().nullable().optional(),
  pool: poolSchema.nullable(),
  migrationStatus: z.enum(["migrated", "dbc", "launching"]),
});

const bagsCategoryResponseSchema = z.object({
  success: z.literal(true),
  response: z.object({
    category: z.object({
      id: z.literal("bags.fm"),
      name: z.literal("Bags.fm"),
      source: z.literal("bags"),
      description: z.string(),
    }),
    stats: z.object({
      launches: z.number(),
      activePools: z.number(),
      migratedPools: z.number(),
      liveDbcPools: z.number(),
      quoteMint: z.string(),
    }),
    launches: z.array(launchSchema),
  }),
});

const getMigrationStatus = (
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

const bagsCategoryRoute: FastifyPluginAsync = async (fastify) => {
  fastify.withTypeProvider<ZodTypeProvider>().get(
    "/",
    {
      schema: {
        querystring: z.object({
          limit: z.coerce.number().int().min(1).max(100).default(25),
          onlyMigrated: z.coerce.boolean().default(false),
        }),
        response: {
          200: bagsCategoryResponseSchema,
        },
      },
    },
    async function (request) {
      const { limit, onlyMigrated } = request.query;

      try {
        return await withRedisCache(
          fastify,
          {
            key: `bags:category:v1:limit:${limit}:onlyMigrated:${onlyMigrated}`,
            ttlSeconds: 120,
          },
          async () => {
            const cachedLaunches = await getCachedLaunches(fastify.prisma, {
              excludePoolOnly: true,
              limit: 100,
            });

            if (cachedLaunches.length > 0) {
              const launches = cachedLaunches
                .filter((launch) =>
                  onlyMigrated ? launch.migrationStatus === "migrated" : true,
                )
                .slice(0, limit)
                .map((launch) => ({
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
                  pool: launch.pool,
                  migrationStatus: launch.migrationStatus,
                }));

              return {
                success: true as const,
                response: {
                  category: {
                    id: "bags.fm" as const,
                    name: "Bags.fm" as const,
                    source: "bags" as const,
                    description:
                      "Bags-native token launches, DBC pools, and migrated DAMM v2 markets.",
                  },
                  stats: await getCachedMarketStats(fastify.prisma),
                  launches,
                },
              };
            }

            const [feed, pools] = await Promise.all([
              bagsClient.getTokenLaunchFeed(),
              bagsClient.getPools(onlyMigrated),
            ]);
            const poolsByMint = new Map(
              pools.map((pool) => [pool.tokenMint, pool]),
            );
            const launches = feed
              .map((launch) => {
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
                };
              })
              .filter((launch) =>
                onlyMigrated ? launch.migrationStatus === "migrated" : true,
              )
              .slice(0, limit);

            const migratedPools = pools.filter(
              (pool) => pool.dammV2PoolKey,
            ).length;

            return {
              success: true as const,
              response: {
                category: {
                  id: "bags.fm" as const,
                  name: "Bags.fm" as const,
                  source: "bags" as const,
                  description:
                    "Bags-native token launches, DBC pools, and migrated DAMM v2 markets.",
                },
                stats: {
                  launches: feed.length,
                  activePools: pools.length,
                  migratedPools,
                  liveDbcPools: Math.max(pools.length - migratedPools, 0),
                  quoteMint: env.priceQuoteMint,
                },
                launches,
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

export default bagsCategoryRoute;
