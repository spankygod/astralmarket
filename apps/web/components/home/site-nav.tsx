import { Search } from "lucide-react";
import Image from "next/image";

import { Input } from "@/components/ui/input";

export function SiteNav() {
  return (
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
  );
}
