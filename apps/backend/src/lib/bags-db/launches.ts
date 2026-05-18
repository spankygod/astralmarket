import type { PrismaClient } from "@prisma/client";

import { env } from "../../config/env";
import { tokenToLaunchView, tokenWithPoolSelect } from "./shared";

export { buildCachedMarketItem, tokenToLaunchView } from "./shared";

export const getCachedLaunches = async (
  prisma: PrismaClient,
  options: {
    excludePoolOnly?: boolean;
    limit?: number;
  } = {},
) => {
  const tokens = await prisma.bagsToken.findMany({
    select: tokenWithPoolSelect,
    where: options.excludePoolOnly
      ? {
          status: {
            not: "POOL_ONLY",
          },
        }
      : undefined,
    orderBy: {
      updatedAt: "desc",
    },
    take: options.limit,
  });

  return tokens.map(tokenToLaunchView);
};

export const getCachedMarketStats = async (prisma: PrismaClient) => {
  const historyStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [launches, activePools, migratedPools, marketTotals, history] =
    await Promise.all([
      prisma.bagsToken.count(),
      prisma.bagsPool.count(),
      prisma.bagsPool.count({
        where: {
          dammV2PoolKey: {
            not: null,
          },
        },
      }),
      prisma.marketLeaderboardEntry.aggregate({
        where: {
          kind: "market",
        },
        _sum: {
          marketCap: true,
          volume24h: true,
        },
      }),
      prisma.marketStatsSnapshot.findMany({
        where: {
          source: "bags",
          capturedAt: {
            gte: historyStart,
          },
        },
        orderBy: {
          capturedAt: "asc",
        },
        select: {
          capturedAt: true,
          totalMarketCap: true,
          totalVolume24h: true,
        },
      }),
    ]);
  const totalMarketCap = marketTotals._sum.marketCap ?? null;
  const totalVolume24h = marketTotals._sum.volume24h ?? null;

  return {
    launches,
    activePools,
    migratedPools,
    liveDbcPools: Math.max(activePools - migratedPools, 0),
    quoteMint: env.priceQuoteMint,
    totalMarketCap,
    totalVolume24h,
    history: [
      ...history.map((snapshot) => ({
        capturedAt: snapshot.capturedAt.toISOString(),
        totalMarketCap: snapshot.totalMarketCap,
        totalVolume24h: snapshot.totalVolume24h,
      })),
      {
        capturedAt: new Date().toISOString(),
        totalMarketCap,
        totalVolume24h,
      },
    ],
  };
};
