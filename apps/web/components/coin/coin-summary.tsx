import {
  Bell,
  ExternalLink,
  Globe,
  Link as LinkIcon,
  Star,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import type { BagsCoinDetailData } from "@/lib/bags-api";
import {
  coinActionClassName,
  formatLamports,
  formatMarketSource,
  formatTokenSupply,
  getCategories,
  getPoolLabel,
  getSafeExternalUrl,
} from "@/lib/coin-detail-mappers";
import { formatMarketCap, formatPrice } from "@/lib/market-format";

import { CoinChangeText } from "./coin-change-text";
import { StatRow } from "./stat-row";

const getPriceStats = (coin: BagsCoinDetailData) => {
  const prices = coin.marketHistory
    .map((snapshot) => snapshot.price)
    .filter(
      (price): price is number => price !== null && Number.isFinite(price),
    );
  const latestPrice = coin.market.price ?? prices.at(-1) ?? null;

  if (prices.length === 0 || latestPrice === null) {
    return {
      high: null,
      low: null,
      position: 0,
    };
  }

  const low = Math.min(...prices);
  const high = Math.max(...prices);
  const range = Math.max(high - low, Number.EPSILON);

  return {
    high,
    low,
    position: Math.min(Math.max(((latestPrice - low) / range) * 100, 0), 100),
  };
};

export function CoinSummary({ coin }: { coin: BagsCoinDetailData }) {
  const categories = getCategories(coin);
  const bagsUrl = getSafeExternalUrl(coin.token.bagsUrl);
  const metadataUrl = getSafeExternalUrl(coin.token.uri);
  const websiteUrl = getSafeExternalUrl(coin.token.website);
  const priceStats = getPriceStats(coin);
  const ticker = coin.token.symbol || coin.token.name || "Token";

  return (
    <aside className="min-w-0 border-r border-[#1a1a1a] px-6 py-8 lg:px-7">
      <div className="flex items-center gap-3 text-sm text-slate-400">
        <Link className="hover:text-white" href="/">
          Cryptocurrencies
        </Link>
        <span>/</span>
        <span className="truncate text-slate-300">{coin.token.name}</span>
      </div>

      <div className="mt-8 flex min-w-0 items-center gap-3">
        {coin.token.image ? (
          <Image
            alt=""
            className="size-9 rounded-full object-cover"
            height={36}
            src={coin.token.image}
            unoptimized
            width={36}
          />
        ) : (
          <span className="grid size-9 place-items-center rounded-full bg-white text-sm font-bold text-black">
            {(coin.token.symbol || coin.token.name || "??")
              .slice(0, 2)
              .toUpperCase()}
          </span>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold text-white">
            {coin.token.name}
          </h1>
          <p className="text-sm text-slate-400">
            {coin.token.symbol || "No symbol"} Price
          </p>
        </div>
        <Badge className="ml-auto border-[#2a2a2a] bg-[#111827] text-slate-300">
          # Bags
        </Badge>
      </div>

      <div className="mt-5">
        <div className="flex flex-wrap items-end gap-2">
          <p className="text-4xl font-bold text-white">
            {formatPrice(coin.market.price)}
          </p>
          <CoinChangeText value={coin.market.change24h} />
        </div>
        <p className="mt-2 font-mono text-xs text-slate-500 break-all">
          {coin.token.tokenMint}
        </p>
      </div>

      <div className="mt-7">
        <div className="flex items-center justify-between gap-3 font-mono text-xs font-semibold text-zinc-100">
          <span>{formatPrice(priceStats.low)}</span>
          <span className="font-sans text-slate-300">Cached Range</span>
          <span>{formatPrice(priceStats.high)}</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#1f2937]">
          <div
            className="h-full rounded-full bg-green-400"
            style={{
              width: `${priceStats.position}%`,
            }}
          />
        </div>
      </div>

      <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-[#1f2937]">
        <div
          className={
            coin.token.migrationStatus === "migrated"
              ? "h-full w-full bg-green-400"
              : coin.token.migrationStatus === "dbc"
                ? "h-full w-2/3 bg-yellow-300"
                : "h-full w-1/3 bg-zinc-400"
          }
        />
      </div>

      <div className="mt-5 flex gap-2">
        {bagsUrl ? (
          <a
            className={`${coinActionClassName} flex-1 border border-[#2a2a2a] bg-[#111111] text-white hover:bg-[#1f1f1f]`}
            href={bagsUrl}
            rel="noreferrer"
            target="_blank"
          >
            Bags
            <ExternalLink className="size-4" />
          </a>
        ) : null}
        <button
          className={`${coinActionClassName} flex-1 border border-[#334155] bg-transparent text-slate-200 hover:bg-[#111827] disabled:cursor-not-allowed disabled:opacity-60`}
          disabled
          title="Portfolio tracking is not available yet"
          type="button"
        >
          <Star className="size-4" />
          Portfolio
        </button>
        <button
          className={`${coinActionClassName} size-9 border border-[#334155] bg-transparent p-0 text-slate-200 hover:bg-[#111827] disabled:cursor-not-allowed disabled:opacity-60`}
          disabled
          title="Alerts are not available yet"
          type="button"
        >
          <Bell className="size-4" />
        </button>
        {websiteUrl ? (
          <a
            className={`${coinActionClassName} border border-[#2a2a2a] bg-[#111111] text-zinc-100 hover:bg-[#181818]`}
            href={websiteUrl}
            rel="noreferrer"
            target="_blank"
          >
            <Globe className="size-4" />
          </a>
        ) : null}
      </div>

      <section className="mt-7">
        <StatRow
          label="Market Cap"
          value={formatMarketCap(coin.market.marketCap)}
        />
        <StatRow
          label="24h Volume"
          value={formatMarketCap(coin.market.volume24h)}
        />
        <StatRow
          label="Liquidity"
          value={formatMarketCap(coin.market.liquidityUsd)}
        />
        <StatRow
          label="1h"
          value={<CoinChangeText value={coin.market.change1h} />}
        />
        <StatRow
          label="6h"
          value={<CoinChangeText value={coin.market.change6h} />}
        />
        <StatRow
          label="24h"
          value={<CoinChangeText value={coin.market.change24h} />}
        />
        <StatRow
          label="Supply"
          value={formatTokenSupply(coin.market.tokenSupply)}
        />
        <StatRow
          label="Lifetime Fees"
          value={formatLamports(coin.lifetimeFeesLamports)}
        />
        <StatRow
          label="Pool State"
          value={getPoolLabel(coin.token.migrationStatus)}
        />
        <StatRow
          label="Market Source"
          value={formatMarketSource(coin.market.marketDataSource)}
        />
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-bold text-white">{ticker} Converter</h2>
        <div className="mt-4 overflow-hidden rounded-lg border border-[#334155] bg-[#050505]">
          <div className="flex h-14 items-center justify-between border-b border-[#334155] px-3">
            <span className="font-mono text-sm text-zinc-100">1</span>
            <span className="text-sm font-semibold text-slate-400">
              {ticker}
            </span>
          </div>
          <div className="flex h-14 items-center justify-between px-3">
            <span className="font-mono text-sm text-zinc-100">
              {coin.market.price === null || coin.market.price === undefined
                ? "-"
                : coin.market.price.toLocaleString(undefined, {
                    maximumFractionDigits: 8,
                  })}
            </span>
            <span className="text-sm font-semibold text-slate-400">USD</span>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-bold text-white">
          {ticker} Historical Price
        </h2>
        <div className="mt-4">
          <StatRow
            label="Cached Range"
            value={`${formatPrice(priceStats.low)} - ${formatPrice(priceStats.high)}`}
          />
          <StatRow label="Cached High" value={formatPrice(priceStats.high)} />
          <StatRow label="Cached Low" value={formatPrice(priceStats.low)} />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-bold text-white">Info</h2>
        <div className="mt-4 space-y-4 text-sm">
          <div>
            <p className="mb-2 text-slate-400">Website</p>
            <div className="flex flex-wrap gap-2">
              {websiteUrl ? (
                <a
                  className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#1f2937] px-3 text-xs font-semibold text-zinc-100 hover:bg-[#273449]"
                  href={websiteUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  Website
                  <ExternalLink className="size-3" />
                </a>
              ) : null}
              {metadataUrl ? (
                <a
                  className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#1f2937] px-3 text-xs font-semibold text-zinc-100 hover:bg-[#273449]"
                  href={metadataUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  Metadata
                  <LinkIcon className="size-3" />
                </a>
              ) : null}
            </div>
          </div>

          <div>
            <p className="mb-2 text-slate-400">Categories</p>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Badge
                  className="rounded-md border-[#2a2a2a] bg-[#111827] text-xs text-slate-200"
                  key={category}
                  variant="outline"
                >
                  {category}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </section>
    </aside>
  );
}
