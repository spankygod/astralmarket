import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

import { withBagsApiBudget } from "../lib/bags-client";
import { syncBagsMarket } from "../lib/bags-sync";

const bagsSyncSchedulerPlugin: FastifyPluginAsync = async (fastify) => {
  const { bagsSyncEnabled, bagsSyncIntervalMinutes, bagsSyncOnStart, isTest } =
    fastify.config;

  if (!bagsSyncEnabled || isTest) {
    fastify.log.info("Bags sync scheduler is disabled");
    return;
  }

  const intervalMs = bagsSyncIntervalMinutes * 60 * 1000;
  let isRunning = false;

  const runScheduledSync = async (trigger: "interval" | "startup") => {
    if (isRunning) {
      fastify.log.warn(
        { trigger },
        "Skipping scheduled Bags sync because a previous sync is still running",
      );
      return;
    }

    isRunning = true;

    try {
      fastify.log.info(
        { trigger, intervalMinutes: bagsSyncIntervalMinutes },
        "Starting scheduled Bags sync",
      );
      const result = await withBagsApiBudget("background", () =>
        syncBagsMarket(fastify.prisma),
      );
      fastify.log.info(
        {
          trigger,
          syncRunId: result.syncRunId,
          coverage: result.coverage,
        },
        "Scheduled Bags sync completed",
      );
    } catch (error) {
      fastify.log.error(
        {
          trigger,
          error: error instanceof Error ? error.message : String(error),
        },
        "Scheduled Bags sync failed",
      );
    } finally {
      isRunning = false;
    }
  };

  const timer = setInterval(() => {
    void runScheduledSync("interval");
  }, intervalMs);

  if (typeof timer.unref === "function") {
    timer.unref();
  }

  fastify.addHook("onClose", async () => {
    clearInterval(timer);
  });

  fastify.log.info(
    { intervalMinutes: bagsSyncIntervalMinutes, bagsSyncOnStart },
    "Bags sync scheduler started",
  );

  if (bagsSyncOnStart) {
    setImmediate(() => {
      void runScheduledSync("startup");
    });
  }
};

export default fp(bagsSyncSchedulerPlugin, {
  name: "bags-sync-scheduler",
  dependencies: ["app-config", "prisma"],
});
