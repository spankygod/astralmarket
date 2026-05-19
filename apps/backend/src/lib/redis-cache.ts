import type { FastifyInstance } from "fastify";

type CacheOptions = {
  key: string;
  ttlSeconds: number;
};

type StaleCacheOptions = {
  freshTtlSeconds: number;
  key: string;
  lockTtlSeconds?: number;
  staleTtlSeconds: number;
};

type CacheEnvelope<T> = {
  cachedAt: number;
  freshUntil: number;
  staleUntil: number;
  value: T;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isCacheEnvelope = <T>(value: unknown): value is CacheEnvelope<T> =>
  isRecord(value) &&
  typeof value["cachedAt"] === "number" &&
  typeof value["freshUntil"] === "number" &&
  typeof value["staleUntil"] === "number" &&
  "value" in value;

const buildCacheEnvelope = <T>(
  value: T,
  options: StaleCacheOptions,
): CacheEnvelope<T> => {
  const cachedAt = Date.now();

  return {
    cachedAt,
    freshUntil: cachedAt + options.freshTtlSeconds * 1000,
    staleUntil: cachedAt + options.staleTtlSeconds * 1000,
    value,
  };
};

const getRedisExpirySeconds = (options: StaleCacheOptions) =>
  Math.max(options.freshTtlSeconds, options.staleTtlSeconds);

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

export const withStaleRedisCache = async <T>(
  fastify: FastifyInstance,
  options: StaleCacheOptions,
  loader: () => Promise<T>,
): Promise<T> => {
  const { redis } = fastify;

  if (!redis) {
    return loader();
  }

  const refreshCache = async () => {
    const lockKey = `${options.key}:refresh-lock`;
    const lockTtlSeconds = options.lockTtlSeconds ?? 300;
    const lock = await redis.set(lockKey, "1", "EX", lockTtlSeconds, "NX");

    if (lock !== "OK") {
      return;
    }

    try {
      const value = await loader();
      const envelope = buildCacheEnvelope(value, options);

      await redis.set(
        options.key,
        JSON.stringify(envelope),
        "EX",
        getRedisExpirySeconds(options),
      );
    } finally {
      await redis.del(lockKey).catch((error) => {
        fastify.log.warn(
          { cacheKey: options.key, error },
          "Redis stale cache lock delete failed",
        );
      });
    }
  };

  try {
    const cached = await redis.get(options.key);

    if (cached) {
      const parsed = JSON.parse(cached) as unknown;

      if (isCacheEnvelope<T>(parsed)) {
        const now = Date.now();

        if (now <= parsed.freshUntil) {
          return parsed.value;
        }

        if (now <= parsed.staleUntil) {
          void refreshCache().catch((error) => {
            fastify.log.warn(
              { cacheKey: options.key, error },
              "Redis stale cache background refresh failed",
            );
          });

          return parsed.value;
        }
      } else {
        void refreshCache().catch((error) => {
          fastify.log.warn(
            { cacheKey: options.key, error },
            "Redis legacy cache background refresh failed",
          );
        });

        return parsed as T;
      }
    }
  } catch (error) {
    fastify.log.warn(
      { cacheKey: options.key, error },
      "Redis stale cache read failed",
    );
  }

  const value = await loader();

  try {
    const envelope = buildCacheEnvelope(value, options);

    await redis.set(
      options.key,
      JSON.stringify(envelope),
      "EX",
      getRedisExpirySeconds(options),
    );
  } catch (error) {
    fastify.log.warn(
      { cacheKey: options.key, error },
      "Redis stale cache write failed",
    );
  }

  return value;
};
