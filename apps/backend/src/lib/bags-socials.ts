import type { PrismaClient } from "@prisma/client";

import { bagsClient } from "./bags-client";
import { getDexScreenerMarketData } from "./dexscreener-client";
import { chunk } from "./bags-sync/shared";

type SocialSource = "bags_launch_feed" | "dexscreener";

type SocialCandidate = {
  source: SocialSource;
  tokenMint: string;
  twitter?: string | null;
  website?: string | null;
};

export type BagsSocialRefreshResult = {
  rowsRead: number;
  rowsScanned: number;
  rowsWritten: number;
  rowsUpdated: number;
  syncRunId: string;
  sources: Record<SocialSource, number>;
};

const hasSocialValue = (value: string | null | undefined) =>
  typeof value === "string" && value.trim().length > 0;

const getCandidateForToken = (
  token: {
    tokenMint: string;
    twitter: string | null;
    website: string | null;
  },
  candidates: Map<string, SocialCandidate>,
) => {
  const candidate = candidates.get(token.tokenMint);

  if (!candidate) {
    return null;
  }

  const twitter = hasSocialValue(token.twitter)
    ? undefined
    : candidate.twitter?.trim() || undefined;
  const website = hasSocialValue(token.website)
    ? undefined
    : candidate.website?.trim() || undefined;

  if (!twitter && !website) {
    return null;
  }

  return {
    source: candidate.source,
    update: {
      twitter,
      website,
    },
  };
};

const refreshBagsTokenSocials = async (
  prisma: PrismaClient,
): Promise<Omit<BagsSocialRefreshResult, "rowsRead" | "rowsWritten" | "syncRunId">> => {
  const tokens = await prisma.bagsToken.findMany({
    where: {
      OR: [
        {
          twitter: null,
        },
        {
          twitter: "",
        },
        {
          website: null,
        },
        {
          website: "",
        },
      ],
    },
    select: {
      tokenMint: true,
      twitter: true,
      website: true,
    },
  });
  const candidates = new Map<string, SocialCandidate>();
  const feed = await bagsClient.getTokenLaunchFeed();

  for (const launch of feed) {
    if (hasSocialValue(launch.twitter) || hasSocialValue(launch.website)) {
      candidates.set(launch.tokenMint, {
        source: "bags_launch_feed",
        tokenMint: launch.tokenMint,
        twitter: launch.twitter,
        website: launch.website,
      });
    }
  }

  const missingMints = tokens
    .filter((token) => {
      const candidate = candidates.get(token.tokenMint);

      return (
        !candidate ||
        (!hasSocialValue(candidate.twitter) && !hasSocialValue(token.twitter)) ||
        (!hasSocialValue(candidate.website) && !hasSocialValue(token.website))
      );
    })
    .map((token) => token.tokenMint);

  for (const tokenMintChunk of chunk(missingMints, 30)) {
    const dexResults = await getDexScreenerMarketData(tokenMintChunk);

    for (const [tokenMint, dexMarketData] of dexResults.entries()) {
      const existing = candidates.get(tokenMint);

      candidates.set(tokenMint, {
        source: existing?.source ?? "dexscreener",
        tokenMint,
        twitter: existing?.twitter ?? dexMarketData.twitter,
        website: existing?.website ?? dexMarketData.website,
      });
    }
  }

  const sources: Record<SocialSource, number> = {
    bags_launch_feed: 0,
    dexscreener: 0,
  };
  let rowsUpdated = 0;

  for (const tokenChunk of chunk(tokens, 25)) {
    await Promise.all(
      tokenChunk.map(async (token) => {
        const candidate = getCandidateForToken(token, candidates);

        if (!candidate) {
          return;
        }

        await prisma.bagsToken.update({
          where: {
            tokenMint: token.tokenMint,
          },
          data: candidate.update,
        });
        sources[candidate.source] += 1;
        rowsUpdated += 1;
      }),
    );
  }

  return {
    rowsScanned: tokens.length,
    rowsUpdated,
    sources,
  };
};

export const syncBagsTokenSocials = async (
  prisma: PrismaClient,
): Promise<BagsSocialRefreshResult> => {
  const syncRun = await prisma.syncRun.create({
    data: {
      source: "bags_socials",
      status: "running",
    },
  });

  try {
    const result = await refreshBagsTokenSocials(prisma);

    await prisma.syncRun.update({
      where: {
        id: syncRun.id,
      },
      data: {
        status: "success",
        finishedAt: new Date(),
        rowsRead: result.rowsScanned,
        rowsWritten: result.rowsUpdated,
      },
    });

    return {
      ...result,
      rowsRead: result.rowsScanned,
      rowsWritten: result.rowsUpdated,
      syncRunId: syncRun.id,
    };
  } catch (error) {
    await prisma.syncRun.update({
      where: {
        id: syncRun.id,
      },
      data: {
        status: "failed",
        finishedAt: new Date(),
        error: error instanceof Error ? error.message : String(error),
      },
    });

    throw error;
  }
};
