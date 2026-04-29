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
