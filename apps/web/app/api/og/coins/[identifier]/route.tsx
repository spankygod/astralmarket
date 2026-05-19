/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/og";

import { fetchBagsCoin } from "@/lib/bags-api";
import { formatMarketCap, formatPercent } from "@/lib/market-format";

type RouteProps = {
  params: Promise<{
    identifier: string;
  }>;
};

const size = 1080;
const cacheControl = "public, s-maxage=3600, stale-while-revalidate=86400";

const getDisplaySymbol = (name: string, symbol: string) =>
  (symbol.trim() || name).slice(0, 24);

const truncateText = (value: string, maxLength: number) =>
  value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;

const getMarketRank = (
  coin: NonNullable<Awaited<ReturnType<typeof fetchBagsCoin>>>,
) =>
  coin.leaderboardRanks?.find((rank) => rank.kind === "market") ??
  coin.leaderboardRanks?.at(0);

const getChangeColor = (value: string) => {
  if (value.startsWith("-")) {
    return "#f87171";
  }

  if (value === "-") {
    return "#94a3b8";
  }

  return "#22c55e";
};

const getCardTimestamp = () =>
  new Date().toLocaleString("en-US", {
    day: "numeric",
    hour: "numeric",
    hour12: true,
    minute: "2-digit",
    month: "long",
    timeZone: "Asia/Manila",
    year: "numeric",
  });

function TrendArrow({
  color,
  negative,
}: {
  color: string;
  negative: boolean;
}) {
  return (
    <svg
      height="68"
      style={{ marginLeft: 22, marginTop: negative ? 18 : 4 }}
      viewBox="0 0 44 68"
      width="44"
    >
      <path
        d={negative ? "M22 12V52M7 37l15 15 15-15" : "M22 56V16M7 31l15-15 15 15"}
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="7"
      />
    </svg>
  );
}

function StatRow({
  label,
  top,
  value,
}: {
  label: string;
  top: number;
  value: string;
}) {
  return (
    <div
      style={{
        alignItems: "baseline",
        display: "flex",
        left: 86,
        position: "absolute",
        top,
      }}
    >
      <div
        style={{
          color: "#8b95a5",
          fontSize: 36,
          fontWeight: 400,
          lineHeight: 1,
          width: 274,
        }}
      >
        {label}
      </div>
      <div
        style={{
          color: "#ffffff",
          fontSize: 42,
          fontWeight: 400,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
    </div>
  );
}

export async function GET(request: Request, { params }: RouteProps) {
  const { identifier } = await params;
  const coin = await fetchBagsCoin(identifier);
  const backgroundImage = new URL("/assets/sharecard.jpg", request.url).toString();

  if (!coin) {
    return new ImageResponse(
      (
        <div
          style={{
            backgroundColor: "#000000",
            display: "flex",
            height: "100%",
            position: "relative",
            width: "100%",
          }}
        >
          <img
            alt=""
            height={size}
            src={backgroundImage}
            style={{ height: "100%", left: 0, position: "absolute", top: 0, width: "100%" }}
            width={size}
          />
        </div>
      ),
      {
        headers: {
          "Cache-Control": cacheControl,
        },
        height: size,
        width: size,
      },
    );
  }

  const symbol = getDisplaySymbol(coin.token.name, coin.token.symbol);
  const rank = getMarketRank(coin);
  const rankLabel = rank ? `Rank ${rank.rank}` : "Rank --";
  const percent = formatPercent(coin.market.change24h);
  const changeColor = getChangeColor(percent);
  const hasPercent = percent !== "-";
  const negative = percent.startsWith("-");

  return new ImageResponse(
    (
      <div
        style={{
          backgroundColor: "#000000",
          color: "#ffffff",
          display: "flex",
          fontFamily: "Poppins, Arial, sans-serif",
          height: "100%",
          position: "relative",
          width: "100%",
        }}
      >
        <img
          alt=""
          height={size}
          src={backgroundImage}
          style={{ height: "100%", left: 0, position: "absolute", top: 0, width: "100%" }}
          width={size}
        />

        <div
          style={{
            color: "#ffffff",
            fontSize: 74,
            fontWeight: 800,
            left: 700,
            lineHeight: 1,
            position: "absolute",
            textAlign: "center",
            top: 58,
            width: 360,
          }}
        >
          {rankLabel}
        </div>

        <div
          style={{
            color: "#ffffff",
            fontSize: 54,
            fontWeight: 700,
            left: 86,
            lineHeight: 1.05,
            position: "absolute",
            top: 276,
            width: 650,
          }}
        >
          {symbol}
        </div>

        <div
          style={{
            color: "#8b95a5",
            fontSize: 34,
            fontWeight: 400,
            left: 86,
            lineHeight: 1.25,
            position: "absolute",
            top: 338,
            width: 650,
          }}
        >
          {truncateText(coin.token.name, 62)}
        </div>

        <div
          style={{
            alignItems: "center",
            color: changeColor,
            display: "flex",
            fontSize: hasPercent ? 88 : 64,
            fontWeight: 700,
            left: 86,
            lineHeight: 1,
            position: "absolute",
            top: 410,
          }}
        >
          <div>{hasPercent ? percent : "24h pending"}</div>
          {hasPercent ? <TrendArrow color={changeColor} negative={negative} /> : null}
        </div>

        <StatRow
          label="24h Volume"
          top={682}
          value={formatMarketCap(coin.market.volume24h)}
        />
        <StatRow
          label="Market Cap"
          top={750}
          value={formatMarketCap(coin.market.marketCap)}
        />

        <div
          style={{
            color: "#8b95a5",
            fontSize: 28,
            fontWeight: 400,
            left: 86,
            lineHeight: 1,
            position: "absolute",
            top: 940,
          }}
        >
          {getCardTimestamp()}
        </div>
      </div>
    ),
    {
      headers: {
        "Cache-Control": cacheControl,
      },
      height: size,
      width: size,
    },
  );
}
