"use client";

import {
  Check,
  Copy,
  Download,
  Share2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

import type { BagsTableRow } from "@/lib/home-market-mappers";

const cardSize = 1080;
const fallbackCardFont = "'Poppins', Arial, sans-serif";
const copiedResetMs = 1600;
const maxShareCardRank = 100;
const shareCardImage = "/assets/sharecard.jpg";

const copyText = async (value: string) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);

    return;
  }

  const textArea = document.createElement("textarea");

  textArea.value = value;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.opacity = "0";
  document.body.append(textArea);
  textArea.select();
  document.execCommand("copy");
  textArea.remove();
};

const getChangeColor = (value: string) => {
  if (value.startsWith("-")) {
    return "#f87171";
  }

  if (value === "-") {
    return "#94a3b8";
  }

  return "#22c55e";
};

const getShareText = (token: BagsTableRow, tokenUrl: string) =>
  [
    `${token.name} (${token.symbol}) is #${token.rank} on Astralmarket.`,
    `Market Cap: ${token.marketCap}`,
    `24h: ${token.h24}`,
    `24h Volume: ${token.volume24h}`,
    "",
    tokenUrl,
  ].join("\n");

const getCardTimestamp = () =>
  new Date().toLocaleString(undefined, {
    day: "numeric",
    hour: "numeric",
    hour12: true,
    minute: "2-digit",
    month: "long",
    year: "numeric",
  });

const getCanvasFont = (variableName: string, fallback: string) => {
  const fontFamily = getComputedStyle(document.body)
    .getPropertyValue(variableName)
    .trim();

  return fontFamily || fallback;
};

const loadImage = (source: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", () => reject(new Error("Image failed")));
    image.src = source;
  });

const drawTrendArrow = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  negative: boolean,
  size = 1,
) => {
  context.save();
  context.lineCap = "round";
  context.lineJoin = "round";
  context.lineWidth = 5 * size;
  context.beginPath();

  if (negative) {
    context.moveTo(x + 14 * size, y + 10 * size);
    context.lineTo(x + 14 * size, y + 36 * size);
    context.moveTo(x + 2 * size, y + 24 * size);
    context.lineTo(x + 14 * size, y + 36 * size);
    context.lineTo(x + 26 * size, y + 24 * size);
  } else {
    context.moveTo(x + 14 * size, y + 36 * size);
    context.lineTo(x + 14 * size, y + 10 * size);
    context.moveTo(x + 2 * size, y + 22 * size);
    context.lineTo(x + 14 * size, y + 10 * size);
    context.lineTo(x + 26 * size, y + 22 * size);
  }

  context.stroke();
  context.restore();
};

const drawChromeRank = (
  context: CanvasRenderingContext2D,
  cardFont: string,
  text: string,
  x: number,
  y: number,
) => {
  context.save();
  context.font = `800 74px ${cardFont}`;
  context.textAlign = "center";
  context.textBaseline = "alphabetic";
  context.fillStyle = "#ffffff";
  context.fillText(text, x, y);
  context.restore();
};

const drawLabelValue = (
  context: CanvasRenderingContext2D,
  cardFont: string,
  label: string,
  value: string,
  y: number,
) => {
  context.font = `36px ${cardFont}`;
  context.fillStyle = "#8b95a5";
  context.fillText(label, 86, y);
  context.font = `400 42px ${cardFont}`;
  context.fillStyle = "#ffffff";
  context.fillText(value, 360, y);
};

const drawWrappedText = (
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
) => {
  const words = text.split(/\s+/u);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;

    if (context.measureText(testLine).width <= maxWidth) {
      currentLine = testLine;
      continue;
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    currentLine = word;
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  lines.slice(0, maxLines).forEach((line, index) => {
    const shouldTruncate = index === maxLines - 1 && lines.length > maxLines;
    let displayLine = line;

    while (
      shouldTruncate &&
      context.measureText(`${displayLine}...`).width > maxWidth &&
      displayLine.length > 0
    ) {
      displayLine = displayLine.slice(0, -1);
    }

    context.fillText(shouldTruncate ? `${displayLine}...` : displayLine, x, y);
    y += lineHeight;
  });
};

function ShareCardCanvas({
  token,
}: {
  token: BagsTableRow;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;

    const renderCard = async () => {
      const canvas = canvasRef.current;

      if (!canvas) {
        return;
      }

      const context = canvas.getContext("2d");

      if (!context) {
        return;
      }

      const background = await loadImage(shareCardImage);
      const cardFont = getCanvasFont("--font-poppins", fallbackCardFont);

      await Promise.all([
        document.fonts.load(`400 28px ${cardFont}`),
        document.fonts.load(`700 30px ${cardFont}`),
        document.fonts.load(`800 74px ${cardFont}`),
        document.fonts.load(`800 88px ${cardFont}`),
      ]);

      if (cancelled) {
        return;
      }

      context.clearRect(0, 0, cardSize, cardSize);
      context.drawImage(background, 0, 0, cardSize, cardSize);

      const timestamp = getCardTimestamp();

      drawChromeRank(context, cardFont, `Rank ${token.rank}`, 880, 132);

      context.fillStyle = "#ffffff";
      context.font = `700 54px ${cardFont}`;
      drawWrappedText(
        context,
        `${token.symbol || token.name}`,
        86,
        302,
        650,
        60,
        1,
      );

      context.fillStyle = "#8b95a5";
      context.font = `34px ${cardFont}`;
      drawWrappedText(context, token.name, 86, 358, 650, 44, 2);

      context.fillStyle = getChangeColor(token.h24);
      context.font = `700 88px ${cardFont}`;
      const negative = token.h24.startsWith("-");
      const percentText = token.h24 === "-" ? "24h pending" : token.h24;

      context.fillText(percentText, 86, 492);
      context.strokeStyle = getChangeColor(token.h24);
      drawTrendArrow(
        context,
        112 + context.measureText(percentText).width,
        416,
        negative,
        1.35,
      );

      drawLabelValue(context, cardFont, "24h Volume", token.volume24h, 718);
      drawLabelValue(context, cardFont, "Market Cap", token.marketCap, 786);

      context.fillStyle = "#8b95a5";
      context.font = `28px ${cardFont}`;
      context.fillText(timestamp, 86, 968);
    };

    void renderCard();

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <canvas
      aria-label={`${token.name} share card preview`}
      className="aspect-square w-full rounded-lg border border-[#222222] bg-black"
      data-share-card={token.tokenMint}
      height={cardSize}
      ref={canvasRef}
      width={cardSize}
    />
  );
}

function ShareAction({
  label,
  children,
  onClick,
}: {
  label: string;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className="grid size-11 place-items-center rounded-md border border-[#242424] bg-[#101010] text-zinc-100 transition-colors hover:bg-[#181818] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500"
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}

function XIcon() {
  return (
    <svg aria-hidden="true" className="size-4" viewBox="0 0 24 24">
      <path
        d="M18.9 2h3.3l-7.2 8.2L23.5 22h-6.7l-5.2-6.8L5.6 22H2.3l7.7-8.8L1.8 2h6.8l4.7 6.2L18.9 2Zm-1.2 17.9h1.8L7.6 4H5.7l12 15.9Z"
        fill="currentColor"
      />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg aria-hidden="true" className="size-4" viewBox="0 0 24 24">
      <path
        d="M14 8.5V6.8c0-.8.5-1 1-1h2V2.2C16.7 2.1 15.4 2 14 2c-3 0-5 1.8-5 5.1v1.4H5.7v4H9V22h4v-9.5h3.2l.5-4H14Z"
        fill="currentColor"
      />
    </svg>
  );
}

function LinkedinIcon() {
  return (
    <svg aria-hidden="true" className="size-4" viewBox="0 0 24 24">
      <path
        d="M5.3 8.8H1.8V22h3.5V8.8ZM3.6 2C2.4 2 1.5 2.9 1.5 4s.9 2 2 2h.1c1.2 0 2-.9 2-2S4.8 2 3.6 2Zm18.9 12.5c0-4-2.1-5.9-5-5.9-2.3 0-3.3 1.3-3.9 2.1V8.8h-3.5V22h3.5v-7.4c0-.4 0-.8.1-1.1.3-.8 1-1.7 2.2-1.7 1.5 0 2.1 1.2 2.1 2.9V22h3.5v-7.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

function RedditIcon() {
  return (
    <svg aria-hidden="true" className="size-4" viewBox="0 0 24 24">
      <path
        d="M22 12.1c0-1.4-1.1-2.5-2.5-2.5-.7 0-1.3.3-1.8.7-1.3-.9-3-1.5-4.8-1.6l.8-3.8 2.7.6c.1 1 1 1.8 2 1.8 1.1 0 2-.9 2-2s-.9-2-2-2c-.8 0-1.5.5-1.8 1.2l-3.3-.7c-.3-.1-.6.1-.7.4l-.9 4.5c-1.9.1-3.6.7-5 1.6-.4-.4-1.1-.7-1.8-.7-1.4 0-2.5 1.1-2.5 2.5 0 1 .6 1.9 1.5 2.3v.6c0 3.5 3.7 6.3 8.2 6.3s8.2-2.8 8.2-6.3v-.6c1-.4 1.7-1.3 1.7-2.3ZM8.3 13.9c0-.8.6-1.4 1.4-1.4s1.4.6 1.4 1.4-.6 1.4-1.4 1.4-1.4-.6-1.4-1.4Zm7.1 4.2c-.8.8-2.2 1.2-3.4 1.2s-2.6-.4-3.4-1.2c-.2-.2-.2-.5 0-.7s.5-.2.7 0c.5.5 1.6.9 2.7.9s2.2-.4 2.7-.9c.2-.2.5-.2.7 0s.2.5 0 .7Zm-1.1-2.8c-.8 0-1.4-.6-1.4-1.4s.6-1.4 1.4-1.4 1.4.6 1.4 1.4-.6 1.4-1.4 1.4Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function ShareTokenButton({ token }: { token: BagsTableRow }) {
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const isShareCardEligible = token.rank <= maxShareCardRank;
  const tokenUrl = useMemo(() => {
    if (typeof window === "undefined") {
      return `/coins/${encodeURIComponent(token.tokenMint)}`;
    }

    return `${window.location.origin}/coins/${encodeURIComponent(
      token.tokenMint,
    )}`;
  }, [token.tokenMint]);
  const shareText = useMemo(() => getShareText(token, tokenUrl), [
    token,
    tokenUrl,
  ]);

  const markCopied = (label: string) => {
    setCopiedLabel(label);
    window.setTimeout(() => setCopiedLabel(null), copiedResetMs);
  };

  const getCardBlob = useCallback(
    () =>
      new Promise<Blob | null>((resolve) => {
        const canvas = document.querySelector<HTMLCanvasElement>(
          `[data-share-card="${token.tokenMint}"]`,
        );

        canvas?.toBlob((blob) => resolve(blob), "image/png");
      }),
    [token.tokenMint],
  );

  const downloadCard = async () => {
    const blob = await getCardBlob();

    if (!blob) {
      return;
    }

    const link = document.createElement("a");
    const objectUrl = URL.createObjectURL(blob);

    link.href = objectUrl;
    link.download = `${token.symbol || token.name}-astralmarket-share-card.png`;
    link.click();
    URL.revokeObjectURL(objectUrl);
  };

  const shareOnX = () => {
    const intentUrl = new URL("https://twitter.com/intent/tweet");

    intentUrl.searchParams.set("text", shareText);
    window.open(intentUrl.toString(), "_blank", "noopener,noreferrer");
  };

  const shareOnFacebook = () => {
    const shareUrl = new URL("https://www.facebook.com/sharer/sharer.php");

    shareUrl.searchParams.set("u", tokenUrl);
    window.open(shareUrl.toString(), "_blank", "noopener,noreferrer");
  };

  const shareOnLinkedin = () => {
    const shareUrl = new URL("https://www.linkedin.com/sharing/share-offsite/");

    shareUrl.searchParams.set("url", tokenUrl);
    window.open(shareUrl.toString(), "_blank", "noopener,noreferrer");
  };

  const shareOnReddit = () => {
    const shareUrl = new URL("https://www.reddit.com/submit");

    shareUrl.searchParams.set("url", tokenUrl);
    shareUrl.searchParams.set("title", shareText);
    window.open(shareUrl.toString(), "_blank", "noopener,noreferrer");
  };

  return (
    <>
      <button
        aria-label={`Share ${token.name}`}
        className="grid size-7 place-items-center rounded-md text-zinc-300 transition-colors hover:bg-[#111111] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500"
        onClick={() => setOpen(true)}
        title="Share"
        type="button"
      >
        <Share2 className="size-4" />
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/75 px-4 py-8 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={`Share ${token.name}`}
        >
          <button
            aria-label="Close share modal"
            className="absolute inset-0 cursor-default"
            onClick={() => setOpen(false)}
            type="button"
          />
          <div className="relative w-full max-w-[520px] rounded-lg border border-[#242424] bg-[#050505] p-4 shadow-2xl">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-white">
                  {isShareCardEligible
                    ? `Share ${token.symbol || token.name}`
                    : "Share card unavailable"}
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  {isShareCardEligible
                    ? "Token performance card"
                    : "Only Top 100 ranked tokens can generate share cards."}
                </p>
              </div>
              <button
                aria-label="Close"
                className="grid size-8 place-items-center rounded-md text-zinc-400 hover:bg-[#111111] hover:text-white"
                onClick={() => setOpen(false)}
                type="button"
              >
                <X className="size-4" />
              </button>
            </div>

            {isShareCardEligible ? (
              <>
                <ShareCardCanvas token={token} />

                <div className="mt-4">
                  <p className="mb-2 text-xs font-semibold uppercase text-zinc-500">
                    Public link
                  </p>
                  <div className="flex min-w-0 items-center gap-2 rounded-md border border-[#242424] bg-[#101010] p-2">
                    <p className="min-w-0 flex-1 truncate px-2 font-mono text-xs text-zinc-300">
                      {tokenUrl}
                    </p>
                    <button
                      aria-label="Copy public link"
                      className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md bg-[#1a1a1a] px-2.5 text-xs font-semibold text-zinc-100 transition-colors hover:bg-[#242424] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500"
                      onClick={() => {
                        void copyText(tokenUrl).then(() =>
                          markCopied("Link copied"),
                        );
                      }}
                      type="button"
                    >
                      <Copy className="size-3.5" />
                      Copy
                    </button>
                  </div>
                </div>

                <div className="my-4 h-px bg-[#242424]" />

                <div className="grid grid-cols-5 gap-2">
                  <ShareAction label="Share on X" onClick={shareOnX}>
                    <XIcon />
                  </ShareAction>
                  <ShareAction
                    label="Share on Facebook"
                    onClick={shareOnFacebook}
                  >
                    <FacebookIcon />
                  </ShareAction>
                  <ShareAction
                    label="Share on LinkedIn"
                    onClick={shareOnLinkedin}
                  >
                    <LinkedinIcon />
                  </ShareAction>
                  <ShareAction label="Share on Reddit" onClick={shareOnReddit}>
                    <RedditIcon />
                  </ShareAction>
                  <ShareAction
                    label="Download share card"
                    onClick={() => {
                      void downloadCard();
                    }}
                  >
                    <Download className="size-4" />
                  </ShareAction>
                </div>
              </>
            ) : (
              <div className="rounded-lg border border-[#242424] bg-[#101010] px-4 py-6">
                <p className="text-sm leading-6 text-zinc-300">
                  {token.symbol || token.name} is currently ranked #
                  {token.rank.toLocaleString()}. Share cards are reserved for
                  tokens ranked #1-#100.
                </p>
                <button
                  className="mt-5 inline-flex h-9 items-center justify-center rounded-md bg-white px-4 text-sm font-semibold text-black transition-colors hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500"
                  onClick={() => setOpen(false)}
                  type="button"
                >
                  Got it
                </button>
              </div>
            )}

            {copiedLabel ? (
              <p className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-green-400">
                <Check className="size-4" />
                {copiedLabel}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
