import { BookOpen, Info, Sparkles, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { BagsCoinDetailData } from "@/lib/bags-api";
import { getPoolLabel, getQuoteSummary } from "@/lib/coin-detail-mappers";
import { formatMarketCap } from "@/lib/market-format";

export function InsightsRail({ coin }: { coin: BagsCoinDetailData }) {
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
