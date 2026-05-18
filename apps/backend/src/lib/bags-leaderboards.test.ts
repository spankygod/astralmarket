import assert from "node:assert/strict";
import test from "node:test";

import {
  rankMarketCapLeaderboard,
  rankTopGainers,
  rankTrendingTokens,
} from "./bags-leaderboards";

const oldEnoughCreatedAt = new Date(Date.now() - 48 * 60 * 60 * 1000);
const freshCreatedAt = new Date(Date.now() - 60 * 60 * 1000);

const entry = (
  id: string,
  marketCap: number | null,
  priceChange24h: number | null,
  trendScore: number,
  options: {
    createdAt?: Date;
    liquidityUsd?: number | null;
  } = {},
) => ({
  createdAt: options.createdAt ?? oldEnoughCreatedAt,
  id,
  latestSignal: trendScore,
  latestSnapshot: {
    liquidityUsd: options.liquidityUsd ?? 50_000,
    marketCap,
    priceChange24h,
  },
  trendScore,
});

test("market cap leaderboard ranks real market caps before null values", () => {
  const ranked = rankMarketCapLeaderboard([
    entry("no-market-cap", null, 500, 99),
    entry("small-cap", 100, 1, 1),
    entry("large-cap", 1000, -20, 1),
  ]);

  assert.deepEqual(
    ranked.map((item) => item.id),
    ["large-cap", "small-cap", "no-market-cap"],
  );
});

test("market cap leaderboard uses 24h change as the first tie breaker", () => {
  const ranked = rankMarketCapLeaderboard([
    entry("flat", 1000, 0, 100),
    entry("winner", 1000, 25, 1),
  ]);

  assert.deepEqual(
    ranked.map((item) => item.id),
    ["winner", "flat"],
  );
});

test("top gainers only includes rows with real 24h change", () => {
  const ranked = rankTopGainers([
    entry("missing-change", 1000, null, 100),
    entry("positive", 100, 12, 1),
    entry("negative", 200, -3, 99),
  ]);

  assert.deepEqual(
    ranked.map((item) => item.id),
    ["positive", "negative"],
  );
});

test("top gainers excludes fresh launches from discovery ranking", () => {
  const ranked = rankTopGainers([
    entry("fresh-pump", 1_000_000, 900, 100, {
      createdAt: freshCreatedAt,
      liquidityUsd: 100_000,
    }),
    entry("seasoned-gainer", 100_000, 25, 1),
  ]);

  assert.deepEqual(
    ranked.map((item) => item.id),
    ["seasoned-gainer"],
  );
});

test("top gainers excludes low-liquidity launches", () => {
  const ranked = rankTopGainers([
    entry("thin-liquidity", 1_000_000, 900, 100, {
      liquidityUsd: 1_000,
    }),
    entry("real-depth", 100_000, 25, 1),
  ]);

  assert.deepEqual(
    ranked.map((item) => item.id),
    ["real-depth"],
  );
});

test("trending excludes launches without enough age and depth", () => {
  const ranked = rankTrendingTokens([
    entry("fresh-trend", 1_000_000, 900, 100, {
      createdAt: freshCreatedAt,
      liquidityUsd: 100_000,
    }),
    entry("thin-trend", 1_000_000, 900, 99, {
      liquidityUsd: 1_000,
    }),
    entry("seasoned-trend", 100_000, 25, 1),
  ]);

  assert.deepEqual(
    ranked.map((item) => item.id),
    ["seasoned-trend"],
  );
});

test("market cap leaderboard demotes suspicious market depth", () => {
  const ranked = rankMarketCapLeaderboard([
    entry("thin-high-cap", 1_000_000, 900, 100, {
      liquidityUsd: 1_000,
    }),
    entry("real-market", 100_000, 25, 1),
  ]);

  assert.deepEqual(
    ranked.map((item) => item.id),
    ["real-market", "thin-high-cap"],
  );
});
