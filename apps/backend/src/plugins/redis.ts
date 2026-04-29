import Redis from "ioredis";
import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

const redisPlugin: FastifyPluginAsync = async (fastify) => {
  const { redisUrl } = fastify.config;

  if (!redisUrl) {
    fastify.decorate("redis", null);
    fastify.log.info("Redis is disabled because REDIS_URL is not set");
    return;
  }

  const redis = new Redis(redisUrl, {
    enableOfflineQueue: false,
    lazyConnect: true,
    maxRetriesPerRequest: 1,
  });

  redis.on("error", (error) => {
    fastify.log.warn({ error: error.message }, "Redis client error");
  });

  try {
    await redis.connect();
    fastify.decorate("redis", redis);
    fastify.log.info("Redis connected");
  } catch (error) {
    fastify.decorate("redis", null);
    fastify.log.warn(
      { error: error instanceof Error ? error.message : String(error) },
      "Redis connection failed; continuing without Redis cache",
    );
    redis.disconnect();
    return;
  }

  fastify.addHook("onClose", async () => {
    redis.disconnect();
  });
};

export default fp(redisPlugin, {
  name: "redis",
  dependencies: ["app-config"],
});

declare module "fastify" {
  interface FastifyInstance {
    redis: Redis | null;
  }
}
