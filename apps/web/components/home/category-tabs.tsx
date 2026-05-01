import {
  Flame,
  Grid2X2,
  LayoutList,
  PanelRight,
  Shield,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { HomeLeaderboardCategory } from "@/lib/home-market-mappers";

const categoryTabs: Array<{
  category?: HomeLeaderboardCategory;
  icon: LucideIcon;
  label: string;
}> = [
  { category: "all", icon: Grid2X2, label: "All" },
  { category: "top-earners", icon: LayoutList, label: "Top Earners" },
  { icon: Shield, label: "Migrated Pools" },
  { icon: PanelRight, label: "Live DBC" },
  { icon: Flame, label: "BagsApp Ecosystem" },
  { icon: Flame, label: "New Launches" },
  { icon: Flame, label: "High Impact" },
];

const getCategoryHref = (category: HomeLeaderboardCategory) =>
  category === "all" ? "/" : `/?category=${category}#leaderboard`;

export function CategoryTabs({
  activeCategory,
}: {
  activeCategory: HomeLeaderboardCategory;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-3">
      {categoryTabs.map(({ category, icon: Icon, label }) =>
        category ? (
          <Link
            aria-current={activeCategory === category ? "page" : undefined}
            className={
              activeCategory === category
                ? "inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#1f1f1f] px-4 text-sm font-medium whitespace-nowrap text-white transition-all outline-none select-none hover:bg-[#2a2a2a] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                : "inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-transparent bg-transparent px-3 text-sm font-medium whitespace-nowrap text-zinc-300 transition-all outline-none select-none hover:bg-[#111111] hover:text-white focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            }
            href={getCategoryHref(category)}
            key={label}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        ) : (
          <Button
            className={
              "h-9 gap-2 bg-transparent px-3 text-zinc-300 hover:bg-[#111111] disabled:cursor-not-allowed disabled:opacity-45"
            }
            disabled
            key={label}
            title="Category filtering is not available yet"
            variant="ghost"
          >
            <Icon className="size-4" />
            {label}
          </Button>
        ),
      )}
      <Button
        className="ml-auto h-9 bg-[#111111] px-4 text-zinc-100 hover:bg-[#1f1f1f] disabled:cursor-not-allowed disabled:opacity-50"
        disabled
        title="Customization is not available yet"
      >
        <Sparkles className="size-4" />
        Customize
      </Button>
    </div>
  );
}
