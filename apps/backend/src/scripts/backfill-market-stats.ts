import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const source = "bags";
const defaultLookbackDays = 7;

const parseLookbackDays = () => {
  const rawValue = process.argv
    .find((argument) => argument.startsWith("--days="))
    ?.split("=")
    .at(1);
  const value = Number(rawValue ?? defaultLookbackDays);

  return Number.isInteger(value) && value > 0 ? value : defaultLookbackDays;
};

const main = async () => {
  const lookbackDays = parseLookbackDays();
  const capturedAfter = new Date(
    Date.now() - lookbackDays * 24 * 60 * 60 * 1000,
  );

  await prisma.marketStatsSnapshot.deleteMany({
    where: {
      source,
      capturedAt: {
        gte: capturedAfter,
      },
    },
  });

  const inserted = await prisma.$executeRaw(Prisma.sql`
    INSERT INTO "MarketStatsSnapshot" (
      "id",
      "source",
      "coins",
      "pools",
      "totalMarketCap",
      "totalVolume24h",
      "capturedAt"
    )
    SELECT
      CONCAT('market-stats:', md5(CONCAT(${source}, ':', "capturedAt"::text))) AS "id",
      ${source} AS "source",
      COUNT(DISTINCT "tokenMint")::int AS "coins",
      COUNT(DISTINCT CASE
        WHEN "migrationStatus" IN ('dbc', 'migrated') THEN "tokenMint"
      END)::int AS "pools",
      ROUND(COALESCE(SUM("marketCap") FILTER (
        WHERE "marketCap" IS NOT NULL
      ), 0)::numeric, 2)::double precision AS "totalMarketCap",
      ROUND(COALESCE(SUM("volume24h") FILTER (
        WHERE "volume24h" IS NOT NULL
      ), 0)::numeric, 2)::double precision AS "totalVolume24h",
      "capturedAt"
    FROM "TokenMarketSnapshot"
    WHERE "capturedAt" >= ${capturedAfter}
    GROUP BY "capturedAt"
    ORDER BY "capturedAt" ASC
  `);

  const latest = await prisma.marketStatsSnapshot.findFirst({
    where: {
      source,
    },
    orderBy: {
      capturedAt: "desc",
    },
    select: {
      capturedAt: true,
      totalMarketCap: true,
      totalVolume24h: true,
    },
  });

  console.log(
    JSON.stringify(
      {
        success: true,
        response: {
          inserted,
          latest,
          lookbackDays,
        },
      },
      null,
      2,
    ),
  );
};

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
