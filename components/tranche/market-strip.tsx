"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatSignedNumber,
  getMarketMovementClass,
  MARKET_STRIP_COLUMN_COUNTS,
  MARKET_STRIP_LABELS,
  type MarketMode,
  type MarketQuote,
} from "@/lib/utils/market-strip";

const priceNumber = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// Header ticker strip that polls the batch quote endpoint and toggles between index and ETF groups.
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
  const columnCount = MARKET_STRIP_COLUMN_COUNTS[mode];
  const showLoadingSkeletons = loading && visibleQuotes.length === 0;

  return (
    <div className="relative border-t border-[var(--tranche-border-muted)] bg-[#111113] px-3 py-2 sm:px-4">
      <p className="absolute right-3 top-0 -translate-y-1/2 bg-[var(--tranche-panel)] px-2 text-[9px] uppercase tracking-[0.08em] text-[var(--tranche-border-strong)] sm:right-4">
        Refreshes every 30s · Quotes may be delayed
      </p>
      <div className="flex min-w-0 items-stretch gap-2">
        <div
          className="grid min-w-0 flex-1 divide-x divide-[var(--tranche-border-muted)]"
          style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(72px, 1fr))` }}
        >
          {showLoadingSkeletons
            ? Array.from({ length: columnCount }).map((_, index) => (
                <div key={index} className="space-y-1 px-2 py-0.5">
                  <Skeleton className="h-3 w-12 bg-[var(--tranche-border-muted)]" />
                  <Skeleton className="h-3 w-16 bg-[var(--tranche-border-muted)]" />
                </div>
              ))
            : visibleQuotes.map((quote) => {
                const movementClass = getMarketMovementClass(quote.change);
                return (
                  <div key={quote.symbol} className="min-w-0 px-2 py-0.5 text-center">
                    <p className="truncate text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--tranche-muted)]">
                      {quote.label}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-[#f4f4f5] [font-family:var(--font-mono)]">
                      {typeof quote.price === "number" ? priceNumber.format(quote.price) : "--"}
                    </p>
                    <p className={`truncate text-[10px] font-semibold [font-family:var(--font-mono)] ${movementClass}`}>
                      {formatSignedNumber(quote.change)} · {formatSignedNumber(quote.changePct, "%")}
                    </p>
                  </div>
                );
              })}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setMode((current) => (current === "indexes" ? "etfs" : "indexes"))}
          className="h-auto min-w-[78px] self-stretch border-[var(--tranche-border-strong)] bg-[var(--tranche-panel)] px-2 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--tranche-text)] hover:bg-[var(--tranche-border-muted)]"
          aria-label={`Show ${mode === "indexes" ? "ETF" : "index"} quotes`}
        >
          Show {mode === "indexes" ? MARKET_STRIP_LABELS.etfs : MARKET_STRIP_LABELS.indexes}
        </Button>
      </div>
    </div>
  );
}
