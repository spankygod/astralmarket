import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Bell,
  BookOpen,
  ChartCandlestick,
  ExternalLink,
  Globe,
  Info,
  Layers3,
  Link as LinkIcon,
  Search,
  Settings,
  Shield,
  Sparkles,
  UserRound,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { fetchBagsCoin, type BagsCoinDetailData } from "@/lib/bags-api";
import {
  formatMarketCap,
  formatPercent,
  formatPrice,
} from "@/lib/market-format";

type CoinPageProps = {
  params: Promise<{
    identifier: string;
  }>;
};

const actionClassName =
  "inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold transition-colors";

const navItems = [
  ["Bags Tokens", "/#leaderboard"],
  ["Pools", "/#leaderboard"],
  ["Migrated", "/#leaderboard"],
  ["Launches", "/#bags-overview"],
  ["Intelligence", "/#latest-bags-signals"],
] as const;

const shortenKey = (value?: string | null) => {
  if (!value) {
    return "Not available";
  }

  return value.length > 18
    ? `${value.slice(0, 8)}...${value.slice(-7)}`
    : value;
};

const formatLamports = (value: string | null) => {
  if (!value) {
    return "Not available";
  }

  const lamports = Number(value);

  if (!Number.isFinite(lamports)) {
    return `${value} lamports`;
  }

  return `${(lamports / 1_000_000_000).toLocaleString(undefined, {
    maximumFractionDigits: 6,
  })} SOL`;
};

const formatStatus = (value: string) =>
  value
    .toLowerCase()
    .replace(/_/gu, " ")
    .replace(/\b\w/gu, (letter) => letter.toUpperCase());

const getPoolLabel = (
  status: BagsCoinDetailData["token"]["migrationStatus"],
) => {
  if (status === "migrated") {
    return "Migrated pool";
  }

  if (status === "dbc") {
    return "Live DBC";
  }

  return "Fresh launch";
};

const getCategories = (coin: BagsCoinDetailData) => [
  "BagsApp Ecosystem",
  getPoolLabel(coin.token.migrationStatus),
  formatStatus(coin.token.status),
];

const getQuoteSummary = (quote: BagsCoinDetailData["quote"]) => {
  if (!quote || typeof quote !== "object") {
    return null;
  }

  const maybeQuote = quote as {
    outAmount?: unknown;
    priceImpactPct?: unknown;
    routePlan?: unknown;
  };

  return {
    outAmount:
      typeof maybeQuote.outAmount === "string" ? maybeQuote.outAmount : null,
    priceImpactPct:
      typeof maybeQuote.priceImpactPct === "string"
        ? maybeQuote.priceImpactPct
        : null,
    routeCount: Array.isArray(maybeQuote.routePlan)
      ? maybeQuote.routePlan.length
      : null,
  };
};

const formatChartDate = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Snapshot";
  }

  return date.toLocaleString(undefined, {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  });
};

const maxDetailChartPoints = 180;

const downsampleChartPoints = <T,>(
  points: T[],
  maxPoints = maxDetailChartPoints,
) => {
  if (points.length <= maxPoints) {
    return points;
  }

  return Array.from({ length: maxPoints }, (_, index) => {
    const sourceIndex = Math.round(
      (index / (maxPoints - 1)) * (points.length - 1),
    );

    return points[sourceIndex] as T;
  });
};

const getSeriesChange = (points: Array<{ value: number }>) => {
  const first = points.at(0)?.value;
  const last = points.at(-1)?.value;

  if (
    first === undefined ||
    last === undefined ||
    !Number.isFinite(first) ||
    !Number.isFinite(last) ||
    first <= 0
  ) {
    return null;
  }

  return ((last - first) / first) * 100;
};

const buildChartSeries = (coin: BagsCoinDetailData) => {
  const pricePoints = coin.marketHistory
    .filter((snapshot) => snapshot.price !== null)
    .map((snapshot) => ({
      label: formatChartDate(snapshot.capturedAt),
      value: snapshot.price as number,
    }));

  if (pricePoints.length >= 2) {
    const points = downsampleChartPoints(pricePoints);
    const change = getSeriesChange(points);

    return {
      title: "Price",
      sourceLabel: "Cached price snapshots",
      points,
      formatValue: formatPrice,
      negative: points.at(-1)!.value < points[0]!.value,
      sparse: pricePoints.length < 24,
      changeLabel: change === null ? "-" : formatPercent(change),
    };
  }

  const signalPoints = coin.marketHistory
    .filter((snapshot) => snapshot.marketSignal !== null)
    .map((snapshot) => ({
      label: formatChartDate(snapshot.capturedAt),
      value: snapshot.marketSignal as number,
    }));

  const points =
    signalPoints.length >= 2
      ? downsampleChartPoints(signalPoints)
      : [
          { label: "Current", value: coin.marketSignal.value },
          { label: "Latest", value: coin.marketSignal.value },
        ];

  return {
    title: "Bags Signal",
    sourceLabel: "Price history pending",
    points,
    formatValue: (value?: number | null) =>
      value === null || value === undefined ? "-" : value.toFixed(1),
    negative: false,
    sparse: true,
    changeLabel: "-",
  };
};

function ChangeText({ value }: { value?: number | null }) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return <span className="text-slate-500">-</span>;
  }

  const negative = value < 0;

  return (
    <span
      className={
        negative
          ? "inline-flex items-center gap-1 font-semibold text-red-400"
          : "inline-flex items-center gap-1 font-semibold text-green-400"
      }
    >
      {negative ? (
        <ArrowDown className="size-3" />
      ) : (
        <ArrowUp className="size-3" />
      )}
      {formatPercent(value).replace("+", "")}
    </span>
  );
}

function TopChrome({ coin }: { coin: BagsCoinDetailData | null }) {
  const stats = [
    ["Bags Launch", coin ? formatStatus(coin.token.status) : "N/A"],
    ["Pool State", coin ? getPoolLabel(coin.token.migrationStatus) : "N/A"],
    ["Market Cap", coin ? formatMarketCap(coin.market.marketCap) : "-"],
    ["24h", coin ? formatPercent(coin.market.change24h) : "-"],
    ["Quote Mint", coin ? shortenKey(coin.quoteMint) : "N/A"],
  ];

  return (
    <>
      <div className="border-b border-[#1a1a1a] bg-[#050505]">
        <div className="mx-auto flex h-[52px] max-w-[1780px] items-center gap-5 overflow-x-auto px-6 text-xs text-zinc-300 lg:px-9">
          {stats.map(([label, value]) => (
            <p className="shrink-0" key={label}>
              <span className="text-zinc-500">{label}: </span>
              <b className="text-zinc-100">{value}</b>
            </p>
          ))}
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <Button
              className="size-9 border-[#263242] bg-[#111827] disabled:cursor-not-allowed disabled:opacity-50"
              disabled
              size="icon"
              title="Settings are not available yet"
            >
              <Settings className="size-4" />
            </Button>
            <Button
              className="size-9 border-[#263242] bg-[#111827] disabled:cursor-not-allowed disabled:opacity-50"
              disabled
              size="icon"
              title="Alerts are not available yet"
            >
              <Bell className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      <nav className="border-b border-[#1a1a1a] bg-[#000000]">
        <div className="mx-auto flex h-16 max-w-[1780px] items-center gap-8 px-6 lg:px-9">
          <Link className="flex items-center gap-3" href="/">
            <Image
              alt=""
              className="size-8 invert"
              height={32}
              priority
              src="/assets/logo.svg"
              width={32}
            />
            <span className="text-2xl font-bold text-white">astralmarket</span>
          </Link>
          <div className="hidden items-center gap-8 text-sm font-semibold text-slate-300 lg:flex">
            {navItems.map(([item, href]) => (
              <Link className="hover:text-white" href={href} key={item}>
                {item}
              </Link>
            ))}
          </div>
          <div className="ml-auto hidden w-56 items-center md:flex">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
              <Input
                className="h-10 border-[#1a1a1a] bg-[#111827] pl-9 text-sm text-slate-100 placeholder:text-slate-500 disabled:cursor-not-allowed disabled:opacity-70"
                disabled
                placeholder="Search coming soon"
              />
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}

function EmptyCoin({ identifier }: { identifier: string }) {
  return (
    <main className="min-h-screen bg-[#000000] text-slate-100">
      <TopChrome coin={null} />
      <div className="mx-auto max-w-5xl px-6 py-10">
        <Link
          className={`${actionClassName} border border-[#2a2a2a] bg-[#111111] text-zinc-100 hover:bg-[#181818]`}
          href="/"
        >
          <ArrowLeft className="size-4" />
          Markets
        </Link>
        <section className="mt-10 border border-[#1a1a1a] bg-[#050505] p-8">
          <p className="text-sm font-semibold uppercase text-zinc-500">
            Bags token lookup
          </p>
          <h1 className="mt-3 text-3xl font-bold text-white">
            No Bags token found for {decodeURIComponent(identifier)}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-400">
            This page searches Bags launch-feed symbols, token mints, and token
            name slugs. Use a token from the market table or paste a Bags token
            mint directly into the URL.
          </p>
        </section>
      </div>
    </main>
  );
}

function StatRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[#1a1a1a] py-3 text-sm last:border-0">
      <span className="text-slate-400">{label}</span>
      <span className="min-w-0 break-words text-right font-semibold text-zinc-100">
        {value}
      </span>
    </div>
  );
}

function CoinSummary({ coin }: { coin: BagsCoinDetailData }) {
  const categories = getCategories(coin);

  return (
    <aside className="min-w-0 border-r border-[#1a1a1a] px-6 py-8 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto lg:px-7">
      <Link
        className={`${actionClassName} mb-8 border border-[#2a2a2a] bg-[#111111] text-zinc-100 hover:bg-[#181818]`}
        href="/"
      >
        <ArrowLeft className="size-4" />
        Markets
      </Link>

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
          <ChangeText value={coin.market.change24h} />
        </div>
        <p className="mt-2 font-mono text-xs text-slate-500 break-all">
          {coin.token.tokenMint}
        </p>
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
        <a
          className={`${actionClassName} flex-1 bg-white text-black hover:bg-zinc-200`}
          href={coin.token.bagsUrl}
          rel="noreferrer"
          target="_blank"
        >
          Bags
          <ExternalLink className="size-4" />
        </a>
        {coin.token.website ? (
          <a
            className={`${actionClassName} border border-[#2a2a2a] bg-[#111111] text-zinc-100 hover:bg-[#181818]`}
            href={coin.token.website}
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
          label="1h"
          value={<ChangeText value={coin.market.change1h} />}
        />
        <StatRow
          label="24h"
          value={<ChangeText value={coin.market.change24h} />}
        />
        <StatRow
          label="Lifetime Fees"
          value={formatLamports(coin.lifetimeFeesLamports)}
        />
        <StatRow
          label="Pool State"
          value={getPoolLabel(coin.token.migrationStatus)}
        />
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-bold text-white">Info</h2>
        <div className="mt-4 space-y-4 text-sm">
          <div>
            <p className="mb-2 text-slate-400">Website</p>
            <div className="flex flex-wrap gap-2">
              {coin.token.website ? (
                <a
                  className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#1f2937] px-3 text-xs font-semibold text-zinc-100 hover:bg-[#273449]"
                  href={coin.token.website}
                  rel="noreferrer"
                  target="_blank"
                >
                  Website
                  <ExternalLink className="size-3" />
                </a>
              ) : null}
              {coin.token.uri ? (
                <a
                  className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#1f2937] px-3 text-xs font-semibold text-zinc-100 hover:bg-[#273449]"
                  href={coin.token.uri}
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

function MarketChart({ coin }: { coin: BagsCoinDetailData }) {
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

function InsightsRail({ coin }: { coin: BagsCoinDetailData }) {
  const quoteSummary = getQuoteSummary(coin.quote);
  const creator =
    coin.creators.find((item) => item.isCreator) ?? coin.creators[0];
  const events = [
    `${coin.token.symbol || coin.token.name} is tracked in the Bags launch feed.`,
    `${getPoolLabel(coin.token.migrationStatus)} is the current derived pool state.`,
    coin.market.marketCap
      ? `Cached market cap is ${formatMarketCap(coin.market.marketCap)}.`
      : "No cached market cap is available yet.",
    quoteSummary?.routeCount
      ? `Quote route currently has ${quoteSummary.routeCount} leg${quoteSummary.routeCount === 1 ? "" : "s"}.`
      : "No usable quote route was returned.",
  ];

  return (
    <aside className="hidden border-l border-[#1a1a1a] bg-[#030303] 2xl:block">
      <div className="sticky top-0 h-screen overflow-y-auto px-5 py-6">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="size-4 text-white" />
            <h2 className="font-bold text-white">Insights</h2>
          </div>
          <BookOpen className="size-4 text-slate-400" />
        </div>

        <section className="border border-[#1a1a1a] bg-[#080808] p-4">
          <p className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <Info className="size-4" />
            Why this token is moving
          </p>
          <h3 className="mt-4 text-sm font-bold leading-5 text-white">
            {coin.token.symbol || coin.token.name} is showing a{" "}
            {coin.marketSignal.value.toFixed(1)} Bags market signal.
          </h3>
          <p className="mt-3 text-xs leading-5 text-slate-500">
            Signal is derived from Bags launch status, pool state, and cached
            market snapshots when available.
          </p>
        </section>

        <Separator className="my-5 bg-[#1a1a1a]" />

        <section>
          <h3 className="mb-4 text-sm font-bold text-slate-200">
            Recently Happened
          </h3>
          <div className="space-y-6 border-l border-[#263242] pl-4">
            {events.map((event, index) => (
              <article className="relative" key={event}>
                <span className="absolute -left-[21px] top-1.5 size-2 rounded-full bg-slate-500" />
                <p className="text-xs text-slate-500">
                  {index === 0 ? "Now" : "Bags feed"}
                </p>
                <h4 className="mt-2 text-sm font-semibold leading-5 text-slate-200">
                  {event}
                </h4>
                <Badge
                  className="mt-3 rounded-full border-[#2a2a2a] bg-transparent text-slate-400"
                  variant="outline"
                >
                  1 source
                </Badge>
              </article>
            ))}
          </div>
        </section>

        <Separator className="my-5 bg-[#1a1a1a]" />

        <section>
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-200">
            <UserRound className="size-4" />
            Creator
          </h3>
          {creator ? (
            <div className="mt-4 bg-[#080808] p-4">
              <p className="font-semibold text-zinc-100">
                {creator.providerUsername ??
                  creator.twitterUsername ??
                  creator.bagsUsername ??
                  creator.username ??
                  "Unknown creator"}
              </p>
              <p className="mt-2 break-all font-mono text-xs text-slate-500">
                {creator.wallet ?? "Wallet unavailable"}
              </p>
              <p className="mt-3 text-xs text-slate-400">
                Royalty:{" "}
                {creator.royaltyBps !== null && creator.royaltyBps !== undefined
                  ? `${creator.royaltyBps} bps`
                  : "Unavailable"}
              </p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500">
              Creator data was not returned by Bags.
            </p>
          )}
        </section>
      </div>
    </aside>
  );
}

export default async function CoinsPage({ params }: CoinPageProps) {
  const { identifier } = await params;
  const coin = await fetchBagsCoin(identifier);

  if (!coin) {
    return <EmptyCoin identifier={identifier} />;
  }

  return (
    <main className="min-h-screen bg-[#000000] text-slate-100">
      <TopChrome coin={coin} />
      <div className="mx-auto grid max-w-[1780px] grid-cols-1 lg:grid-cols-[430px_minmax(0,1fr)] 2xl:grid-cols-[430px_minmax(0,1fr)_300px]">
        <CoinSummary coin={coin} />
        <MarketChart coin={coin} />
        <InsightsRail coin={coin} />
      </div>
    </main>
  );
}
