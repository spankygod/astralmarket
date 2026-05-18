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
  const [launches, activePools, migratedPools, marketTotals] =
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
    ]);

  return {
    launches,
    activePools,
    migratedPools,
    liveDbcPools: Math.max(activePools - migratedPools, 0),
    quoteMint: env.priceQuoteMint,
    totalMarketCap: marketTotals._sum.marketCap ?? null,
    totalVolume24h: marketTotals._sum.volume24h ?? null,
  };
};
