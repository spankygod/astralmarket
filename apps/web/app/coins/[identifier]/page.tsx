import type { Metadata } from "next";

import { CoinSummary } from "@/components/coin/coin-summary";
import { EmptyCoin } from "@/components/coin/empty-coin";
import { InsightsRail } from "@/components/coin/insights-rail";
import { MarketChart } from "@/components/coin/market-chart";
import { TopChrome } from "@/components/coin/top-chrome";
import { fetchBagsCoin } from "@/lib/bags-api";

type CoinPageProps = {
  params: Promise<{
    identifier: string;
  }>;
};

const siteUrl = "https://www.astralmarket.xyz";
const fallbackShareImage = `${siteUrl}/assets/sharecard.jpg`;

const getDisplaySymbol = (coin: Awaited<ReturnType<typeof fetchBagsCoin>>) => {
  if (!coin) {
    return "";
  }

  return coin.token.symbol.trim() || coin.token.name;
};

const getRankLabel = (coin: Awaited<ReturnType<typeof fetchBagsCoin>>) => {
  const marketRank =
    coin?.leaderboardRanks?.find((rank) => rank.kind === "market") ??
    coin?.leaderboardRanks?.at(0);

  return marketRank ? `ranked #${marketRank.rank}` : "tracked";
};

export async function generateMetadata({
  params,
}: CoinPageProps): Promise<Metadata> {
  const { identifier } = await params;
  const coin = await fetchBagsCoin(identifier);

  if (!coin) {
    return {
      title: "Bags token not found | Astralmarket",
      description: "Search Bags tokens, market data, and launch context.",
      alternates: {
        canonical: `${siteUrl}/coins/${encodeURIComponent(identifier)}`,
      },
    };
  }

  const symbol = getDisplaySymbol(coin);
  const title = `${coin.token.name} (${symbol}) | Astralmarket`;
  const rankLabel = getRankLabel(coin);
  const description = `${coin.token.name} (${symbol}) is ${rankLabel} on @0xastralmarket. Discover tokens on the bags ecosystem by using the platform!`;
  const image = coin.token.image || coin.market.dexImage || fallbackShareImage;
  const canonicalUrl = `${siteUrl}/coins/${encodeURIComponent(
    coin.token.tokenMint,
  )}`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      images: [
        {
          alt: title,
          url: image,
        },
      ],
      siteName: "Astralmarket",
      type: "website",
      url: canonicalUrl,
    },
    twitter: {
      card: "summary_large_image",
      creator: "@0xastralmarket",
      description,
      images: [image],
      site: "@0xastralmarket",
      title,
    },
  };
}

export default async function CoinsPage({ params }: CoinPageProps) {
  const { identifier } = await params;
  const coin = await fetchBagsCoin(identifier);

  if (!coin) {
    return <EmptyCoin identifier={identifier} />;
  }

  return (
    <main className="min-h-screen bg-[#000000] text-zinc-100">
      <TopChrome coin={coin} />
      <div className="mx-auto grid max-w-[1780px] grid-cols-1 lg:grid-cols-[430px_minmax(0,1fr)] 2xl:grid-cols-[430px_minmax(0,1fr)_300px]">
        <CoinSummary coin={coin} />
        <MarketChart coin={coin} />
        <InsightsRail coin={coin} />
      </div>
    </main>
  );
}
