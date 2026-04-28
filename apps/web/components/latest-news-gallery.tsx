"use client";

import { ChevronLeft, ChevronRight, Newspaper } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import type { BagsMarketNewsItem } from "@/lib/bags-api";

const getNewsSourceLabel = (source: string) => {
  if (source === "fmp_crypto_news") {
    return "Crypto news";
  }

  return "Bags launch feed";
};

export function LatestNewsGallery({ news }: { news: BagsMarketNewsItem[] }) {
  const railRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(news.length > 3);
  const visibleNews = news.slice(0, 10);

  const updateScrollState = () => {
    const rail = railRef.current;

    if (!rail) {
      return;
    }

    setCanScrollLeft(rail.scrollLeft > 8);
    setCanScrollRight(
      rail.scrollLeft + rail.clientWidth < rail.scrollWidth - 8,
    );
  };

  const scrollGallery = (direction: "left" | "right") => {
    const rail = railRef.current;

    if (!rail) {
      return;
    }

    rail.scrollBy({
      behavior: "smooth",
      left:
        direction === "left"
          ? -rail.clientWidth * 0.82
          : rail.clientWidth * 0.82,
    });

    window.setTimeout(updateScrollState, 260);
  };

  useEffect(() => {
    updateScrollState();
    window.addEventListener("resize", updateScrollState);

    return () => window.removeEventListener("resize", updateScrollState);
  }, [visibleNews.length]);

  if (news.length === 0) {
    return null;
  }

  return (
    <section className="mt-8" id="crypto-news">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-bold text-white">
          <Newspaper className="size-4 text-zinc-400" />
          Latest Crypto News
        </h2>
      </div>

      <div className="relative">
        <button
          aria-label="Previous news"
          className="absolute left-2 top-1/2 z-10 grid size-9 -translate-y-1/2 place-items-center rounded-full border border-[#2a2a2a] bg-black/85 text-zinc-100 shadow-lg transition hover:bg-[#111111] disabled:pointer-events-none disabled:opacity-0"
          disabled={!canScrollLeft}
          onClick={() => scrollGallery("left")}
          type="button"
        >
          <ChevronLeft className="size-5" />
        </button>

        <div
          className="-mx-6 snap-x snap-mandatory overflow-x-auto scroll-smooth px-6 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] lg:-mx-7 lg:px-7 [&::-webkit-scrollbar]:hidden"
          onScroll={updateScrollState}
          ref={railRef}
        >
          <div className="grid auto-cols-[minmax(260px,82vw)] grid-flow-col gap-3 sm:auto-cols-[minmax(320px,42vw)] xl:auto-cols-[minmax(360px,30vw)]">
            {visibleNews.map((item, index) => (
              <article
                className="min-h-[176px] snap-start scroll-ml-6 rounded-lg border border-[#1a1a1a] bg-[#050505] p-4 transition-colors hover:border-[#2a2a2a] hover:bg-[#080808] lg:scroll-ml-7"
                key={`${item.source}-${item.href}-${index}`}
              >
                <p className="text-xs text-slate-500">
                  {getNewsSourceLabel(item.source)}
                </p>
                <h3 className="mt-3 line-clamp-2 text-sm font-semibold leading-5 text-slate-100">
                  <Link className="hover:text-white" href={item.href}>
                    {item.headline}
                  </Link>
                </h3>
                <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-500">
                  {item.detail}
                </p>
              </article>
            ))}
          </div>
        </div>

        <button
          aria-label="Next news"
          className="absolute right-2 top-1/2 z-10 grid size-9 -translate-y-1/2 place-items-center rounded-full border border-[#2a2a2a] bg-black/85 text-zinc-100 shadow-lg transition hover:bg-[#111111] disabled:pointer-events-none disabled:opacity-0"
          disabled={!canScrollRight}
          onClick={() => scrollGallery("right")}
          type="button"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>
    </section>
  );
}
