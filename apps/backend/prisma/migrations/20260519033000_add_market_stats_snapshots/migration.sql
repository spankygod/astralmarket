CREATE TABLE "MarketStatsSnapshot" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'bags',
    "coins" INTEGER NOT NULL,
    "pools" INTEGER NOT NULL,
    "totalMarketCap" DOUBLE PRECISION,
    "totalVolume24h" DOUBLE PRECISION,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketStatsSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MarketStatsSnapshot_source_capturedAt_idx" ON "MarketStatsSnapshot"("source", "capturedAt");
CREATE INDEX "MarketStatsSnapshot_capturedAt_idx" ON "MarketStatsSnapshot"("capturedAt");
