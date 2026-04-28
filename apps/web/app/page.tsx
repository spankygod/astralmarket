import {
  ArrowUp,
  Bell,
  BookOpen,
  ChevronRight,
  ChevronLeft,
  Flame,
  Gauge,
  Grid2X2,
  LayoutList,
  Maximize2,
  Newspaper,
  PanelRight,
  Search,
  Settings,
  Shield,
  Sparkles,
  Star,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { HomepageHighlights } from "@/components/homepage-highlights";
import { LatestNewsGallery } from "@/components/latest-news-gallery";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  fetchBagsCategory,
  fetchBagsMarket,
  type BagsCategoryData,
  type BagsMarketItem,
  type BagsMarketNewsItem,
} from "@/lib/bags-api";
import {
  formatMarketCap,
  formatPercent,
  formatPrice,
} from "@/lib/market-format";

const unavailableGlobalStats: Array<[string, string, string?]> = [
  ["Bags Launches", "N/A"],
  ["Active Pools", "N/A"],
  ["Live DBC", "N/A"],
  ["Migrated", "N/A"],
  ["Quote Mint", "N/A"],
];

type BagsTableRow = {
  rank: number;
  name: string;
  symbol: string;
  image?: string | null;
  badge: string;
  price: string;
  h1: string;
  h24: string;
  d7: string;
  marketCap: string;
  volume24h: string;
  tokenMint: string;
  sparkline: number[];
  positive: boolean;
};

type HomeSearchParams = {
  page?: string | string[];
};

const leaderboardPageSize = 50;

const categoryTabs: Array<[string, LucideIcon]> = [
  ["All", Grid2X2],
  ["Highlights", LayoutList],
  ["Migrated Pools", Shield],
  ["Live DBC", PanelRight],
  ["BagsApp Ecosystem", Flame],
  ["New Launches", Flame],
  ["High Impact", Flame],
];

const navItems = [
  ["Bags Tokens", "#leaderboard"],
  ["Pools", "#leaderboard"],
  ["Migrated", "#leaderboard"],
  ["Launches", "#bags-overview"],
  ["Intelligence", "#latest-bags-signals"],
  ["API", "#site-footer"],
] as const;

const leaderboardColumns = [
  { label: " ", className: "w-11 px-3" },
  { label: "#", className: "w-14 px-3 text-left" },
  { label: "Token", className: "min-w-[280px] px-3 text-left" },
  { label: "Price", className: "w-40 px-3 text-center" },
  { label: "1h", className: "w-24 px-3 text-center" },
  { label: "24h", className: "w-24 px-3 text-center" },
  { label: "7d", className: "w-24 px-3 text-center" },
  { label: "24h Volume", className: "w-36 px-3 text-center" },
  { label: "Market Cap", className: "w-36 px-3 text-center" },
  { label: "Graph", className: "w-44 px-3 text-left" },
];

const narratives: Array<[string, string]> = [
  ["Fresh Bags Launches", "+6.1%"],
  ["Migrated Pool Flow", "+2.8%"],
  ["Low Impact Quotes", "+1.5%"],
  ["DBC Momentum", "+4.6%"],
];

const footerColumns = [
  {
    title: "Resources",
    links: [
      ["Bags Tokens", "#leaderboard"],
      ["Market Leaderboard", "#leaderboard"],
      ["Token Launches", "#bags-overview"],
      ["Crypto API", null],
      ["Market Signals", "#latest-bags-signals"],
    ],
  },
  {
    title: "Support",
    links: [
      ["Request Form", null],
      ["Advertising", null],
      ["Help Center", null],
      ["Bug Bounty", null],
      ["FAQ", null],
    ],
  },
  {
    title: "About Astralmarket",
    links: [
      ["About Us", "#site-footer"],
      ["Methodology", "#site-footer"],
      ["Disclaimer", "#site-footer"],
      ["Terms of Service", null],
      ["Privacy Policy", null],
    ],
  },
  {
    title: "Community",
    links: [
      ["X/Twitter", null],
      ["Telegram Chat", null],
      ["Telegram News", null],
      ["Discord", null],
      ["Github", null],
    ],
  },
];

const shortenKey = (value: string) =>
  value.length > 13 ? `${value.slice(0, 6)}...${value.slice(-5)}` : value;

const buildGlobalStats = (
  category: BagsCategoryData | null,
): Array<[string, string, string?]> => {
  if (!category) {
    return unavailableGlobalStats;
  }

  return [
    ["Bags Launches", category.stats.launches.toLocaleString()],
    ["Active Pools", category.stats.activePools.toLocaleString()],
    ["Live DBC", category.stats.liveDbcPools.toLocaleString()],
    ["Migrated", `${category.stats.migratedPools.toLocaleString()} pools`],
    ["Quote Mint", shortenKey(category.stats.quoteMint)],
  ];
};

const mapLeaderboardToRows = (
  leaderboard: BagsMarketItem[] | undefined,
): BagsTableRow[] | null => {
  if (!leaderboard || leaderboard.length === 0) {
    return null;
  }

  return leaderboard.map((item) => ({
    rank: item.rank,
    name: item.name,
    symbol: item.symbol,
    image: item.image,
    badge: (item.symbol || item.name || "??").slice(0, 2).toUpperCase(),
    price: formatPrice(item.price),
    h1: formatPercent(item.change1h),
    h24: formatPercent(item.change24h),
    d7: formatPercent(item.change7d),
    marketCap: formatMarketCap(item.marketCap),
    volume24h: formatMarketCap(item.volume24h),
    tokenMint: item.tokenMint,
    sparkline: item.sparkline ?? [8, 9, 12, 11, 13, 15, 16, 18, 17, 19, 21, 22],
    positive: (item.change24h ?? item.score) >= 0,
  }));
};

function Sparkline({
  points,
  width = 148,
  height = 54,
}: {
  points: number[];
  width?: number;
  height?: number;
}) {
  const values = points.filter((point) => Number.isFinite(point));

  if (values.length < 2) {
    return <span className="text-xs text-slate-600">-</span>;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, Number.EPSILON);
  const positive = values.at(-1)! >= values[0]!;
  const stroke = positive ? "#22c55e" : "#ff3b30";
  const coordinates = values.map((point, index) => {
    const x = (index / (values.length - 1)) * width;
    const y = height - ((point - min) / span) * (height - 5) - 2.5;

    return [x, y] as const;
  });
  const linePath = coordinates
    .map(([x, y], index) => {
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
  const areaPath = `${linePath} L ${width} ${height} L 0 ${height} Z`;

  return (
    <svg
      aria-hidden="true"
      className="block"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
    >
      <path d={areaPath} fill={stroke} opacity="0.08" />
      <path
        d={linePath}
        fill="none"
        stroke={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    </svg>
  );
}

function PositiveText({ value }: { value: string }) {
  return (
    <span className="inline-flex items-center gap-1 font-medium text-green-400">
      <ArrowUp className="size-3" />
      {value.replace("+", "")}
    </span>
  );
}

function ChangeText({ value }: { value: string }) {
  if (value === "-") {
    return <span className="text-slate-500">-</span>;
  }

  const negative = value.startsWith("-");

  return (
    <span
      className={
        negative
          ? "font-medium text-red-400"
          : "inline-flex items-center gap-1 font-medium text-green-400"
      }
    >
      {negative ? null : <ArrowUp className="size-3" />}
      {value.replace("+", "")}
    </span>
  );
}

const getNewsSourceLabel = (source: string) => {
  if (source === "fmp_crypto_news") {
    return "Crypto news";
  }

  return "Bags launch feed";
};

function RightRail({
  insights,
  latestBagsSignals,
  latestCryptoNews,
}: {
  insights: BagsMarketNewsItem[];
  latestBagsSignals: BagsMarketNewsItem[];
  latestCryptoNews: BagsMarketNewsItem[];
}) {
  const primaryInsight = insights.at(0);

  return (
    <aside className="hidden border-l border-[#1a1a1a] bg-[#000000] 2xl:block">
      <div className="sticky top-[117px] h-[calc(100vh-117px)] overflow-y-auto px-5 py-4">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex gap-4 text-sm">
            <span className="font-semibold text-zinc-100">Insights</span>
            <span className="text-slate-500">Watchlist</span>
          </div>
          <div className="flex gap-3 text-zinc-300">
            <Maximize2 className="size-4" />
            <BookOpen className="size-4" />
          </div>
        </div>

        <Separator className="mb-4 bg-[#1a1a1a]" />

        <section id="market-insights">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-slate-100">
              Bags Market Overview
            </h3>
            <div className="flex gap-2">
              <span className="grid size-5 place-items-center rounded-full bg-[#111111] text-xs">
                ‹
              </span>
              <span className="grid size-5 place-items-center rounded-full bg-[#111111] text-xs">
                ›
              </span>
            </div>
          </div>
          <p className="text-sm leading-6 text-slate-400">
            <b className="text-slate-300">Summary:</b>{" "}
            {primaryInsight
              ? primaryInsight.detail
              : "Live Bags market data is not available."}
          </p>
          <p className="mt-6 text-xs text-slate-500">live Bags feed</p>
          <a
            className="mt-3 inline-flex h-9 w-full items-center justify-center rounded-lg border border-[#2a2a2a] bg-[#111111] px-2.5 text-sm font-medium text-slate-100 transition-colors hover:bg-[#181818]"
            href="#latest-bags-signals"
          >
            View Full Insights
          </a>
        </section>

        <Separator className="my-5 bg-[#1a1a1a]" />

        <section>
          <h3 className="mb-3 font-semibold text-slate-100">
            Bags Narratives Today
          </h3>
          <div className="space-y-2">
            {narratives.map(([name, change]) => (
              <Badge
                className="flex h-7 w-fit items-center gap-2 rounded-md bg-[#111111] px-3 text-slate-300"
                key={name}
                variant="secondary"
              >
                🔥 {name} <PositiveText value={change} />
              </Badge>
            ))}
          </div>
        </section>

        <Separator className="my-5 bg-[#1a1a1a]" />

        <section id="latest-bags-signals">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-slate-100">
            <Newspaper className="size-4 text-zinc-400" />
            Latest Bags Signals
          </h3>
          <div className="space-y-6 border-l border-[#1a1a1a] pl-4">
            {latestBagsSignals.length === 0 ? (
              <p className="text-sm text-slate-500">
                No live signals available.
              </p>
            ) : (
              latestBagsSignals.map((item, index) => (
                <article
                  className="relative"
                  key={`${item.source}-${item.tokenMint ?? item.href}-${index}`}
                >
                  <span className="absolute -left-[21px] top-1 size-2 rounded-full bg-zinc-600" />
                  <p className="text-xs text-slate-500">
                    {getNewsSourceLabel(item.source)}
                  </p>
                  <h4 className="mt-3 text-sm font-semibold leading-5 text-slate-200">
                    <Link className="hover:text-white" href={item.href}>
                      {item.headline}
                    </Link>
                  </h4>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    {item.detail}
                  </p>
                  <Badge
                    className="mt-3 rounded-full border-[#1f1f1f] bg-transparent text-slate-400"
                    variant="outline"
                  >
                    1 source
                  </Badge>
                </article>
              ))
            )}
          </div>
        </section>

        <Separator className="my-5 bg-[#1a1a1a]" />

        <section id="latest-crypto-news">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-slate-100">
            <Newspaper className="size-4 text-zinc-400" />
            Latest Crypto News
          </h3>
          <div className="space-y-6 border-l border-[#1a1a1a] pl-4">
            {latestCryptoNews.length === 0 ? (
              <p className="text-sm text-slate-500">
                No crypto news available.
              </p>
            ) : (
              latestCryptoNews.map((item, index) => (
                <article
                  className="relative"
                  key={`${item.source}-${item.href}-${index}`}
                >
                  <span className="absolute -left-[21px] top-1 size-2 rounded-full bg-zinc-600" />
                  <p className="text-xs text-slate-500">
                    {getNewsSourceLabel(item.source)}
                  </p>
                  <h4 className="mt-3 text-sm font-semibold leading-5 text-slate-200">
                    <Link className="hover:text-white" href={item.href}>
                      {item.headline}
                    </Link>
                  </h4>
                  <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-500">
                    {item.detail}
                  </p>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </aside>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-[#1a1a1a] bg-[#000000]" id="site-footer">
      <div className="mx-auto grid max-w-[1780px] gap-10 px-6 py-10 lg:grid-cols-[minmax(280px,1.2fr)_repeat(4,minmax(140px,1fr))] lg:px-7">
        <div>
          <div className="flex items-center gap-3">
            <Image
              alt=""
              className="size-9 invert"
              height={36}
              priority
              src="/assets/logo.svg"
              width={36}
            />
            <span className="text-2xl font-bold tracking-tight text-white">
              astralmarket
            </span>
          </div>
          <p className="mt-6 max-w-xl text-sm leading-6 text-zinc-300">
            Astralmarket tracks Bags.fm launches, migrated pools, and market
            data using live Bags snapshots and DexScreener coverage for price,
            movement, and market capitalization.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {["Bags data", "DexScreener market data", "Supabase snapshots"].map(
              (item) => (
                <span
                  className="rounded-md border border-[#2a2a2a] bg-[#080808] px-3 py-2 text-xs font-semibold text-zinc-100"
                  key={item}
                >
                  {item}
                </span>
              ),
            )}
          </div>
        </div>

        {footerColumns.map((column) => (
          <div key={column.title}>
            <h3 className="text-sm font-bold text-zinc-100">{column.title}</h3>
            <ul className="mt-5 space-y-4 text-sm text-zinc-400">
              {column.links.map(([label, href]) => (
                <li key={label}>
                  {href ? (
                    <a className="hover:text-white" href={href}>
                      {label}
                    </a>
                  ) : (
                    <span className="cursor-not-allowed text-zinc-600">
                      {label}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-[#1a1a1a]">
        <div className="mx-auto flex max-w-[1780px] flex-col gap-4 px-6 py-6 lg:flex-row lg:items-center lg:justify-between lg:px-7">
          <div>
            <p className="text-sm font-semibold text-zinc-100">
              Interested in staying up to date with Bags market moves?
            </p>
            <p className="mt-2 text-sm text-zinc-400">
              Get leaderboard updates, sync coverage, and launch-feed signals.
            </p>
          </div>
          <form className="flex w-full max-w-md gap-2">
            <Input
              aria-label="Email updates"
              className="h-10 border-[#2a2a2a] bg-[#080808] text-zinc-100 placeholder:text-slate-500"
              placeholder="Enter your email address"
              type="email"
            />
            <Button
              className="h-10 bg-white px-4 text-black hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
              disabled
              title="Email subscriptions are not available yet"
            >
              Subscribe
            </Button>
          </form>
        </div>
      </div>

      <div className="border-t border-[#1a1a1a]">
        <div className="mx-auto max-w-[1780px] px-6 py-7 text-xs leading-5 text-zinc-400 lg:px-7">
          <p>© 2026 Astralmarket. All rights reserved.</p>
          <p className="mt-5">
            <b className="text-zinc-100">Important disclaimer:</b> Market data
            is provided for informational purposes only and may come from third
            party sources. Nothing on this site is financial advice. Always do
            your own research before trading or relying on token market data.
          </p>
        </div>
      </div>
    </footer>
  );
}

const parsePage = (value: string | string[] | undefined) => {
  const rawValue = Array.isArray(value) ? value.at(0) : value;
  const page = Number(rawValue);

  return Number.isInteger(page) && page > 0 ? page : 1;
};

const getPaginationItems = (page: number, totalPages: number) => {
  const visiblePages = new Set<number>([
    1,
    totalPages,
    page,
    page - 1,
    page + 1,
  ]);

  if (page <= 4) {
    [1, 2, 3, 4, 5].forEach((item) => visiblePages.add(item));
  }

  if (page >= totalPages - 3) {
    [
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ].forEach((item) => visiblePages.add(item));
  }

  const pages = [...visiblePages]
    .filter((item) => item >= 1 && item <= totalPages)
    .sort((a, b) => a - b);
  const items: Array<number | "..."> = [];

  for (const item of pages) {
    const previous = items.at(-1);

    if (typeof previous === "number" && item - previous > 1) {
      items.push("...");
    }

    items.push(item);
  }

  return items;
};

function PaginationControls({
  page,
  total,
  totalPages,
}: {
  page: number;
  total: number;
  totalPages: number;
}) {
  const previousPage = Math.max(page - 1, 1);
  const nextPage = Math.min(page + 1, totalPages);
  const firstRank = total === 0 ? 0 : (page - 1) * leaderboardPageSize + 1;
  const lastRank = Math.min(page * leaderboardPageSize, total);
  const paginationItems = getPaginationItems(page, totalPages);

  return (
    <div className="flex flex-col gap-3 border-t border-[#1a1a1a] px-4 py-4 text-sm text-zinc-300 md:flex-row md:items-center md:justify-between">
      <p>
        Showing {firstRank}-{lastRank} of {total.toLocaleString()}
      </p>
      <nav
        aria-label="Leaderboard pagination"
        className="flex items-center gap-2"
      >
        <Link
          aria-label="Previous page"
          aria-disabled={page <= 1}
          className="grid size-9 place-items-center rounded-md text-zinc-400 hover:bg-[#111111] hover:text-white aria-disabled:pointer-events-none aria-disabled:opacity-35"
          href={`/?page=${previousPage}`}
          tabIndex={page <= 1 ? -1 : undefined}
        >
          <ChevronLeft className="size-4" />
        </Link>
        {paginationItems.map((item, index) =>
          item === "..." ? (
            <span
              className="grid size-9 place-items-center text-slate-400"
              key={`ellipsis-${index}`}
            >
              ...
            </span>
          ) : (
            <Link
              aria-current={item === page ? "page" : undefined}
              className={
                item === page
                  ? "grid size-9 place-items-center rounded-md bg-[#1f1f1f] font-semibold text-white"
                  : "grid size-9 place-items-center rounded-md font-semibold text-zinc-100 hover:bg-[#111111] hover:text-white"
              }
              href={`/?page=${item}`}
              key={item}
            >
              {item}
            </Link>
          ),
        )}
        <Link
          aria-label="Next page"
          aria-disabled={page >= totalPages}
          className="grid size-9 place-items-center rounded-md text-zinc-400 hover:bg-[#111111] hover:text-white aria-disabled:pointer-events-none aria-disabled:opacity-35"
          href={`/?page=${nextPage}`}
          tabIndex={page >= totalPages ? -1 : undefined}
        >
          <ChevronRight className="size-4" />
        </Link>
      </nav>
    </div>
  );
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<HomeSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const page = parsePage(resolvedSearchParams.page);
  const [bagsCategory, bagsMarket] = await Promise.all([
    fetchBagsCategory(),
    fetchBagsMarket({ page, pageSize: leaderboardPageSize }),
  ]);
  const globalStats = buildGlobalStats(bagsCategory);
  const tokens = mapLeaderboardToRows(bagsMarket?.leaderboard) ?? [];
  const trendingRows =
    bagsMarket && bagsMarket.trending.length > 0
      ? bagsMarket.trending.slice(0, 3)
      : [];
  const gainerRows =
    bagsMarket && bagsMarket.topGainers.length > 0
      ? bagsMarket.topGainers.slice(0, 3)
      : [];
  const latestCryptoNews =
    bagsMarket && bagsMarket.latestCryptoNews.length > 0
      ? bagsMarket.latestCryptoNews
      : [];
  const latestBagsSignals =
    bagsMarket && bagsMarket.latestBagsSignals.length > 0
      ? bagsMarket.latestBagsSignals
      : [];
  const insights =
    bagsMarket && bagsMarket.insights.length > 0 ? bagsMarket.insights : [];

  return (
    <main className="min-h-screen bg-[#000000] text-zinc-100" id="top">
      <div className="border-b border-[#1a1a1a] bg-[#000000]">
        <div className="mx-auto flex h-[52px] max-w-[1780px] items-center gap-5 overflow-x-auto px-9 text-xs text-zinc-300">
          {globalStats.map(([label, value, change]) => (
            <p className="shrink-0" key={label}>
              <span className="text-zinc-400">{label}: </span>
              <b className="text-white">{value}</b>{" "}
              {change ? <PositiveText value={change} /> : null}
            </p>
          ))}
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <Button
              className="size-9 border-[#2a2a2a] bg-[#111111] disabled:cursor-not-allowed disabled:opacity-50"
              disabled
              size="icon"
              title="Settings are not available yet"
            >
              <Settings className="size-4" />
            </Button>
            <Button
              className="size-9 border-[#2a2a2a] bg-[#111111] disabled:cursor-not-allowed disabled:opacity-50"
              disabled
              size="icon"
              title="Alerts are not available yet"
            >
              <Bell className="size-4" />
            </Button>
            <Button
              className="h-9 border-[#2a2a2a] bg-[#111111] px-4 text-white disabled:cursor-not-allowed disabled:opacity-50"
              disabled
              title="Authentication is not available yet"
            >
              Login
            </Button>
            <Button
              className="h-9 bg-white px-4 text-slate-950 hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
              disabled
              title="Authentication is not available yet"
            >
              Sign up
            </Button>
          </div>
        </div>
      </div>

      <nav className="border-b border-[#1a1a1a] bg-[#000000]">
        <div className="mx-auto flex h-16 max-w-[1780px] items-center gap-8 px-9">
          <div className="flex items-center gap-3">
            <Image
              alt=""
              className="size-8 invert"
              height={32}
              priority
              src="/assets/logo.svg"
              width={32}
            />
            <span className="text-2xl font-bold tracking-tight text-white">
              astralmarket
            </span>
          </div>
          <div className="hidden items-center gap-8 text-sm font-semibold text-slate-300 lg:flex">
            {navItems.map(([item, href]) => (
              <a className="hover:text-white" href={href} key={item}>
                {item}
              </a>
            ))}
          </div>
          <div className="ml-auto hidden items-center gap-5 text-sm font-semibold md:flex">
            <span className="text-zinc-300">Bags</span>
            <span
              className="cursor-not-allowed text-slate-500"
              title="Watchlist is not available yet"
            >
              Watchlist
            </span>
            <div className="relative w-52">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
              <Input
                className="h-10 border-[#1a1a1a] bg-[#111111] pl-9 text-sm text-slate-100 placeholder:text-slate-500 disabled:cursor-not-allowed disabled:opacity-70"
                disabled
                placeholder="Search coming soon"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded bg-[#1f1f1f] px-2 py-0.5 text-xs text-slate-300">
                /
              </span>
            </div>
          </div>
        </div>
      </nav>

      <div className="mx-auto grid max-w-[1780px] grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 px-6 pb-10 pt-32 lg:px-7">
          <HomepageHighlights
            gainerRows={gainerRows}
            launchCount={
              bagsCategory
                ? bagsCategory.stats.launches.toLocaleString()
                : "recent"
            }
            trendingRows={trendingRows}
          />

          <section className="mt-8" id="leaderboard">
            <div className="mb-5 flex flex-wrap items-center gap-3">
              {categoryTabs.map(([label, Icon], index) => (
                <Button
                  className={
                    index === 0
                      ? "h-9 gap-2 bg-[#1f1f1f] px-4 text-white hover:bg-[#2a2a2a]"
                      : "h-9 gap-2 bg-transparent px-3 text-zinc-300 hover:bg-[#111111] disabled:cursor-not-allowed disabled:opacity-45"
                  }
                  disabled={index !== 0}
                  key={label as string}
                  title={
                    index === 0
                      ? undefined
                      : "Category filtering is not available yet"
                  }
                  variant={index === 0 ? "default" : "ghost"}
                >
                  <Icon className="size-4" />
                  {label as string}
                </Button>
              ))}
              <Button
                className="ml-auto h-9 bg-[#111111] px-4 text-zinc-100 hover:bg-[#1f1f1f] disabled:cursor-not-allowed disabled:opacity-50"
                disabled
                title="Customization is not available yet"
              >
                <Sparkles className="size-4" />
                Customize
              </Button>
            </div>

            <div className="overflow-hidden rounded-lg border border-[#1a1a1a] bg-[#000000]">
              <Table className="min-w-[1190px] table-fixed">
                <colgroup>
                  <col className="w-11" />
                  <col className="w-14" />
                  <col />
                  <col className="w-40" />
                  <col className="w-24" />
                  <col className="w-24" />
                  <col className="w-24" />
                  <col className="w-36" />
                  <col className="w-36" />
                  <col className="w-44" />
                </colgroup>
                <TableHeader>
                  <TableRow className="border-[#1f1f1f] hover:bg-transparent">
                    {leaderboardColumns.map((column) => (
                      <TableHead
                        className={`h-11 text-xs font-bold text-zinc-100 ${column.className}`}
                        key={column.label}
                      >
                        {column.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tokens.length === 0 ? (
                    <TableRow className="border-[#1a1a1a] hover:bg-transparent">
                      <TableCell
                        className="h-32 px-3 text-center text-sm text-slate-500"
                        colSpan={10}
                      >
                        No market-cap rows available.
                      </TableCell>
                    </TableRow>
                  ) : (
                    tokens.map((token) => (
                      <TableRow
                        className="h-[69px] border-[#1a1a1a] hover:bg-[#0a0a0a]"
                        key={`${token.symbol}-${token.tokenMint}`}
                      >
                        <TableCell className="w-11 px-3">
                          <Star className="size-4 text-zinc-100" />
                        </TableCell>
                        <TableCell className="w-14 px-3 font-mono text-zinc-100">
                          {token.rank}
                        </TableCell>
                        <TableCell className="px-3">
                          <div className="flex min-w-0 items-center gap-3">
                            {token.image ? (
                              <Image
                                alt=""
                                className="size-7 shrink-0 rounded-full object-cover"
                                height={28}
                                unoptimized
                                src={token.image}
                                width={28}
                              />
                            ) : (
                              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-950">
                                {token.badge}
                              </span>
                            )}
                            <div className="min-w-0 truncate">
                              <Link
                                className="font-semibold text-zinc-100 hover:text-white"
                                href={`/coins/${encodeURIComponent(token.tokenMint)}`}
                              >
                                {token.name}
                              </Link>{" "}
                              <span className="text-sm text-zinc-400">
                                {token.symbol}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="w-40 px-3 text-center font-mono tabular-nums text-zinc-50">
                          {token.price}
                        </TableCell>
                        <TableCell className="w-24 px-3 text-center text-sm tabular-nums">
                          <ChangeText value={token.h1} />
                        </TableCell>
                        <TableCell className="w-24 px-3 text-center text-sm tabular-nums">
                          <ChangeText value={token.h24} />
                        </TableCell>
                        <TableCell className="w-24 px-3 text-center text-sm tabular-nums">
                          <ChangeText value={token.d7} />
                        </TableCell>
                        <TableCell className="w-36 px-3 text-center font-mono tabular-nums text-zinc-50">
                          {token.volume24h}
                        </TableCell>
                        <TableCell className="w-36 px-3 text-center font-mono tabular-nums text-zinc-50">
                          {token.marketCap}
                        </TableCell>
                        <TableCell className="w-44 px-3">
                          <Sparkline
                            height={44}
                            points={token.sparkline}
                            width={136}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              {bagsMarket?.pagination ? (
                <PaginationControls
                  page={bagsMarket.pagination.page}
                  total={bagsMarket.pagination.total}
                  totalPages={bagsMarket.pagination.totalPages}
                />
              ) : null}
            </div>
          </section>

          <LatestNewsGallery news={latestCryptoNews} />
        </div>

        <RightRail
          insights={insights}
          latestBagsSignals={latestBagsSignals}
          latestCryptoNews={latestCryptoNews}
        />
      </div>

      <a
        aria-label="Back to top"
        className="fixed bottom-7 right-7 grid size-11 place-items-center rounded-lg bg-[#111111] text-zinc-100 hover:bg-[#1f1f1f]"
        href="#top"
      >
        <ArrowUp className="size-5" />
      </a>

      <div className="fixed left-5 top-[665px] hidden size-10 place-items-center rounded-full border border-red-400/40 bg-red-400/10 text-white lg:grid">
        <Gauge className="size-5" />
      </div>

      <SiteFooter />
    </main>
  );
}
