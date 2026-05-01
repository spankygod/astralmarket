import {
  ChevronDown,
  ChartCandlestick,
  EllipsisVertical,
  Layers3,
  Shield,
  Trophy,
} from "lucide-react";

import type { BagsCoinDetailData } from "@/lib/bags-api";
import {
  buildChartSeries,
  coinActionClassName,
  formatMarketSource,
  formatSnapshotDate,
  formatTokenSupply,
  shortenKey,
} from "@/lib/coin-detail-mappers";
import { formatMarketCap, formatPercent } from "@/lib/market-format";

import { StatRow } from "./stat-row";

const rankLabels: Record<string, string> = {
  market: "Market",
  top_earners: "Top earner",
  top_gainers: "Top gainer",
  trending: "Trending",
};

const formatRankKind = (kind: string) =>
  rankLabels[kind] ??
  kind.replace(/_/gu, " ").replace(/\b\w/gu, (letter) => letter.toUpperCase());

const getDexPairUrl = (pairAddress?: string | null) =>
  pairAddress ? `https://dexscreener.com/solana/${pairAddress}` : null;

const chartActionClassName = `${coinActionClassName} border border-[#2a2a2a] bg-[#111111] text-zinc-100 hover:bg-[#1f1f1f]`;
const chartIconActionClassName = `${chartActionClassName} size-9 p-0`;

export function MarketChart({ coin }: { coin: BagsCoinDetailData }) {
  const series = buildChartSeries(coin);
  const points = series.points.map((point) => point.value);
  const width = 980;
  const height = 565;
  const plotTop = 34;
  const plotHeight = 420;
  const plotBottom = plotTop + plotHeight;
  const axisGutter = 72;
  const plotLeft = 0;
  const plotRight = width - axisGutter;
  const plotWidth = plotRight - plotLeft;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = Math.max(max - min, Number.EPSILON);
  const stroke = series.negative ? "#ff3b30" : "#22c55e";
  const coordinates = points.map((point, index) => {
    const x = plotLeft + (index / Math.max(points.length - 1, 1)) * plotWidth;
    const y = plotBottom - ((point - min) / span) * plotHeight;

    return [x, y] as const;
  });
  const barBottom = 535;
  const barMaxHeight = 58;
  const volumeBars = points.map((point, index) => {
    const normalized = (point - min) / span;
    const height = 12 + normalized * barMaxHeight * 0.7 + (index % 5) * 1.5;
    const barWidth = Math.max(plotWidth / Math.max(points.length, 1) - 2, 1.5);
    const x =
      plotLeft +
      (index / Math.max(points.length - 1, 1)) * (plotWidth - barWidth);

    return {
      height: Math.min(height, barMaxHeight),
      width: barWidth,
      x,
    };
  });
  const linePath = coordinates
    .map(
      ([x, y], index) =>
        `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`,
    )
    .join(" ");
  const areaPath = `${linePath} L ${plotRight} ${plotBottom} L ${plotLeft} ${plotBottom} Z`;
  const labelIndexes = [
    ...new Set([
      0,
      Math.floor((series.points.length - 1) / 2),
      series.points.length - 1,
    ]),
  ];
  const gridLines = Array.from({ length: 5 }, (_, index) => {
    const value = max - (span / 4) * index;
    const y = plotTop + (plotHeight / 4) * index;

    return { value, y };
  });
  const leaderboardRanks = coin.leaderboardRanks ?? [];
  const dexPairUrl = getDexPairUrl(coin.market.dexPairAddress);
  const marketStats = [
    ["Market Cap", formatMarketCap(coin.market.marketCap)],
    ["24h Volume", formatMarketCap(coin.market.volume24h)],
    ["Liquidity", formatMarketCap(coin.market.liquidityUsd)],
    ["Supply", formatTokenSupply(coin.market.tokenSupply)],
    ["Source", formatMarketSource(coin.market.marketDataSource)],
    ["Updated", formatSnapshotDate(coin.market.lastUpdatedAt)],
  ];
  const performance = [
    { label: "1h", value: coin.market.change1h },
    { label: "6h", value: coin.market.change6h },
    { label: "24h", value: coin.market.change24h },
    { label: "Cached", display: series.changeLabel },
  ];

  return (
    <section className="min-w-0 px-6 py-8 lg:px-7">
      <div className="border-b border-[#1a1a1a]">
        <div className="flex flex-wrap items-center gap-8 text-sm font-semibold text-zinc-400">
          {[
            "Overview",
            "Markets",
            "News",
            "Similar Coins",
            "Historical Data",
          ].map((item, index) => (
            <button
              className={
                index === 0
                  ? "border-b-2 border-green-400 pb-4 text-white"
                  : "cursor-not-allowed pb-4 text-zinc-500"
              }
              disabled={index !== 0}
              key={item}
              title={index === 0 ? undefined : "This tab is not available yet"}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap gap-2">
          {["Price", "Compare"].map((item) => (
            <button
              className={chartActionClassName}
              key={item}
              type="button"
            >
              {item}
              <ChevronDown className="size-4 text-zinc-300" />
            </button>
          ))}
          <button
            className={chartIconActionClassName}
            type="button"
          >
            <ChartCandlestick className="size-4" />
          </button>
          <button
            className={chartIconActionClassName}
            type="button"
          >
            TV
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-1 rounded-md border border-[#2a2a2a] bg-[#050505] p-1">
          {["24H", "7D", "1M", "3M", "YTD", "1Y", "Max"].map((item) => (
            <button
              className={
                item === "7D"
                  ? "h-8 rounded-md bg-[#111111] px-3 text-sm font-semibold text-white hover:bg-[#1f1f1f]"
                  : "h-8 cursor-not-allowed rounded-md px-3 text-sm font-semibold text-zinc-500"
              }
              disabled={item !== "7D"}
              key={item}
              title={item === "7D" ? undefined : "Timeframe not available yet"}
              type="button"
            >
              {item}
            </button>
          ))}
          <button
            className="grid size-8 place-items-center rounded-md text-zinc-500"
            disabled
            type="button"
          >
            <EllipsisVertical className="size-4" />
          </button>
        </div>
      </div>

      <div className="mt-5 bg-transparent">
        <div className="px-0">
          <svg
            aria-label={`${coin.token.name} ${series.title.toLowerCase()} chart`}
            className="h-auto w-full"
            role="img"
            viewBox={`0 0 ${width} ${height}`}
          >
            <defs>
              <linearGradient id="coin-chart-fill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={stroke} stopOpacity="0.22" />
                <stop offset="100%" stopColor={stroke} stopOpacity="0" />
              </linearGradient>
            </defs>
            {gridLines.map(({ value, y }) => (
              <g key={y}>
                <line
                  stroke="#1a1a1a"
                  strokeWidth="1"
                  x1={plotLeft}
                  x2={plotRight}
                  y1={y}
                  y2={y}
                />
                <text
                  fill="#71717a"
                  fontSize="12"
                  textAnchor="start"
                  x={plotRight + 8}
                  y={y - 7}
                >
                  {series.formatValue(value)}
                </text>
              </g>
            ))}
            <path d={areaPath} fill="url(#coin-chart-fill)" />
            {volumeBars.map((bar, index) => (
              <rect
                fill="#2a2a2a"
                height={bar.height}
                key={`${bar.x}-${index}`}
                opacity="0.55"
                width={bar.width}
                x={bar.x}
                y={barBottom - bar.height}
              />
            ))}
            <path
              d={linePath}
              fill="none"
              stroke={stroke}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.4"
            />
            {coordinates.length > 0 ? (
              <circle
                cx={coordinates.at(-1)?.[0]}
                cy={coordinates.at(-1)?.[1]}
                fill={stroke}
                r="4"
                stroke="#030303"
                strokeWidth="2"
              />
            ) : null}
            {labelIndexes.map((pointIndex) => (
              <text
                fill="#71717a"
                fontSize="12"
                key={series.points[pointIndex]?.label ?? pointIndex}
                textAnchor={
                  pointIndex === 0
                    ? "start"
                    : pointIndex === series.points.length - 1
                      ? "end"
                      : "middle"
                }
                x={
                  plotLeft +
                  (pointIndex / Math.max(series.points.length - 1, 1)) *
                    plotWidth
                }
                y={height - 14}
              >
                {series.points[pointIndex]?.label}
              </text>
            ))}
          </svg>
          {series.sparse ? (
            <p className="border-t border-[#1a1a1a] px-1 pt-3 text-xs text-zinc-500">
              Collecting more cached price snapshots. The chart will become
              denser as scheduled syncs write additional market history.
            </p>
          ) : null}
        </div>
      </div>

      <section className="mt-5 grid overflow-hidden rounded-lg border border-[#1a1a1a] bg-[#1a1a1a] sm:grid-cols-4">
        {performance.map((item) => {
          const display = item.display ?? formatPercent(item.value);
          const negative =
            item.value !== undefined && item.value !== null
              ? item.value < 0
              : display.trim().startsWith("-");
          const unavailable = display === "-";

          return (
            <div className="bg-[#050505] px-4 py-3" key={item.label}>
              <p className="text-center text-xs font-bold text-zinc-400">
                {item.label}
              </p>
              <p
                className={
                  unavailable
                    ? "mt-2 text-center font-mono text-sm font-semibold text-zinc-500"
                    : negative
                      ? "mt-2 text-center font-mono text-sm font-semibold text-red-400"
                      : "mt-2 text-center font-mono text-sm font-semibold text-green-400"
                }
              >
                {display}
              </p>
            </div>
          );
        })}
      </section>

      <section className="mt-7 grid gap-px overflow-hidden rounded-lg border border-[#1a1a1a] bg-[#1a1a1a] sm:grid-cols-2 xl:grid-cols-3">
        {marketStats.map(([label, value]) => (
          <div className="bg-[#050505] px-4 py-4" key={label}>
            <p className="text-xs font-semibold uppercase text-zinc-500">
              {label}
            </p>
            <p className="mt-2 break-words font-mono text-sm font-semibold text-zinc-100">
              {value}
            </p>
          </div>
        ))}
      </section>

      {leaderboardRanks.length > 0 ? (
        <section className="mt-7 border border-[#1a1a1a] bg-[#050505] p-5">
          <h2 className="flex items-center gap-2 font-semibold text-white">
            <Trophy className="size-4 text-zinc-300" />
            Market Ranks
          </h2>
          <div className="mt-4 grid gap-px overflow-hidden rounded-md border border-[#1a1a1a] bg-[#1a1a1a] md:grid-cols-2 xl:grid-cols-4">
            {leaderboardRanks.map((rank) => (
              <div className="bg-[#080808] p-4" key={rank.kind}>
                <p className="text-xs font-semibold uppercase text-zinc-500">
                  {formatRankKind(rank.kind)}
                </p>
                <p className="mt-2 text-2xl font-bold text-white">
                  #{rank.rank.toLocaleString()}
                </p>
                <p className="mt-1 truncate text-xs text-zinc-400">
                  {rank.metric}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-7 border-t border-[#1a1a1a] pt-6">
        <h2 className="text-xl font-bold text-white">
          About {coin.token.name}
        </h2>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-zinc-400">
          {coin.token.description ||
            "No Bags metadata description was returned for this token."}
        </p>
      </section>

      <section className="mt-8 grid gap-5 xl:grid-cols-2">
        <div className="border border-[#1a1a1a] bg-[#050505] p-5">
          <h2 className="flex items-center gap-2 font-semibold text-white">
            <Layers3 className="size-4 text-zinc-300" />
            Pool Data
          </h2>
          <div className="mt-4">
            <StatRow
              label="Pool State"
              value={
                coin.token.migrationStatus === "migrated"
                  ? "Migrated DAMM v2"
                  : coin.token.migrationStatus === "dbc"
                    ? "Live DBC"
                    : "Fresh launch"
              }
            />
            <StatRow
              label="DBC pool"
              value={shortenKey(coin.pool?.dbcPoolKey ?? coin.token.dbcPoolKey)}
            />
            <StatRow
              label="DBC config"
              value={shortenKey(
                coin.pool?.dbcConfigKey ?? coin.token.dbcConfigKey,
              )}
            />
            <StatRow
              label="DAMM v2 pool"
              value={shortenKey(coin.pool?.dammV2PoolKey)}
            />
            <StatRow
              label="Launch signature"
              value={shortenKey(coin.token.launchSignature)}
            />
            <StatRow label="Quote mint" value={shortenKey(coin.quoteMint)} />
          </div>
        </div>

        <div className="border border-[#1a1a1a] bg-[#050505] p-5">
          <h2 className="flex items-center gap-2 font-semibold text-white">
            <Shield className="size-4 text-zinc-300" />
            Market Pair
          </h2>
          <div className="mt-4">
            <StatRow
              label="Dex token"
              value={
                coin.market.dexTokenSymbol ?? coin.market.dexTokenName ?? "-"
              }
            />
            <StatRow
              label="Pair"
              value={
                dexPairUrl ? (
                  <a
                    className="hover:text-white"
                    href={dexPairUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {shortenKey(coin.market.dexPairAddress)}
                  </a>
                ) : (
                  "-"
                )
              }
            />
            <StatRow
              label="Liquidity"
              value={formatMarketCap(coin.market.liquidityUsd)}
            />
            <StatRow
              label="24h volume"
              value={formatMarketCap(coin.market.volume24h)}
            />
            <StatRow
              label="Token mint"
              value={shortenKey(coin.token.tokenMint)}
            />
            <StatRow label="Metadata URI" value={shortenKey(coin.token.uri)} />
            <StatRow
              label="Market signal"
              value={`+${coin.marketSignal.value.toFixed(1)}%`}
            />
          </div>
        </div>
      </section>
    </section>
  );
}
