import type { PrismaClient } from "@prisma/client";

import {
  creatorSelect,
  detailSnapshotSelect,
  latestSnapshotPayloadSelect,
  toJson,
  tokenToLaunchView,
  tokenWithPoolSelect,
  type TokenWithDetails,
} from "./shared";

const maxCoinDetailSnapshots = 336;

export const findCachedToken = async (
  prisma: PrismaClient,
  identifier: string,
): Promise<TokenWithDetails | null> => {
  const normalized = decodeURIComponent(identifier).trim();
  const slug = normalized
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-|-$/gu, "");
  const tokens = await prisma.bagsToken.findMany({
    select: tokenWithPoolSelect,
    where: {
      OR: [
        { tokenMint: { equals: normalized, mode: "insensitive" } },
        { symbol: { equals: normalized, mode: "insensitive" } },
        { name: { equals: normalized, mode: "insensitive" } },
      ],
    },
    take: 25,
  });

  const token =
    tokens.find(
      (token) =>
        token.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/gu, "-")
          .replace(/^-|-$/gu, "") === slug,
    ) ??
    tokens.at(0) ??
    null;

  if (!token) {
    return null;
  }

  const [creators, snapshots, latestSnapshot] = await Promise.all([
    prisma.tokenCreator.findMany({
      where: {
        tokenMint: token.tokenMint,
      },
      select: creatorSelect,
    }),
    prisma.tokenMarketSnapshot.findMany({
      where: {
        tokenMint: token.tokenMint,
      },
      orderBy: {
        capturedAt: "desc",
      },
      take: maxCoinDetailSnapshots,
      select: detailSnapshotSelect,
    }),
    prisma.tokenMarketSnapshot.findFirst({
      where: {
        tokenMint: token.tokenMint,
      },
      orderBy: {
        capturedAt: "desc",
      },
      select: latestSnapshotPayloadSelect,
    }),
  ]);

  return {
    ...token,
    creators,
    snapshots: snapshots.map((snapshot, index) => ({
      ...snapshot,
      rawQuote: index === 0 ? latestSnapshot?.rawQuote ?? null : null,
    })),
  };
};

export const upsertCachedCreators = async (
  prisma: PrismaClient,
  tokenMint: string,
  creators: Array<Record<string, unknown>>,
) => {
  await Promise.all(
    creators.map((creator, index) =>
      prisma.tokenCreator.upsert({
        where: {
          tokenMint_wallet: {
            tokenMint,
            wallet:
              typeof creator["wallet"] === "string"
                ? creator["wallet"]
                : `${tokenMint}:creator:${index}`,
          },
        },
        create: {
          tokenMint,
          wallet:
            typeof creator["wallet"] === "string" ? creator["wallet"] : null,
          username:
            typeof creator["username"] === "string"
              ? creator["username"]
              : null,
          pfp: typeof creator["pfp"] === "string" ? creator["pfp"] : null,
          provider:
            typeof creator["provider"] === "string"
              ? creator["provider"]
              : null,
          providerUsername:
            typeof creator["providerUsername"] === "string"
              ? creator["providerUsername"]
              : null,
          twitterUsername:
            typeof creator["twitterUsername"] === "string"
              ? creator["twitterUsername"]
              : null,
          bagsUsername:
            typeof creator["bagsUsername"] === "string"
              ? creator["bagsUsername"]
              : null,
          royaltyBps:
            typeof creator["royaltyBps"] === "number"
              ? creator["royaltyBps"]
              : null,
          isCreator:
            typeof creator["isCreator"] === "boolean"
              ? creator["isCreator"]
              : null,
          isAdmin:
            typeof creator["isAdmin"] === "boolean" ? creator["isAdmin"] : null,
          raw: toJson(creator),
        },
        update: {
          username:
            typeof creator["username"] === "string"
              ? creator["username"]
              : null,
          pfp: typeof creator["pfp"] === "string" ? creator["pfp"] : null,
          provider:
            typeof creator["provider"] === "string"
              ? creator["provider"]
              : null,
          providerUsername:
            typeof creator["providerUsername"] === "string"
              ? creator["providerUsername"]
              : null,
          twitterUsername:
            typeof creator["twitterUsername"] === "string"
              ? creator["twitterUsername"]
              : null,
          bagsUsername:
            typeof creator["bagsUsername"] === "string"
              ? creator["bagsUsername"]
              : null,
          royaltyBps:
            typeof creator["royaltyBps"] === "number"
              ? creator["royaltyBps"]
              : null,
          isCreator:
            typeof creator["isCreator"] === "boolean"
              ? creator["isCreator"]
              : null,
          isAdmin:
            typeof creator["isAdmin"] === "boolean" ? creator["isAdmin"] : null,
          raw: toJson(creator),
        },
      }),
    ),
  );
};

export const tokenWithDetailsToResponse = (token: TokenWithDetails) => {
  const latestSnapshot = token.snapshots.at(0);

  return {
    launch: tokenToLaunchView(token),
    creators: token.creators,
    latestSnapshot,
  };
};
