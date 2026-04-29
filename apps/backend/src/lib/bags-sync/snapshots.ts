import { Prisma, type PrismaClient } from "@prisma/client";

import { env } from "../../config/env";

const priceChangeWindows = [
  { key: "h1", ageMs: 60 * 60 * 1000 },
  { key: "h24", ageMs: 24 * 60 * 60 * 1000 },
] as const;
const snapshotRetentionDeleteBatchSize = 5000;

type PriceChangeWindow = (typeof priceChangeWindows)[number]["key"];
export type HistoricalPriceReferences = Map<
  string,
  Partial<Record<PriceChangeWindow, number>>
>;

export const derivePriceChange = (
  currentPrice: number | null,
  referencePrice?: number,
) => {
  if (
    currentPrice === null ||
    referencePrice === undefined ||
    !Number.isFinite(currentPrice) ||
    !Number.isFinite(referencePrice) ||
    referencePrice <= 0
  ) {
    return null;
  }

  return Number(
    (((currentPrice - referencePrice) / referencePrice) * 100).toFixed(2),
  );
};

export const getHistoricalPriceReferences = async (
  prisma: PrismaClient,
  tokenMints: string[],
  capturedAt: Date,
): Promise<HistoricalPriceReferences> => {
  const references: HistoricalPriceReferences = new Map();

  if (tokenMints.length === 0) {
    return references;
  }

  const referenceRows = await Promise.all(
    priceChangeWindows.map(async (window) => {
      const cutoff = new Date(capturedAt.getTime() - window.ageMs);
      const oldestReferenceAt = new Date(
        cutoff.getTime() - 6 * 60 * 60 * 1000,
      );

      return prisma.$queryRaw<
        Array<{
          tokenMint: string;
          price: number;
          windowKey: PriceChangeWindow;
        }>
      >(Prisma.sql`
        SELECT DISTINCT ON ("tokenMint")
          "tokenMint",
          "price",
          ${window.key}::text AS "windowKey"
        FROM "TokenMarketSnapshot"
        WHERE "tokenMint" IN (${Prisma.join(tokenMints)})
          AND "price" IS NOT NULL
          AND "capturedAt" >= ${oldestReferenceAt}
          AND "capturedAt" <= ${cutoff}
        ORDER BY "tokenMint", "capturedAt" DESC
      `);
    }),
  );

  for (const row of referenceRows.flat()) {
    const tokenReferences = references.get(row.tokenMint) ?? {};
    tokenReferences[row.windowKey] = row.price;
    references.set(row.tokenMint, tokenReferences);
  }

  return references;
};

export const pruneExpiredMarketSnapshots = async (
  prisma: PrismaClient,
  capturedAt: Date,
) => {
  const retentionMs = env.marketSnapshotRetentionDays * 24 * 60 * 60 * 1000;
  const cutoff = new Date(capturedAt.getTime() - retentionMs);
  let totalDeleted = 0;

  while (true) {
    const deleted = await prisma.$executeRaw(Prisma.sql`
      WITH expired AS (
        SELECT "id"
        FROM "TokenMarketSnapshot"
        WHERE "capturedAt" < ${cutoff}
        ORDER BY "capturedAt" ASC
        LIMIT ${snapshotRetentionDeleteBatchSize}
      )
      DELETE FROM "TokenMarketSnapshot"
      WHERE "id" IN (SELECT "id" FROM expired)
    `);

    totalDeleted += deleted;

    if (deleted < snapshotRetentionDeleteBatchSize) {
      break;
    }
  }

  return totalDeleted;
};
