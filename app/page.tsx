"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { type Position, type PositionPerf, useTrancheStore } from "@/lib/store";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const budgetNumber = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function formatSignedPct(value: number | null) {
  if (typeof value !== "number") {
    return "--";
  }
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function parseUrlState(search: string): { budget: number | null; positions: Array<{ ticker: string; shares: number }> } | null {
  const params = new URLSearchParams(search);
  if (!params.has("b") && !params.has("s")) {
    return null;
  }

  const budgetRaw = params.get("b");
  const parsedBudget = budgetRaw ? Number.parseFloat(budgetRaw) : null;
  const budget = Number.isFinite(parsedBudget) ? Number(parsedBudget) : null;

  const shares: Array<{ ticker: string; shares: number }> = [];
  const sParam = params.get("s");
  if (sParam) {
    const entries = sParam.split(",");
    for (const rawEntry of entries) {
      const entry = rawEntry.trim();
      if (!entry) continue;

      const colonIndex = entry.indexOf(":");
      let rawTicker: string;
      let rawShares: string;

      if (colonIndex === -1) {
        rawTicker = entry;
        rawShares = "";
      } else {
        rawTicker = entry.slice(0, colonIndex);
        rawShares = entry.slice(colonIndex + 1);
      }

      const ticker = rawTicker.toUpperCase().replace(/[^A-Z.\-]/g, "");
      if (ticker.length === 0) continue;

      const sharesParsed = Number.parseFloat(rawShares);
      shares.push({
        ticker,
        shares: Number.isFinite(sharesParsed) && sharesParsed >= 0 ? sharesParsed : 0,
      });
    }
  }

  return { budget, positions: shares };
}

function perfColor(value: number | null) {
  if (typeof value !== "number") return "text-[#e4e4e7]";
  return value >= 0 ? "text-[#4ade80]" : "text-[#f87171]";
}

function PerfBar({ value }: { value: number | null }) {
  if (typeof value !== "number") {
    return <div className="h-1.5 w-11 rounded bg-[#27272a]" />;
  }
  const width = Math.min(Math.abs(value), 30) / 30;
  const color = value >= 0 ? "bg-[#4ade80]" : "bg-[#f87171]";
  return (
    <div className="h-1.5 w-11 rounded bg-[#27272a]">
      <div className={`h-full rounded ${color}`} style={{ width: `${Math.max(width * 100, 4)}%` }} />
    </div>
  );
}


const BUDGET_WARNING_THRESHOLD = 0.88;
const BUDGET_DANGER_THRESHOLD = 1.0;

function getProgressColor(ratio: number): string {
  if (ratio > BUDGET_DANGER_THRESHOLD) {
    return "bg-[#f87171]";
  }
  if (ratio > BUDGET_WARNING_THRESHOLD) {
    return "bg-[#f59e0b]";
  }
  return "bg-[#4ade80]";
}

export default function Home() {
  const {
    budget,
    positions,
    hasHydrated,
    setBudget,
    addPosition,
    removePosition,
    updateTicker,
    setPrice,
    setShares,
    setLoading,
    setError,
    setPerf,
    resetMarketData,
    replaceFromShareState,
  } = useTrancheStore();

  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetDraft, setBudgetDraft] = useState("");
  const [activePopoverId, setActivePopoverId] = useState<string | null>(null);
  const [perfLoadingMap, setPerfLoadingMap] = useState<Record<string, boolean>>({});

  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickerInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const shareInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const priceRequestSeqRef = useRef<Record<string, number>>({});
  const perfRequestSeqRef = useRef<Record<string, number>>({});
  const initializedRef = useRef(false);

  const allocated = useMemo(
    () =>
      positions.reduce(
        (total, position) =>
          total + (typeof position.price === "number" ? position.price * position.shares : 0),
        0,
      ),
    [positions],
  );
  const remaining = budget - allocated;
  const overBudget = allocated > budget;
  const progressRatio = budget > 0 ? allocated / budget : 0;
  const progressValue = Math.max(0, Math.min(progressRatio * 100, 100));
  const progressColorClass = getProgressColor(progressRatio);

  const clearTimers = useCallback(() => {
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const fetchPrice = useCallback(
    async (positionId: string, ticker: string) => {
      const cleanedTicker = ticker.trim().toUpperCase();
      if (!cleanedTicker) {
        setError(positionId, null);
        return;
      }

      const isLatestPriceRequest = () => {
        const currentPosition = useTrancheStore
          .getState()
          .positions.find((position) => position.id === positionId);

        if (!currentPosition) {
          return false;
        }

        return (
          currentPosition.ticker.trim().toUpperCase() === cleanedTicker &&
          priceRequestSeqRef.current[positionId] === requestSeq
        );
      };

      const requestSeq = (priceRequestSeqRef.current[positionId] ?? 0) + 1;
      priceRequestSeqRef.current[positionId] = requestSeq;

      setLoading(positionId, true);
      try {
        const response = await fetch(`/api/price?ticker=${encodeURIComponent(cleanedTicker)}`);
        if (!response.ok) {
          throw new Error("Not found");
        }
        const data = await response.json();
        if (typeof data.price !== "number") {
          throw new Error("Not found");
        }

        if (!isLatestPriceRequest()) {
          return;
        }

        setPrice(positionId, {
          name: data.name ?? cleanedTicker,
          price: data.price,
          changePct1D: typeof data.changePct1D === "number" ? data.changePct1D : null,
        });
      } catch {
        if (!isLatestPriceRequest()) {
          return;
        }
        setError(positionId, "Not found");
      }
    },
    [setError, setLoading, setPrice],
  );

  const fetchPerf = useCallback(
    async (position: Position) => {
      if (!position.ticker || position.perf || perfLoadingMap[position.id]) {
        return;
      }

      const requestSeq = (perfRequestSeqRef.current[position.id] ?? 0) + 1;
      perfRequestSeqRef.current[position.id] = requestSeq;
      const requestTicker = position.ticker;
      setPerfLoadingMap((state) => ({ ...state, [position.id]: true }));

      try {
        const response = await fetch(`/api/perf?ticker=${encodeURIComponent(requestTicker)}`);
        if (!response.ok) {
          throw new Error("No data");
        }
        const data: PositionPerf = await response.json();

        const currentPosition = useTrancheStore
          .getState()
          .positions.find((candidate) => candidate.id === position.id);
        if (
          !currentPosition ||
          currentPosition.ticker !== requestTicker ||
          perfRequestSeqRef.current[position.id] !== requestSeq
        ) {
          return;
        }

        setPerf(position.id, {
          changePct1W: typeof data.changePct1W === "number" ? data.changePct1W : null,
          changePct3M: typeof data.changePct3M === "number" ? data.changePct3M : null,
          changePctYTD: typeof data.changePctYTD === "number" ? data.changePctYTD : null,
          changePct1Y: typeof data.changePct1Y === "number" ? data.changePct1Y : null,
        });
      } catch {
        // Ignore API failures; next hover can retry.
      } finally {
        if (perfRequestSeqRef.current[position.id] === requestSeq) {
          setPerfLoadingMap((state) => ({ ...state, [position.id]: false }));
        }
      }
    },
    [perfLoadingMap, setPerf],
  );

  const handleTickerChange = useCallback(
    (positionId: string, nextTicker: string) => {
      priceRequestSeqRef.current[positionId] = (priceRequestSeqRef.current[positionId] ?? 0) + 1;
      perfRequestSeqRef.current[positionId] = (perfRequestSeqRef.current[positionId] ?? 0) + 1;
      setPerfLoadingMap((state) => ({ ...state, [positionId]: false }));
      updateTicker(positionId, nextTicker);
    },
    [updateTicker],
  );

  useEffect(() => {
    if (!hasHydrated || initializedRef.current) {
      return;
    }
    initializedRef.current = true;

    const urlState = parseUrlState(window.location.search);
    if (urlState) {
      replaceFromShareState(urlState.budget, urlState.positions);
      requestAnimationFrame(() => {
        const next = useTrancheStore.getState().positions;
        next.forEach((position) => {
          if (position.ticker) {
            void fetchPrice(position.id, position.ticker);
          }
        });
      });
      return;
    }

    resetMarketData();
    requestAnimationFrame(() => {
      const next = useTrancheStore.getState().positions;
      next.forEach((position) => {
        if (position.ticker) {
          void fetchPrice(position.id, position.ticker);
        }
      });
    });
  }, [fetchPrice, hasHydrated, replaceFromShareState, resetMarketData]);

  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  const commitBudgetEdit = useCallback(() => {
    const parsed = Number.parseFloat(budgetDraft.replace(/[$, ]/g, ""));
    if (Number.isFinite(parsed)) {
      setBudget(parsed);
    }
    setEditingBudget(false);
  }, [budgetDraft, setBudget]);

  const handleBudgetKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") commitBudgetEdit();
    if (event.key === "Escape") setEditingBudget(false);
  }, [commitBudgetEdit]);

  const handleTickerKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>, positionId: string, ticker: string) => {
      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        void fetchPrice(positionId, ticker).then(() => {
          shareInputRefs.current[positionId]?.focus();
          shareInputRefs.current[positionId]?.select();
        });
      }
    },
    [fetchPrice],
  );

  const handleTickerBlur = useCallback(
    (positionId: string, ticker: string) => {
      const cleanedTicker = ticker.trim().toUpperCase();
      if (!cleanedTicker) return;

      const position = useTrancheStore
        .getState()
        .positions.find((p) => p.id === positionId);
      if (!position) return;

      if (position.price === null && !position.loading && !position.error) {
        void fetchPrice(positionId, ticker);
      }
    },
    [fetchPrice],
  );

  const handlePositionMouseEnter = useCallback(
    (position: Position) => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      if (openTimerRef.current) clearTimeout(openTimerRef.current);
      openTimerRef.current = setTimeout(() => {
        setActivePopoverId(position.id);
        void fetchPerf(position);
      }, 180);
    },
    [fetchPerf],
  );

  const handlePositionMouseLeave = useCallback(() => {
    if (openTimerRef.current) clearTimeout(openTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      setActivePopoverId(null);
    }, 130);
  }, []);

  const handlePopoverMouseEnter = useCallback(() => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  }, []);

  const handlePopoverMouseLeave = useCallback(() => {
    closeTimerRef.current = setTimeout(() => {
      setActivePopoverId(null);
    }, 130);
  }, []);

  const handleShareChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>, positionId: string) => {
      const next = Number.parseFloat(event.target.value);
      setShares(positionId, Number.isFinite(next) && next >= 0 ? next : 0);
    },
    [setShares],
  );

  const incrementShares = useCallback(
    (position: Position, event: React.MouseEvent<HTMLButtonElement>, direction: -1 | 1) => {
      const multiplier = event.ctrlKey || event.metaKey ? 100 : event.shiftKey ? 10 : 1;
      const nextShares = Math.max(0, position.shares + direction * multiplier);
      setShares(position.id, nextShares);
    },
    [setShares],
  );

  const copyShareLink = useCallback(async () => {
    const url = new URL(window.location.href);
    url.searchParams.set("b", String(Number(budget.toFixed(2))));
    const shareState = positions
      .filter((position) => position.ticker)
      .map((position) => `${position.ticker}:${position.shares}`)
      .join(",");
    if (shareState) {
      url.searchParams.set("s", shareState);
    } else {
      url.searchParams.delete("s");
    }

    await navigator.clipboard.writeText(url.toString());
    toast.success("Share URL copied");
  }, [budget, positions]);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#09090b] px-3 py-6 text-[#e4e4e7] sm:px-6 sm:py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <div className="pb-1">
          <h1 className="text-2xl font-bold text-[#e4e4e7] [font-family:var(--font-ui)]">Tranche</h1>
          <p className="text-sm text-[#71717a]">Stock allocation tool.</p>
        </div>

        <header className="overflow-hidden rounded-sm border border-[#1a1a1e] bg-[#18181b]">
          <div className="flex flex-col gap-4 px-4 pb-4 pt-4 sm:px-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-[#52525b]">Proceeds to allocate</p>
              {editingBudget ? (
                <Input
                  autoFocus
                  value={budgetDraft}
                  onChange={(event) => setBudgetDraft(event.target.value)}
                  onBlur={commitBudgetEdit}
                  onKeyDown={handleBudgetKeyDown}
                  className="mt-2 h-14 w-72 border-[#27272a] bg-[#09090b] px-4 text-[42px] font-bold text-[#f59e0b] [font-family:var(--font-ui)]"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setBudgetDraft(String(Number(budget.toFixed(2))));
                    setEditingBudget(true);
                  }}
                  className="mt-1 flex items-baseline gap-2 text-left"
                >
                  <span className="text-3xl text-[#a1a1aa] [font-family:var(--font-ui)]">$</span>
                  <span className="text-[42px] font-bold leading-none text-[#f59e0b] [font-family:var(--font-ui)]">
                    {budgetNumber.format(budget)}
                  </span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 sm:flex sm:items-start sm:gap-6 lg:gap-8">
              <div className="text-right">
                <p className="text-xs uppercase tracking-[0.16em] text-[#52525b]">Allocated</p>
                <p
                  className={`mt-2 text-[26px] leading-none [font-family:var(--font-mono)] ${overBudget ? "text-[#f87171]" : "text-[#4ade80]"}`}
                >
                  {currency.format(allocated)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-[0.16em] text-[#52525b]">Remaining</p>
                <p
                  className={`mt-2 text-[26px] leading-none [font-family:var(--font-mono)] ${overBudget ? "text-[#f87171]" : "text-[#e4e4e7]"}`}
                >
                  {currency.format(remaining)}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void copyShareLink()}
                className="col-span-2 mt-0.5 w-full border-[#27272a] bg-transparent text-[#e4e4e7] hover:bg-[#202024] sm:col-span-1 sm:w-auto"
              >
                Share
              </Button>
            </div>
          </div>
          <Progress
            value={progressValue}
            className="h-[2px] rounded-none bg-[#27272a]"
            indicatorClassName={`rounded-none ${progressColorClass}`}
          />
        </header>

        <section className="overflow-x-auto rounded-sm border border-[#1a1a1e] bg-[#18181b]">
          <div className="grid min-w-[740px] grid-cols-[88px_minmax(280px,1fr)_148px_112px_88px_36px] items-center gap-3 border-b border-[#1a1a1e] px-3 py-2 text-xs uppercase tracking-[0.12em] text-[#52525b] sm:px-4">
            <span>Ticker</span>
            <span>Name / Price</span>
            <span className="text-center">Shares</span>
            <span className="text-right">Total</span>
            <span className="text-center">% Budget</span>
            <span />
          </div>

          <div className="divide-y divide-[#1a1a1e]">
            {positions.map((position) => {
              const total = typeof position.price === "number" ? position.price * position.shares : 0;
              const pctBudget = budget > 0 ? (total / budget) * 100 : 0;
              const showPopover = activePopoverId === position.id && typeof position.price === "number" && !position.error;

              const perfRows: Array<{ label: string; value: number | null; loading: boolean }> = [
                { label: "1D", value: position.changePct1D, loading: false },
                {
                  label: "1W",
                  value: position.perf?.changePct1W ?? null,
                  loading: !!perfLoadingMap[position.id] && !position.perf,
                },
                {
                  label: "3M",
                  value: position.perf?.changePct3M ?? null,
                  loading: !!perfLoadingMap[position.id] && !position.perf,
                },
                {
                  label: "YTD",
                  value: position.perf?.changePctYTD ?? null,
                  loading: !!perfLoadingMap[position.id] && !position.perf,
                },
                {
                  label: "1Y",
                  value: position.perf?.changePct1Y ?? null,
                  loading: !!perfLoadingMap[position.id] && !position.perf,
                },
              ];

              return (
                <div
                  key={position.id}
                  className="grid min-w-[740px] grid-cols-[88px_minmax(280px,1fr)_148px_112px_88px_36px] items-center gap-3 px-3 py-3 sm:px-4"
                >
                  <Input
                    ref={(node) => {
                      tickerInputRefs.current[position.id] = node;
                    }}
                    value={position.ticker}
                    maxLength={10}
                    placeholder="TICK"
                    onChange={(event) => handleTickerChange(position.id, event.target.value)}
                    onKeyDown={(event) => handleTickerKeyDown(event, position.id, position.ticker)}
                    onBlur={() => handleTickerBlur(position.id, position.ticker)}
                    className="h-9 border-[#27272a] bg-[#09090b] px-2 text-center text-base font-semibold uppercase text-[#f59e0b] [font-family:var(--font-mono)] placeholder:text-[#3f3f46]"
                  />

                  <div
                    className="relative"
                    onMouseEnter={() => handlePositionMouseEnter(position)}
                    onMouseLeave={handlePositionMouseLeave}
                  >
                    {position.loading ? (
                      <div className="space-y-2 py-0.5">
                        <Skeleton className="h-3 w-44 bg-[#27272a]" />
                        <Skeleton className="h-3 w-28 bg-[#27272a]" />
                      </div>
                    ) : position.error ? (
                      <p className="text-sm text-[#f87171]">{position.error}</p>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-xs text-[#71717a]">
                            {position.name || (position.ticker ? "Waiting for quote" : "Enter ticker")}
                          </p>
                          {typeof position.price === "number" ? (
                            <p className="mt-0.5 flex items-center gap-2 text-sm [font-family:var(--font-mono)]">
                              <span className="text-[#4ade80]">{currency.format(position.price)}</span>
                              <span className={perfColor(position.changePct1D)}>{formatSignedPct(position.changePct1D)}</span>
                              <span className="text-[#52525b]">···</span>
                            </p>
                          ) : (
                            <p className="mt-0.5 text-sm text-[#52525b] [font-family:var(--font-mono)]">--</p>
                          )}
                        </div>
                      </div>
                    )}

                    {showPopover && (
                      <div
                        className="absolute left-0 top-[calc(100%+8px)] z-20 w-64 rounded-sm border border-[#27272a] bg-[#121214] p-3 shadow-xl"
                        onMouseEnter={handlePopoverMouseEnter}
                        onMouseLeave={handlePopoverMouseLeave}
                      >
                        <p className="text-lg text-[#e4e4e7] [font-family:var(--font-mono)]">
                          {currency.format(position.price ?? 0)}
                        </p>
                        <p className={`mt-1 text-sm ${perfColor(position.changePct1D)}`}>
                          {typeof position.changePct1D === "number"
                            ? `${position.changePct1D >= 0 ? "▲" : "▼"} ${formatSignedPct(position.changePct1D)} today`
                            : "-- today"}
                        </p>
                        <div className="mt-3 space-y-2">
                          {perfRows.map((row) => (
                            <div key={row.label} className="grid grid-cols-[24px_44px_1fr] items-center gap-2 text-xs">
                              <span className="text-[#a1a1aa]">{row.label}</span>
                              {row.loading ? <Skeleton className="h-1.5 w-11 bg-[#27272a]" /> : <PerfBar value={row.value} />}
                              <span className={`text-right [font-family:var(--font-mono)] ${perfColor(row.value)}`}>
                                {row.loading ? <Skeleton className="ml-auto h-3 w-12 bg-[#27272a]" /> : formatSignedPct(row.value)}
                              </span>
                            </div>
                          ))}
                        </div>
                        <p className="mt-3 text-[11px] text-[#52525b]">Prices may be delayed</p>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-[32px_1fr_32px] items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon-sm"
                      onClick={(event) => incrementShares(position, event, -1)}
                      className="h-8 w-8 border-[#27272a] bg-[#09090b] text-[#e4e4e7] hover:bg-[#202024]"
                    >
                      -
                    </Button>
                    <Input
                      ref={(node) => {
                        shareInputRefs.current[position.id] = node;
                      }}
                      value={position.shares}
                      onChange={(event) => handleShareChange(event, position.id)}
                      className="h-8 border-[#27272a] bg-[#09090b] px-2 text-center text-sm [font-family:var(--font-mono)]"
                    />
                    <Button
                      variant="outline"
                      size="icon-sm"
                      onClick={(event) => incrementShares(position, event, 1)}
                      className="h-8 w-8 border-[#27272a] bg-[#09090b] text-[#e4e4e7] hover:bg-[#202024]"
                    >
                      +
                    </Button>
                  </div>

                  <p className="text-right text-sm [font-family:var(--font-mono)]">{currency.format(total)}</p>
                  <div className="flex justify-center">
                    <span className="rounded border border-[#7c5412] bg-[#2f230f] px-2 py-0.5 text-xs text-[#f59e0b] [font-family:var(--font-mono)]">
                      {pctBudget.toFixed(1)}%
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removePosition(position.id)}
                    className="h-8 w-8 text-[#71717a] hover:bg-[#202024] hover:text-[#f87171]"
                    aria-label="Remove position"
                  >
                    ×
                  </Button>
                </div>
              );
            })}
          </div>

          <div className="p-4">
            <Button
              variant="outline"
              onClick={() => {
                const newId = addPosition();
                requestAnimationFrame(() => tickerInputRefs.current[newId]?.focus());
              }}
              className="h-10 w-full border border-dashed border-[#3f3f46] bg-transparent text-sm tracking-[0.14em] text-[#a1a1aa] hover:bg-[#202024] hover:text-[#e4e4e7]"
            >
              + ADD POSITION
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}
