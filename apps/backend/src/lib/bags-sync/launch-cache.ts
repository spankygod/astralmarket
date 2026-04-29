import type { PrismaClient } from "@prisma/client";

import type { BagsLaunchView } from "../bags-market";
import { toJson } from "./shared";

export const upsertLaunch = async (
  prisma: PrismaClient,
  launch: BagsLaunchView,
) => {
  await prisma.bagsToken.upsert({
    where: {
      tokenMint: launch.tokenMint,
    },
    create: {
      tokenMint: launch.tokenMint,
      name: launch.name,
      symbol: launch.symbol,
      description: launch.description,
      image: launch.image,
      status: launch.status,
      migrationStatus: launch.migrationStatus,
      website: launch.website,
      twitter: launch.twitter,
      uri: launch.uri,
      launchSignature: launch.launchSignature,
      raw: toJson(launch),
    },
    update: {
      name: launch.name,
      symbol: launch.symbol,
      description: launch.description,
      image: launch.image,
      status: launch.status,
      migrationStatus: launch.migrationStatus,
      website: launch.website,
      twitter: launch.twitter,
      uri: launch.uri,
      launchSignature: launch.launchSignature,
      raw: toJson(launch),
    },
  });

  if (launch.pool) {
    await prisma.bagsPool.upsert({
      where: {
        tokenMint: launch.tokenMint,
      },
      create: {
        tokenMint: launch.tokenMint,
        dbcConfigKey: launch.pool.dbcConfigKey,
        dbcPoolKey: launch.pool.dbcPoolKey,
        dammV2PoolKey: launch.pool.dammV2PoolKey,
        raw: toJson(launch.pool),
      },
      update: {
        dbcConfigKey: launch.pool.dbcConfigKey,
        dbcPoolKey: launch.pool.dbcPoolKey,
        dammV2PoolKey: launch.pool.dammV2PoolKey,
        raw: toJson(launch.pool),
      },
    });
  }
};
