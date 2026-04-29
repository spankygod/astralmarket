import type { PrismaClient } from "@prisma/client";

export const getCachedMarketNews = async (
  prisma: PrismaClient,
  options: {
    bagsSignalLimit: number;
    cryptoNewsLimit: number;
  },
) => {
  const [cryptoNews, bagsSignals] = await Promise.all([
    prisma.marketNews.findMany({
      where: {
        source: "fmp_crypto_news",
      },
      orderBy: {
        createdAt: "desc",
      },
      take: options.cryptoNewsLimit,
    }),
    prisma.marketNews.findMany({
      where: {
        source: {
          not: "fmp_crypto_news",
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: options.bagsSignalLimit,
    }),
  ]);

  return {
    bagsSignals,
    cryptoNews,
  };
};
