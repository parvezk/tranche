"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type MarketMode = "indexes" | "etfs";

interface MarketQuote {
  symbol: string;
  label: string;
  price: number | null;
  change: number | null;
  changePct: number | null;
}

const priceNumber = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function signed(value: number | null, suffix = "") {
  if (typeof value !== "number") return "--";
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}${suffix}`;
}

export function MarketStrip() {
  const [mode, setMode] = useState<MarketMode>("indexes");
  const [quotes, setQuotes] = useState<Record<MarketMode, MarketQuote[]>>({
    indexes: [],
    etfs: [],
  });
  const [loading, setLoading] = useState(true);

  const fetchQuotes = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch("/api/market-strip", { signal });
      if (!response.ok) throw new Error("Unable to load market quotes");
      const data = (await response.json()) as Record<MarketMode, MarketQuote[]>;
      setQuotes(data);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void fetchQuotes(controller.signal);
    const interval = window.setInterval(() => void fetchQuotes(), 30_000);
    return () => {
      controller.abort();
      window.clearInterval(interval);
    };
  }, [fetchQuotes]);

  const visibleQuotes = quotes[mode];

  return (
    <div className="border-t border-[#27272a] bg-[#111113] px-3 py-2 sm:px-4">
      <div className="flex min-w-0 items-stretch gap-2">
        <div
          className="grid min-w-0 flex-1 divide-x divide-[#27272a]"
          style={{ gridTemplateColumns: `repeat(${mode === "indexes" ? 5 : 8}, minmax(72px, 1fr))` }}
        >
          {loading && visibleQuotes.length === 0
            ? Array.from({ length: mode === "indexes" ? 5 : 8 }).map((_, index) => (
                <div key={index} className="space-y-1 px-2 py-0.5">
                  <Skeleton className="h-3 w-12 bg-[#27272a]" />
                  <Skeleton className="h-3 w-16 bg-[#27272a]" />
                </div>
              ))
            : visibleQuotes.map((quote) => {
                const movementClass =
                  typeof quote.change === "number"
                    ? quote.change >= 0
                      ? "text-[#4ade80]"
                      : "text-[#f87171]"
                    : "text-[#71717a]";
                return (
                  <div key={quote.symbol} className="min-w-0 px-2 py-0.5 text-center">
                    <p className="truncate text-[10px] font-bold uppercase tracking-[0.08em] text-[#a1a1aa]">
                      {quote.label}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-[#f4f4f5] [font-family:var(--font-mono)]">
                      {typeof quote.price === "number" ? priceNumber.format(quote.price) : "--"}
                    </p>
                    <p className={`truncate text-[10px] [font-family:var(--font-mono)] ${movementClass}`}>
                      {signed(quote.change)} · {signed(quote.changePct, "%")}
                    </p>
                  </div>
                );
              })}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setMode((current) => (current === "indexes" ? "etfs" : "indexes"))}
          className="h-auto min-w-[78px] self-stretch border-[#3f3f46] bg-[#18181b] px-2 text-[10px] font-bold uppercase tracking-[0.08em] text-[#e4e4e7] hover:bg-[#27272a]"
          aria-label={`Show ${mode === "indexes" ? "ETF" : "index"} quotes`}
        >
          {mode === "indexes" ? "Show ETFs" : "Show Indexes"}
        </Button>
      </div>
      <p className="mt-1 text-right text-[9px] uppercase tracking-[0.08em] text-[#3f3f46]">
        Refreshes every 30s · Quotes may be delayed
      </p>
    </div>
  );
}
