import { ArrowUp } from "lucide-react";

import { CategoryTabs } from "@/components/home/category-tabs";
import { LeaderboardTable } from "@/components/home/leaderboard-table";
import { RightRail } from "@/components/home/right-rail";
import { SiteFooter } from "@/components/home/site-footer";
import { SiteNav } from "@/components/home/site-nav";
import { TopStatsBar } from "@/components/home/top-stats-bar";
import { HomepageHighlights } from "@/components/homepage-highlights";
import { LatestNewsGallery } from "@/components/latest-news-gallery";
import { fetchBagsCategory, fetchBagsMarket } from "@/lib/bags-api";
import {
  buildGlobalStats,
  leaderboardPageSize,
  mapLeaderboardToRows,
  parseLeaderboardCategory,
  parsePage,
} from "@/lib/home-market-mappers";

type HomeSearchParams = {
  category?: string | string[];
  page?: string | string[];
};

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<HomeSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const activeCategory = parseLeaderboardCategory(
    resolvedSearchParams.category,
  );
  const page =
    activeCategory === "all" ? parsePage(resolvedSearchParams.page) : 1;
  const [bagsCategory, bagsMarket] = await Promise.all([
    fetchBagsCategory(),
    fetchBagsMarket({ page, pageSize: leaderboardPageSize }),
  ]);

  const globalStats = buildGlobalStats(bagsCategory);
  const tableSource =
    activeCategory === "top-earners"
      ? bagsMarket?.topEarners
      : bagsMarket?.leaderboard;
  const tokens =
    mapLeaderboardToRows(tableSource, {
      metricColumn: activeCategory === "top-earners" ? "metric" : "marketCap",
    }) ?? [];
  const trendingRows = (bagsMarket?.trending ?? []).slice(0, 3);
  const gainerRows = (bagsMarket?.topGainers ?? []).slice(0, 3);
  const latestCryptoNews = bagsMarket?.latestCryptoNews ?? [];
  const latestBagsSignals = bagsMarket?.latestBagsSignals ?? [];
  const insights = bagsMarket?.insights ?? [];

  return (
    <main className="min-h-screen bg-[#000000] text-zinc-100" id="top">
      <TopStatsBar stats={globalStats} />
      <SiteNav />

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
            <CategoryTabs activeCategory={activeCategory} />
            <LeaderboardTable
              pageSize={leaderboardPageSize}
              pagination={
                activeCategory === "all" ? bagsMarket?.pagination : undefined
              }
              tokens={tokens}
              variant={
                activeCategory === "top-earners" ? "top-earners" : "market"
              }
            />
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

      <SiteFooter />
    </main>
  );
}
