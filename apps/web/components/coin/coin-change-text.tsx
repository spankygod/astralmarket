import { ArrowDown, ArrowUp } from "lucide-react";

import { formatPercent } from "@/lib/market-format";

export function CoinChangeText({ value }: { value?: number | null }) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return <span className="text-zinc-500">-</span>;
  }

  const negative = value < 0;

  return (
    <span
      className={
        negative
          ? "inline-flex items-center gap-1 font-semibold text-red-400"
          : "inline-flex items-center gap-1 font-semibold text-green-400"
      }
    >
      {negative ? (
        <ArrowDown className="size-3" />
      ) : (
        <ArrowUp className="size-3" />
      )}
      {formatPercent(value).replace("+", "")}
    </span>
  );
}
