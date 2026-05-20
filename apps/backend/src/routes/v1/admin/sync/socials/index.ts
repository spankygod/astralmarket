import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";

import {
  BagsApiError,
  withBagsApiBudget,
} from "../../../../../lib/bags-client";
import { syncBagsTokenSocials } from "../../../../../lib/bags-socials";

const syncSocialsResponseSchema = z.object({
  success: z.literal(true),
  response: z.object({
    syncRunId: z.string(),
    rowsRead: z.number(),
    rowsWritten: z.number(),
    rowsScanned: z.number(),
    rowsUpdated: z.number(),
    sources: z.object({
      bags_launch_feed: z.number(),
      dexscreener: z.number(),
    }),
  }),
});

const syncBagsSocialsRoute: FastifyPluginAsync = async (fastify) => {
  fastify.withTypeProvider<ZodTypeProvider>().post(
    "/",
    {
      schema: {
        response: {
          200: syncSocialsResponseSchema,
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

        const result = await withBagsApiBudget("background", () =>
          syncBagsTokenSocials(fastify.prisma),
        );

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

export default syncBagsSocialsRoute;
