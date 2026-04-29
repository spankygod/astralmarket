import { ChartCandlestick, Layers3, Shield } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { BagsCoinDetailData } from "@/lib/bags-api";
import { buildChartSeries, shortenKey } from "@/lib/coin-detail-mappers";
import { formatMarketCap } from "@/lib/market-format";

import { StatRow } from "./stat-row";

export function MarketChart({ coin }: { coin: BagsCoinDetailData }) {
  const series = buildChartSeries(coin);
  const points = series.points.map((point) => point.value);
  const width = 980;
  const height = 420;
  const plotTop = 18;
  const plotHeight = 330;
  const plotBottom = plotTop + plotHeight;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = Math.max(max - min, Number.EPSILON);
  const stroke = series.negative ? "#ff3b30" : "#22c55e";
  const coordinates = points.map((point, index) => {
    const x = (index / Math.max(points.length - 1, 1)) * width;
    const y = plotBottom - ((point - min) / span) * plotHeight;

    return [x, y] as const;
  });
  const linePath = coordinates
    .map(
      ([x, y], index) =>
        `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`,
    )
    .join(" ");
  const areaPath = `${linePath} L ${width} ${plotBottom} L 0 ${plotBottom} Z`;
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
  const currentValue = points.at(-1);

  return (
    <section className="min-w-0 px-6 py-8 lg:px-7">
      <div className="flex flex-col gap-5 border-b border-[#1a1a1a] pb-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-400">
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
                    ? "border-b-2 border-white pb-3 text-white"
                    : "cursor-not-allowed pb-3 text-slate-600"
                }
                disabled={index !== 0}
                key={item}
                title={
                  index === 0 ? undefined : "This tab is not available yet"
                }
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {["1H", "24H", "7D", "30D", "1Y"].map((item) => (
            <button
              className={
                item === "7D"
                  ? "h-8 rounded-md bg-white px-3 text-xs font-bold text-black"
                  : "h-8 cursor-not-allowed rounded-md px-3 text-xs font-bold text-slate-500"
              }
              disabled={item !== "7D"}
              key={item}
              title={item === "7D" ? undefined : "Timeframe not available yet"}
              type="button"
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 overflow-hidden rounded-lg border border-[#1a1a1a] bg-[#030303]">
        <div className="grid gap-px border-b border-[#1a1a1a] bg-[#1a1a1a] md:grid-cols-4">
          {[
            ["Current", series.formatValue(currentValue)],
            ["7d change", series.changeLabel],
            ["Market cap", formatMarketCap(coin.market.marketCap)],
            ["Snapshots", `${coin.marketHistory.length}`],
          ].map(([label, value]) => (
            <div className="bg-[#050505] px-4 py-3" key={label}>
              <p className="text-xs font-semibold uppercase text-slate-500">
                {label}
              </p>
              <p className="mt-1 font-mono text-sm font-semibold text-zinc-100">
                {value}
              </p>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2 px-4 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-base font-bold text-white">
              <ChartCandlestick className="size-4 text-zinc-300" />
              {coin.token.symbol || coin.token.name} {series.title}
            </h2>
            <p className="mt-1 text-xs text-slate-500">{series.sourceLabel}</p>
          </div>
          <Badge className="w-fit rounded-md border-[#2a2a2a] bg-transparent px-3 text-slate-300">
            7 day window
          </Badge>
        </div>

        <div className="px-3 pb-4 pt-2">
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
                  stroke="#1f2937"
                  strokeDasharray="3 6"
                  strokeWidth="1"
                  x1="0"
                  x2={width}
                  y1={y}
                  y2={y}
                />
                <text
                  fill="#64748b"
                  fontSize="12"
                  textAnchor="end"
                  x={width - 6}
                  y={y - 7}
                >
                  {series.formatValue(value)}
                </text>
              </g>
            ))}
            <path d={areaPath} fill="url(#coin-chart-fill)" />
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
                fill="#64748b"
                fontSize="12"
                key={series.points[pointIndex]?.label ?? pointIndex}
                textAnchor={
                  pointIndex === 0
                    ? "start"
                    : pointIndex === series.points.length - 1
                      ? "end"
                      : "middle"
                }
                x={(pointIndex / Math.max(series.points.length - 1, 1)) * width}
                y={height - 14}
              >
                {series.points[pointIndex]?.label}
              </text>
            ))}
          </svg>
          {series.sparse ? (
            <p className="border-t border-[#1a1a1a] px-1 pt-3 text-xs text-slate-500">
              Collecting more cached price snapshots. The chart will become
              denser as scheduled syncs write additional market history.
            </p>
          ) : null}
        </div>
      </div>

      <section className="mt-7 border-t border-[#1a1a1a] pt-6">
        <h2 className="text-xl font-bold text-white">
          About {coin.token.name}
        </h2>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400">
          {coin.token.description ||
            "No Bags metadata description was returned for this token."}
        </p>
      </section>

      <section className="mt-8 grid gap-5 xl:grid-cols-2">
        <div className="border border-[#1a1a1a] bg-[#050505] p-5">
          <h2 className="flex items-center gap-2 font-semibold text-white">
            <Layers3 className="size-4 text-zinc-300" />
            Pool and Route Data
          </h2>
          <div className="mt-4">
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
          </div>
        </div>

        <div className="border border-[#1a1a1a] bg-[#050505] p-5">
          <h2 className="flex items-center gap-2 font-semibold text-white">
            <Shield className="size-4 text-zinc-300" />
            Source Data
          </h2>
          <div className="mt-4">
            <StatRow
              label="Token mint"
              value={shortenKey(coin.token.tokenMint)}
            />
            <StatRow label="Metadata URI" value={shortenKey(coin.token.uri)} />
            <StatRow label="Quote mint" value={shortenKey(coin.quoteMint)} />
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
