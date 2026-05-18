import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";

import { BagsApiError } from "../../../../../lib/bags-client";
import { syncBagsMarket } from "../../../../../lib/bags-sync";

const syncResponseSchema = z.object({
  success: z.literal(true),
  response: z.object({
    syncRunId: z.string(),
    rowsRead: z.number(),
    rowsWritten: z.number(),
    stats: z.object({
      launches: z.number(),
      activePools: z.number(),
      migratedPools: z.number(),
      liveDbcPools: z.number(),
      quoteMint: z.string(),
      totalMarketCap: z.number().nullable(),
      totalVolume24h: z.number().nullable(),
      history: z.array(
        z.object({
          capturedAt: z.string(),
          totalMarketCap: z.number().nullable(),
          totalVolume24h: z.number().nullable(),
        }),
      ),
    }),
    coverage: z.object({
      durationMs: z.number(),
      tokensScanned: z.number(),
      dexScreenerHits: z.number(),
      prices: z.number(),
      marketCaps: z.number(),
      images: z.number(),
      skippedNoMarketData: z.number(),
      derivedPriceChanges: z.number(),
      priceChanges1h: z.number(),
      priceChanges24h: z.number(),
      statsSnapshotsPruned: z.number(),
      snapshotsPruned: z.number(),
    }),
  }),
});

const syncBagsRoute: FastifyPluginAsync = async (fastify) => {
  fastify.withTypeProvider<ZodTypeProvider>().post(
    "/",
    {
      schema: {
        response: {
          200: syncResponseSchema,
        },
      },
    },
    async function (request) {
      const configuredSecret = fastify.config.adminSyncSecret;
      const providedSecret = request.headers["x-admin-sync-secret"];

      try {
        if (
          configuredSecret &&
          (Array.isArray(providedSecret)
            ? providedSecret.at(0)
            : providedSecret) !== configuredSecret
        ) {
          throw fastify.httpErrors.unauthorized(
            "x-admin-sync-secret header is required",
          );
        }

        const result = await syncBagsMarket(fastify.prisma);

        return {
          success: true as const,
          response: result,
        };
      } catch (error) {
        if (error instanceof BagsApiError) {
          throw fastify.httpErrors.createError(error.statusCode, error.message);
        }

        throw error;
      }
    },
  );
};

export default syncBagsRoute;
