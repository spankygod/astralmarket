import type { FastifyInstance } from "fastify";

type CacheOptions = {
  key: string;
  ttlSeconds: number;
};

export const withRedisCache = async <T>(
  fastify: FastifyInstance,
  options: CacheOptions,
  loader: () => Promise<T>,
): Promise<T> => {
  const { redis } = fastify;

  if (!redis) {
    return loader();
  }

  try {
    const cached = await redis.get(options.key);

    if (cached) {
      return JSON.parse(cached) as T;
    }
  } catch (error) {
    fastify.log.warn(
      { cacheKey: options.key, error },
      "Redis cache read failed",
    );
  }

  const value = await loader();

  try {
    await redis.set(
      options.key,
      JSON.stringify(value),
      "EX",
      options.ttlSeconds,
    );
  } catch (error) {
    fastify.log.warn(
      { cacheKey: options.key, error },
      "Redis cache write failed",
    );
  }

  return value;
};
