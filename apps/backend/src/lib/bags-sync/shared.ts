import { Prisma } from "@prisma/client";

import { bagsClient } from "../bags-client";
import { buildMarketStats } from "../bags-market";

export const toJson = (value: unknown) => value as Prisma.InputJsonValue;

export const chunk = <T>(items: T[], size: number) => {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
};

export type SnapshotRow = Prisma.TokenMarketSnapshotCreateManyInput & {
  tokenMint: string;
  marketSignal: number | null;
  price: number | null;
  marketCap: number | null;
  volume24h: number | null;
  priceChange1h: number | null;
  priceChange24h: number | null;
};

export type LifetimeFeesTopToken = Awaited<
  ReturnType<typeof bagsClient.getLifetimeFeesTopTokens>
>[number];

export type BagsSyncResult = {
  syncRunId: string;
  rowsRead: number;
  rowsWritten: number;
  stats: ReturnType<typeof buildMarketStats>;
  coverage: {
    durationMs: number;
    tokensScanned: number;
    dexScreenerHits: number;
    prices: number;
    marketCaps: number;
    images: number;
    skippedNoMarketData: number;
    derivedPriceChanges: number;
    priceChanges1h: number;
    priceChanges24h: number;
    snapshotsPruned: number;
  };
};
