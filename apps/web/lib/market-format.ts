const trimTrailingZeros = (value: string) =>
  value.replace(/(\.\d*?)0+$/u, "$1").replace(/\.$/u, "");

const subscriptDigits = ["₀", "₁", "₂", "₃", "₄", "₅", "₆", "₇", "₈", "₉"];

const toSubscriptNumber = (value: number) =>
  String(value)
    .split("")
    .map((digit) => subscriptDigits[Number(digit)] ?? digit)
    .join("");

const formatTinyPrice = (value: number) => {
  const fixed = value.toFixed(18);
  const [, fraction = ""] = fixed.split(".");
  const leadingZeros = fraction.match(/^0*/u)?.[0].length ?? 0;
  const significant = fraction
    .slice(leadingZeros)
    .replace(/0+$/u, "")
    .slice(0, 4);

  if (!significant) {
    return "$0";
  }

  return `$0.0${toSubscriptNumber(leadingZeros)}${significant}`;
};

export const formatPrice = (value?: number | null) => {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "-";
  }

  if (value >= 1) {
    return `$${value.toLocaleString(undefined, {
      maximumFractionDigits: 4,
    })}`;
  }

  if (value >= 0.01) {
    return `$${trimTrailingZeros(value.toFixed(6))}`;
  }

  if (value < 0.0001) {
    return formatTinyPrice(value);
  }

  if (value >= 0.000001) {
    return `$${trimTrailingZeros(value.toFixed(9))}`;
  }

  return `$${trimTrailingZeros(value.toFixed(12))}`;
};

export const formatMarketCap = (value?: number | null) => {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "-";
  }

  if (value >= 1_000_000_000) {
    return `$${trimTrailingZeros((value / 1_000_000_000).toFixed(2))}B`;
  }

  if (value >= 1_000_000) {
    return `$${trimTrailingZeros((value / 1_000_000).toFixed(2))}M`;
  }

  if (value >= 1_000) {
    return `$${trimTrailingZeros((value / 1_000).toFixed(2))}K`;
  }

  return `$${trimTrailingZeros(value.toFixed(2))}`;
};

export const formatFullCurrency = (value?: number | null) => {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "-";
  }

  return `$${value.toLocaleString(undefined, {
    maximumFractionDigits: 2,
    minimumFractionDigits: value >= 1 ? 2 : 0,
  })}`;
};

export const formatMillionMarketCap = (value?: number | null) => {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "-";
  }

  return `$${trimTrailingZeros((value / 1_000_000).toFixed(2))} million`;
};

export const formatPercent = (value?: number | null) => {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "-";
  }

  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
};
