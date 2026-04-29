import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  BagsMarketPagination,
  BagsTableRow,
} from "@/lib/home-market-mappers";

import { ChangeText } from "./market-text";
import { Sparkline } from "./sparkline";

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

const topEarnersColumns = [
  { label: " ", className: "w-11 px-3" },
  { label: "#", className: "w-14 px-3 text-left" },
  { label: "Token", className: "min-w-[280px] px-3 text-left" },
  { label: "Lifetime Fees", className: "w-44 px-3 text-center" },
  { label: "Amount SOL to USDC", className: "w-52 px-3 text-center" },
];

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
  pageSize,
  pagination,
}: {
  pageSize: number;
  pagination: BagsMarketPagination;
}) {
  const previousPage = Math.max(pagination.page - 1, 1);
  const nextPage = Math.min(pagination.page + 1, pagination.totalPages);
  const firstRank =
    pagination.total === 0 ? 0 : (pagination.page - 1) * pageSize + 1;
  const lastRank = Math.min(pagination.page * pageSize, pagination.total);
  const paginationItems = getPaginationItems(
    pagination.page,
    pagination.totalPages,
  );

  return (
    <div className="flex flex-col gap-3 border-t border-[#1a1a1a] px-4 py-4 text-sm text-zinc-300 md:flex-row md:items-center md:justify-between">
      <p>
        Showing {firstRank}-{lastRank} of {pagination.total.toLocaleString()}
      </p>
      <nav
        aria-label="Leaderboard pagination"
        className="flex items-center gap-2"
      >
        <Link
          aria-label="Previous page"
          aria-disabled={pagination.page <= 1}
          className="grid size-9 place-items-center rounded-md text-zinc-400 hover:bg-[#111111] hover:text-white aria-disabled:pointer-events-none aria-disabled:opacity-35"
          href={`/?page=${previousPage}`}
          tabIndex={pagination.page <= 1 ? -1 : undefined}
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
              aria-current={item === pagination.page ? "page" : undefined}
              className={
                item === pagination.page
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
          aria-disabled={pagination.page >= pagination.totalPages}
          className="grid size-9 place-items-center rounded-md text-zinc-400 hover:bg-[#111111] hover:text-white aria-disabled:pointer-events-none aria-disabled:opacity-35"
          href={`/?page=${nextPage}`}
          tabIndex={pagination.page >= pagination.totalPages ? -1 : undefined}
        >
          <ChevronRight className="size-4" />
        </Link>
      </nav>
    </div>
  );
}

export function LeaderboardTable({
  metricColumnLabel = "Market Cap",
  pageSize,
  pagination,
  tokens,
  variant = "market",
}: {
  metricColumnLabel?: string;
  pageSize: number;
  pagination?: BagsMarketPagination;
  tokens: BagsTableRow[];
  variant?: "market" | "top-earners";
}) {
  const isTopEarners = variant === "top-earners";
  const columns = isTopEarners
    ? topEarnersColumns
    : leaderboardColumns.map((column) =>
        column.label === "Market Cap"
          ? { ...column, label: metricColumnLabel }
          : column,
      );
  const emptyMessage = isTopEarners
    ? "No top-earner rows available."
    : "No market-cap rows available.";

  return (
    <div className="overflow-hidden rounded-lg border border-[#1a1a1a] bg-[#000000]">
      <Table
        className={
          isTopEarners
            ? "min-w-[760px] table-fixed"
            : "min-w-[1190px] table-fixed"
        }
      >
        {isTopEarners ? (
          <colgroup>
            <col className="w-11" />
            <col className="w-14" />
            <col />
            <col className="w-44" />
            <col className="w-52" />
          </colgroup>
        ) : (
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
        )}
        <TableHeader>
          <TableRow className="border-[#1f1f1f] hover:bg-transparent">
            {columns.map((column) => (
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
                colSpan={columns.length}
              >
                {emptyMessage}
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
                {isTopEarners ? (
                  <>
                    <TableCell className="w-44 px-3 text-center font-mono tabular-nums text-zinc-50">
                      {token.lifetimeFees}
                    </TableCell>
                    <TableCell className="w-52 px-3 text-center font-mono tabular-nums text-zinc-50">
                      {token.solToUsdcAmount}
                    </TableCell>
                  </>
                ) : (
                  <>
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
                  </>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      {pagination ? (
        <PaginationControls pageSize={pageSize} pagination={pagination} />
      ) : null}
    </div>
  );
}
