"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import type { BagsMarketItem } from "@/lib/bags-api";
import { formatMarketCap, formatPercent } from "@/lib/market-format";

const overviewCards = [
  {
    title: "Quote Depth",
    value: "$18,642,880",
    note: "+8.2%",
    sparkline: [8, 19, 24, 23, 27, 25, 30, 29, 36, 39, 57, 57],
  },
  {
    title: "24h Trading Volume",
    value: "$4,271,940",
    note: "+12.4%",
    sparkline: [6, 6, 9, 8, 10, 9, 8, 10, 8, 12, 16, 29, 35],
  },
];

function Sparkline({
  points,
  negative = false,
  width = 148,
  height = 54,
}: {
  points: number[];
  negative?: boolean;
  width?: number;
  height?: number;
}) {
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = Math.max(max - min, 1);
  const path = points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * width;
      const y = height - ((point - min) / span) * height;

      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <svg
      aria-hidden="true"
      className={negative ? "text-red-500" : "text-green-400"}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
    >
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function OverviewMetric({ value }: { value: string }) {
  const normalizedValue = value.trim();

  if (
    normalizedValue === "N/A" ||
    normalizedValue === "N/A%" ||
    normalizedValue === "-"
  ) {
    return <span className="text-slate-500">-</span>;
  }

  if (!normalizedValue.endsWith("%")) {
    return (
      <span className="font-mono text-sm font-medium text-zinc-100">
        {normalizedValue}
      </span>
    );
  }

  const negative = normalizedValue.startsWith("-");

  return (
    <span
      className={
        negative
          ? "font-medium text-red-400"
          : "inline-flex items-center gap-1 font-medium text-green-400"
      }
    >
      {negative ? null : <ArrowUp className="size-3" />}
      {normalizedValue.replace("+", "")}
    </span>
  );
}

function TrendingMetric({
  change24h,
  volume24h,
}: {
  change24h?: number | null;
  volume24h?: number | null;
}) {
  const amount = formatMarketCap(volume24h);

  if (amount === "-") {
    return <span className="text-slate-500">-</span>;
  }

  if (change24h === null || change24h === undefined) {
    return <span className="font-medium text-zinc-100">{amount}</span>;
  }

  const negative = change24h < 0;
  const Icon = negative ? ArrowDown : ArrowUp;

  return (
    <span
      className={
        negative
          ? "inline-flex items-center gap-1 font-medium text-red-400"
          : "inline-flex items-center gap-1 font-medium text-green-400"
      }
    >
      <Icon className="size-3" />
      {amount}
    </span>
  );
}

function GainerMetric({ change24h }: { change24h?: number | null }) {
  const percent = formatPercent(change24h);

  if (percent === "-") {
    return <span className="text-slate-500">-</span>;
  }

  const negative = (change24h ?? 0) < 0;
  const Icon = negative ? ArrowDown : ArrowUp;
  const displayValue = percent.replace(/^[+-]/u, "");

  return (
    <span
      className={
        negative
          ? "inline-flex items-center gap-1 font-medium text-red-400"
          : "inline-flex items-center gap-1 font-medium text-green-400"
      }
    >
      <Icon className="size-3" />
      {displayValue}
    </span>
  );
}

function MarketList({
  metric,
  rows,
  title,
}: {
  metric: "gainer" | "trending";
  rows: BagsMarketItem[];
  title: string;
}) {
  return (
    <div className="rounded-lg border border-[#1f1f1f] bg-[#000000] p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold text-slate-50">{title}</h2>
        <Link
          className="text-xs font-semibold uppercase text-slate-500 hover:text-white"
          href="#leaderboard"
        >
          View more
        </Link>
      </div>
      <div className="space-y-4">
        {rows.length === 0 ? (
          <p className="rounded-md border border-[#1a1a1a] px-3 py-4 text-sm text-slate-500">
            No live rows available.
          </p>
        ) : (
          rows.slice(0, 3).map((row, index) => (
            <Link
              className="flex items-center justify-between gap-4 rounded-md p-1 hover:bg-[#0a0a0a]"
              href={row.href}
              key={`${row.symbol}-${row.tokenMint}`}
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs text-slate-950">
                  {row.rank ?? index + 1}
                </div>
                {row.image ? (
                  <Image
                    alt=""
                    className="size-7 shrink-0 rounded-full object-cover"
                    height={28}
                    src={row.image}
                    unoptimized
                    width={28}
                  />
                ) : (
                  <div className="grid size-7 shrink-0 place-items-center rounded-full bg-[#181818] text-[10px] font-bold text-zinc-100">
                    {(row.symbol || row.name || "??").slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-zinc-100">
                    {row.name}
                  </p>
                  <p className="truncate text-xs text-slate-500">{row.label}</p>
                </div>
              </div>
              <p className="shrink-0 font-mono text-sm text-zinc-100">
                {metric === "trending" ? (
                  <TrendingMetric
                    change24h={row.change24h}
                    volume24h={row.volume24h}
                  />
                ) : (
                  <GainerMetric change24h={row.change24h} />
                )}
              </p>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

function OverviewPanel({
  gainers,
  trending,
}: {
  gainers: BagsMarketItem[];
  trending: BagsMarketItem[];
}) {
  return (
    <div className="grid gap-2 lg:grid-cols-[450px_minmax(0,1fr)_minmax(0,1fr)]">
      <div className="grid gap-2">
        {overviewCards.map((card) => (
          <div
            className="flex h-[92px] items-center justify-between rounded-lg border border-[#1f1f1f] bg-[#000000] px-4"
            key={card.title}
          >
            <div>
              <p className="font-mono text-xl font-bold text-slate-50">
                {card.value}
              </p>
              <p className="mt-2 text-sm text-zinc-300">
                {card.title} <OverviewMetric value={card.note} />
              </p>
            </div>
            <Sparkline points={card.sparkline} width={155} height={58} />
          </div>
        ))}
      </div>

      <MarketList metric="trending" title="Trending" rows={trending} />
      <MarketList metric="gainer" title="Top Gainers" rows={gainers} />
    </div>
  );
}

export function HomepageHighlights({
  gainerRows,
  launchCount,
  trendingRows,
}: {
  gainerRows: BagsMarketItem[];
  launchCount: string;
  trendingRows: BagsMarketItem[];
}) {
  const [showHighlights, setShowHighlights] = useState(true);

  return (
    <section id="bags-overview">
      <div className="flex items-end justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Bags.fm Launches by Pool Activity
          </h1>
          <p className="mt-2 text-sm text-zinc-300">
            The Bags category is tracking {launchCount} launches across live DBC
            pools and migrated DAMM v2 markets.{" "}
            <a
              className="font-semibold text-white underline"
              href="#leaderboard"
            >
              Read more
            </a>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-sm font-semibold text-zinc-100">
          <span>Highlights</span>
          <button
            aria-checked={showHighlights}
            aria-label="Toggle highlights"
            className={
              showHighlights
                ? "flex h-6 w-12 items-center justify-end rounded-md bg-white px-1"
                : "flex h-6 w-12 items-center justify-start rounded-md bg-[#181818] px-1"
            }
            onClick={() => setShowHighlights((value) => !value)}
            role="switch"
            type="button"
          >
            <span
              className={
                showHighlights
                  ? "grid size-5 place-items-center rounded-md bg-[#111111] text-white"
                  : "grid size-5 place-items-center rounded-md bg-[#000000] text-slate-400"
              }
            >
              {showHighlights ? "✓" : ""}
            </span>
          </button>
        </div>
      </div>

      {showHighlights ? (
        <div className="mt-8">
          <OverviewPanel gainers={gainerRows} trending={trendingRows} />
        </div>
      ) : null}
    </section>
  );
}
