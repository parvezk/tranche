export type MarketMode = "indexes" | "etfs";

export interface MarketQuote {
  symbol: string;
  label: string;
  price: number | null;
  change: number | null;
  changePct: number | null;
}

export interface MarketDefinition {
  symbol: string;
  label: string;
}

export const MARKET_STRIP_LABELS: Record<MarketMode, string> = {
  indexes: "Indexes",
  etfs: "ETFs",
};

export const MARKET_STRIP_COLUMN_COUNTS: Record<MarketMode, number> = {
  indexes: 5,
  etfs: 8,
};

export function formatSignedNumber(value: number | null, suffix = "") {
  if (typeof value !== "number") return "--";
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}${suffix}`;
}

export function getMarketMovementClass(change: number | null) {
  if (typeof change !== "number") return "market-movement-flat";
  return change >= 0 ? "market-movement-up" : "market-movement-down";
}
