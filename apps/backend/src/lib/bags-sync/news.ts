import type { PrismaClient } from "@prisma/client";

import { env } from "../../config/env";
import { FmpNewsApiError, getLatestCryptoNews } from "../fmp-news-client";
import { chunk } from "./shared";

const fmpNewsSource = "fmp_crypto_news";

const parseFmpPublishedDate = (value: string) => {
  const date = new Date(`${value.replace(" ", "T")}Z`);

  return Number.isNaN(date.getTime()) ? new Date() : date;
};

const getUtcDayStart = (date: Date) =>
  new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );

const reserveFmpNewsRequest = async (prisma: PrismaClient) => {
  if (!env.newsApiKey) {
    return null;
  }

  const startedAt = new Date();
  const requestsToday = await prisma.syncRun.count({
    where: {
      source: fmpNewsSource,
      startedAt: {
        gte: getUtcDayStart(startedAt),
      },
      status: {
        not: "skipped",
      },
    },
  });

  if (requestsToday >= env.fmpNewsDailyRequestLimit) {
    await prisma.syncRun.create({
      data: {
        source: fmpNewsSource,
        status: "skipped",
        startedAt,
        finishedAt: new Date(),
        error: `Daily FMP news request limit reached (${env.fmpNewsDailyRequestLimit})`,
      },
    });

    return null;
  }

  return prisma.syncRun.create({
    data: {
      source: fmpNewsSource,
      status: "running",
      startedAt,
      rowsRead: 1,
    },
  });
};

export const syncCryptoNews = async (prisma: PrismaClient) => {
  const fmpRequestRun = await reserveFmpNewsRequest(prisma);

  if (!fmpRequestRun) {
    return 0;
  }

  try {
    const news = await getLatestCryptoNews({ limit: 50 });

    for (const newsChunk of chunk(news, 25)) {
      await Promise.all(
        newsChunk.map((item) => {
          const publishedAt = parseFmpPublishedDate(item.publishedDate);
          const sourceLabel = item.publisher ?? item.site ?? "FMP Crypto News";
          const detail = item.text?.trim()
            ? `${sourceLabel}: ${item.text.trim()}`
            : `Latest crypto market news from ${sourceLabel}.`;

          return prisma.marketNews.upsert({
            where: {
              sourceKey: `${fmpNewsSource}:${item.url}`,
            },
            create: {
              sourceKey: `${fmpNewsSource}:${item.url}`,
              headline: item.title,
              detail,
              source: fmpNewsSource,
              href: item.url,
              createdAt: publishedAt,
            },
            update: {
              headline: item.title,
              detail,
              href: item.url,
            },
          });
        }),
      );
    }

    await prisma.syncRun.update({
      where: {
        id: fmpRequestRun.id,
      },
      data: {
        status: "success",
        finishedAt: new Date(),
        rowsWritten: news.length,
      },
    });

    return news.length;
  } catch (error) {
    await prisma.syncRun.update({
      where: {
        id: fmpRequestRun.id,
      },
      data: {
        status: "error",
        finishedAt: new Date(),
        error: error instanceof Error ? error.message : "FMP news sync failed",
      },
    });

    if (error instanceof FmpNewsApiError) {
      return 0;
    }

    throw error;
  }
};
