import dotenv from "dotenv";
import { z } from "zod";

const optionalNonEmptyString = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(1).optional(),
);

const envSchema = z.object({
  ADMIN_SYNC_SECRET: optionalNonEmptyString,
  APP_NAME: z.string().min(1).default("Astralmarket API"),
  BAGS_API_BASE_URL: z
    .string()
    .url()
    .default("https://public-api-v2.bags.fm/api/v1"),
  BAGS_API_KEY: optionalNonEmptyString,
  BAGS_SYNC_ENABLED: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
  BAGS_SYNC_INTERVAL_MINUTES: z.coerce.number().int().positive().default(30),
  BAGS_SYNC_ON_START: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  HOST: z.string().default("0.0.0.0"),
  FMP_NEWS_DAILY_REQUEST_LIMIT: z.coerce.number().int().positive().default(200),
  MARKET_SNAPSHOT_RETENTION_DAYS: z.coerce
    .number()
    .int()
    .positive()
    .default(7),
  NEWS_API_KEY: optionalNonEmptyString,
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  PRICE_QUOTE_MINT: z
    .string()
    .default("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
  SOLANA_RPC_URL: z
    .string()
    .url()
    .default("https://api.mainnet-beta.solana.com"),
});

export type AppConfig = {
  adminSyncSecret?: string;
  appName: string;
  bagsApiBaseUrl: string;
  bagsApiKey?: string;
  bagsSyncEnabled: boolean;
  bagsSyncIntervalMinutes: number;
  bagsSyncOnStart: boolean;
  fmpNewsDailyRequestLimit: number;
  host: string;
  marketSnapshotRetentionDays: number;
  newsApiKey?: string;
  nodeEnv: "development" | "test" | "production";
  port: number;
  priceQuoteMint: string;
  solanaRpcUrl: string;
  isDevelopment: boolean;
  isProduction: boolean;
  isTest: boolean;
};

let hasLoadedEnvFile = false;

function loadEnvFile(): void {
  if (hasLoadedEnvFile) {
    return;
  }

  dotenv.config();
  hasLoadedEnvFile = true;
}

export function buildAppConfig(
  env: NodeJS.ProcessEnv = process.env,
): AppConfig {
  loadEnvFile();

  const parsed = envSchema.parse(env);

  return {
    adminSyncSecret: parsed.ADMIN_SYNC_SECRET,
    appName: parsed.APP_NAME,
    bagsApiBaseUrl: parsed.BAGS_API_BASE_URL,
    bagsApiKey: parsed.BAGS_API_KEY,
    bagsSyncEnabled: parsed.BAGS_SYNC_ENABLED,
    bagsSyncIntervalMinutes: parsed.BAGS_SYNC_INTERVAL_MINUTES,
    bagsSyncOnStart: parsed.BAGS_SYNC_ON_START,
    fmpNewsDailyRequestLimit: parsed.FMP_NEWS_DAILY_REQUEST_LIMIT,
    host: parsed.HOST,
    marketSnapshotRetentionDays: parsed.MARKET_SNAPSHOT_RETENTION_DAYS,
    newsApiKey: parsed.NEWS_API_KEY,
    nodeEnv: parsed.NODE_ENV,
    port: parsed.PORT,
    priceQuoteMint: parsed.PRICE_QUOTE_MINT,
    solanaRpcUrl: parsed.SOLANA_RPC_URL,
    isDevelopment: parsed.NODE_ENV === "development",
    isProduction: parsed.NODE_ENV === "production",
    isTest: parsed.NODE_ENV === "test",
  };
}

export const env = buildAppConfig();
