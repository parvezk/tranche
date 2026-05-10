import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}


export const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const budgetNumber = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatSignedPct(value: number | null) {
  if (typeof value !== "number") {
    return "--";
  }
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function perfColor(value: number | null) {
  if (typeof value !== "number") return "text-[#e4e4e7]";
  return value >= 0 ? "text-[#4ade80]" : "text-[#f87171]";
}
