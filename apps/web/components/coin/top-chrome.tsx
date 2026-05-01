import { Bell, Search, Settings } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { BagsCoinDetailData } from "@/lib/bags-api";
import {
  formatStatus,
  getPoolLabel,
  shortenKey,
} from "@/lib/coin-detail-mappers";
import { formatMarketCap, formatPercent } from "@/lib/market-format";

export function TopChrome({ coin }: { coin: BagsCoinDetailData | null }) {
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
          <div className="ml-auto hidden w-56 items-center md:flex">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
              <Input
                className="h-10 border-[#1a1a1a] bg-[#111111] pl-9 text-sm text-zinc-100 placeholder:text-zinc-500 disabled:cursor-not-allowed disabled:opacity-70"
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
