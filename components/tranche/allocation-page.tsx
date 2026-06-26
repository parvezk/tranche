"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { PreviewCard } from "@base-ui/react/preview-card";
import { toast } from "sonner";

import { MarketStrip } from "@/components/tranche/market-strip";
import { NotePopover } from "@/components/tranche/note-popover";
import { ShareInput } from "@/components/tranche/share-input";
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
    reorderPosition,
    updateTicker,
    setPrice,
    setShares,
    setNotes,
    toggleLocked,
    setLoading,
    setError,
    setPerf,
    resetMarketData,
    clearAllocations,
    clearUnlockedAllocations,
    clearEverything,
    replaceFromShareState,
  } = useTrancheStore();

  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetDraft, setBudgetDraft] = useState("");
  const [activePopoverId, setActivePopoverId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [perfLoadingMap, setPerfLoadingMap] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  const tickerInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const shareInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const priceRequestSeqRef = useRef<Record<string, number>>({});
  const perfRequestSeqRef = useRef<Record<string, number>>({});
  const initializedRef = useRef(false);

  const allocated = useMemo(
    () =>
      positions.reduce(
        (total, position) =>
          total +
          (typeof (position.locked ? position.lockedPrice : position.price) === "number"
            ? (position.locked ? position.lockedPrice ?? 0 : position.price ?? 0) * position.shares
            : 0),
        0,
      ),
    [positions],
  );
  const remaining = budget - allocated;
  const overBudget = allocated > budget;
  const progressRatio = budget > 0 ? allocated / budget : 0;
  const progressValue = Math.max(0, Math.min(progressRatio * 100, 100));
  const progressColorClass = getProgressColor(progressRatio);

  const fetchPrice = useCallback(
    async (positionId: string, ticker: string) => {
      const cleanedTicker = ticker.trim().toUpperCase();
      const currentPosition = useTrancheStore
        .getState()
        .positions.find((position) => position.id === positionId);
      if (currentPosition?.locked) {
        return;
      }

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
      const position = useTrancheStore.getState().positions.find((candidate) => candidate.id === positionId);
      if (position?.locked) {
        return;
      }
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

      if (position.locked) return;

      if (position.price === null && !position.loading && !position.error) {
        void fetchPrice(positionId, ticker);
      }
    },
    [fetchPrice],
  );

  const requestReset = useCallback(() => {
    const hasLockedPositions = useTrancheStore.getState().positions.some((position) => position.locked);
    if (hasLockedPositions) {
      setResetDialogOpen(true);
      return;
    }

    clearEverything();
    toast.success("Allocation and proceeds reset");
  }, [clearEverything]);

  const resetKeepingLocked = useCallback(() => {
    clearUnlockedAllocations();
    setResetDialogOpen(false);
    toast.success("Unlocked positions cleared");
  }, [clearUnlockedAllocations]);

  const resetIncludingLocked = useCallback(() => {
    clearAllocations();
    setResetDialogOpen(false);
    toast.success("All positions cleared");
  }, [clearAllocations]);

  const saveAllocation = useCallback(async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/allocations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          budget,
          allocated,
          positions,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "Unable to save allocation");
      }

      toast.success("Allocation saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save allocation");
    } finally {
      setSaving(false);
    }
  }, [allocated, budget, positions]);

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>, targetId: string) => {
      event.preventDefault();
      const sourceId = event.dataTransfer.getData("text/plain");
      setDragOverId(null);
      if (sourceId) {
        reorderPosition(sourceId, targetId);
      }
    },
    [reorderPosition],
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
        <div className="flex flex-col gap-3 pb-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-[34px] font-normal leading-none text-[#ffffff] [font-family:var(--font-logo)]">Tranche</h1>
            <p className="text-sm text-[#a1a1aa]">Stock allocation tool.</p>
          </div>
          <nav className="flex w-full gap-2 rounded-sm border border-[#27272a] bg-[#111113] p-1 sm:w-auto">
            <Link
              href="/allocation"
              className="flex-1 rounded-sm bg-[#f59e0b] px-4 py-2 text-center text-xs font-bold uppercase tracking-[0.12em] text-[#09090b] sm:flex-none"
            >
              Allocation
            </Link>
            <Link
              href="/history"
              className="flex-1 rounded-sm px-4 py-2 text-center text-xs font-bold uppercase tracking-[0.12em] text-[#e4e4e7] hover:bg-[#202024] sm:flex-none"
            >
              History
            </Link>
          </nav>
        </div>

        <header className="overflow-hidden rounded-sm border border-[#1a1a1e] bg-[#18181b]">
          <div className="flex flex-col gap-4 px-4 pb-4 pt-4 sm:px-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
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
                  className="group mt-1 flex flex-col items-start rounded-sm border border-dashed border-[#7c5412] bg-[#211908] text-left transition hover:border-[#f59e0b] hover:bg-[#2a200b]"
                  aria-label="Edit proceeds to allocate"
                >
                  <span className="-mt-px border-b border-r border-[#7c5412] bg-[#18181b] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#a1a1aa] group-hover:text-[#d4d4d8]">
                    Proceeds to allocate
                  </span>
                  <span className="flex items-baseline gap-3 px-3 pb-2 pt-1">
                    <span className="text-3xl text-[#e4e4e7] [font-family:var(--font-ui)]">$</span>
                    <span className="text-[42px] font-bold leading-none text-[#f59e0b] [font-family:var(--font-ui)]">
                      {budgetNumber.format(budget)}
                    </span>
                  </span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:flex sm:items-start sm:gap-4 lg:gap-5">
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
              <div className="col-span-2 flex gap-1 sm:col-span-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void saveAllocation()}
                  disabled={saving}
                  className="mt-0.5 flex-1 border-[#7c5412] bg-[#f59e0b] px-2.5 text-[#09090b] hover:bg-[#fbbf24] sm:flex-none"
                >
                  {saving ? "Saving..." : "Save"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={requestReset}
                  className="mt-0.5 flex-1 border-[#3f3f46] bg-transparent px-2.5 text-[#f87171] hover:border-[#7f1d1d] hover:bg-[#2b1215] sm:flex-none"
                >
                  Reset
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void copyShareLink()}
                className="col-span-2 mt-0.5 w-full border-[#27272a] bg-transparent px-2.5 text-[#e4e4e7] hover:bg-[#202024] sm:col-span-1 sm:w-auto"
              >
                Share
              </Button>
            </div>
          </div>
          <MarketStrip />
          <Progress
            value={progressValue}
            className="h-[2px] rounded-none bg-[#27272a]"
            indicatorClassName={`rounded-none ${progressColorClass}`}
          />
        </header>

        <section className="relative rounded-sm border border-[#1a1a1e] bg-[#18181b]">
          <div className="overflow-x-auto overflow-y-hidden">
            <div className="grid min-w-[872px] grid-cols-[22px_26px_82px_minmax(190px,1fr)_130px_102px_78px_44px_56px] items-center gap-2 border-b border-[#27272a] bg-[#111113] px-2 py-3 text-[11px] font-bold uppercase tracking-[0.1em] text-[#d4d4d8] sm:px-3">
              <span className="text-center">#</span>
              <span className="text-center text-sm tracking-normal">✓</span>
              <span>Ticker</span>
              <span>Name / Price</span>
              <span className="text-center">Shares</span>
              <span className="text-right">Total</span>
              <span className="text-center">% Budget</span>
              <span className="text-center">Note</span>
              <span className="text-center">Del</span>
            </div>

            <div className="divide-y divide-[#1a1a1e]">
            {positions.map((position, index) => {
              const displayPrice = position.locked ? position.lockedPrice : position.price;
              const total = typeof displayPrice === "number" ? displayPrice * position.shares : 0;
              const pctBudget = budget > 0 ? (total / budget) * 100 : 0;
              const showPopover = activePopoverId === position.id && typeof displayPrice === "number" && !position.error;

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
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", position.id);
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragOverId(position.id);
                  }}
                  onDragLeave={() => setDragOverId(null)}
                  onDrop={(event) => handleDrop(event, position.id)}
                  onDragEnd={() => setDragOverId(null)}
                  className={`grid min-w-[872px] cursor-grab grid-cols-[22px_26px_82px_minmax(190px,1fr)_130px_102px_78px_44px_56px] items-center gap-2 px-2 py-3 active:cursor-grabbing sm:px-3 ${
                    dragOverId === position.id ? "bg-[#202024]" : position.locked ? "bg-[#111816]" : ""
                  }`}
                >
                  <span className="text-center text-sm font-bold text-[#f4f4f5] [font-family:var(--font-mono)]">
                    {index + 1}
                  </span>
                  <label className="flex items-center justify-center" title={position.locked ? "Unlock row" : "Lock row and price"}>
                    <input
                      type="checkbox"
                      checked={position.locked}
                      onChange={() => toggleLocked(position.id)}
                      className="h-5 w-5 accent-[#4ade80]"
                    />
                  </label>
                  <Input
                    ref={(node) => {
                      tickerInputRefs.current[position.id] = node;
                    }}
                    value={position.ticker}
                    maxLength={10}
                    placeholder="TICK"
                    disabled={position.locked}
                    onChange={(event) => handleTickerChange(position.id, event.target.value)}
                    onKeyDown={(event) => handleTickerKeyDown(event, position.id, position.ticker)}
                    onBlur={() => handleTickerBlur(position.id, position.ticker)}
                    className="h-9 border-[#27272a] bg-[#09090b] px-2 text-center text-base font-semibold uppercase text-[#f59e0b] [font-family:var(--font-mono)] placeholder:text-[#3f3f46] disabled:border-[#14532d] disabled:text-[#86efac]"
                  />

                  <PreviewCard.Root
                    open={showPopover}
                    onOpenChange={(open) => {
                      if (open) {
                        if (typeof displayPrice === "number" && !position.error) {
                          setActivePopoverId(position.id);
                          void fetchPerf(position);
                        }
                        return;
                      }
                      setActivePopoverId((current) => (current === position.id ? null : current));
                    }}
                  >
                    <PreviewCard.Trigger
                      delay={180}
                      closeDelay={130}
                      render={
                        <div>
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
                                <p className="truncate text-xs font-medium text-[#ffffff]">
                                  {position.name || (position.ticker ? "Waiting for quote" : "Enter ticker")}
                                </p>
                                {typeof displayPrice === "number" ? (
                                  <p className="mt-0.5 flex items-center gap-2 text-sm [font-family:var(--font-mono)]">
                                    <span className={position.locked ? "text-[#86efac]" : "text-[#4ade80]"}>
                                      {currency.format(displayPrice)}
                                    </span>
                                    <span className={perfColor(position.changePct1D)}>
                                      {formatSignedPct(position.changePct1D)}
                                    </span>
                                    <span className="text-[#52525b]">...</span>
                                    {position.locked && (
                                      <span className="rounded-sm border border-[#14532d] px-1.5 py-0.5 text-[10px] uppercase tracking-[0.1em] text-[#86efac]">
                                        Locked
                                      </span>
                                    )}
                                  </p>
                                ) : (
                                  <p className="mt-0.5 text-sm text-[#52525b] [font-family:var(--font-mono)]">--</p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      }
                    />
                    <PreviewCard.Portal>
                      <PreviewCard.Positioner side="bottom" align="start" sideOffset={8} collisionPadding={12}>
                        <PreviewCard.Popup className="z-50 w-64 rounded-sm border border-[#27272a] bg-[#121214] p-3 shadow-xl">
                          <p className="text-lg text-[#e4e4e7] [font-family:var(--font-mono)]">
                            {currency.format(displayPrice ?? 0)}
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
                                  {row.loading ? (
                                    <Skeleton className="ml-auto h-3 w-12 bg-[#27272a]" />
                                  ) : (
                                    formatSignedPct(row.value)
                                  )}
                                </span>
                              </div>
                            ))}
                          </div>
                          <p className="mt-3 text-[11px] text-[#52525b]">Prices may be delayed</p>
                        </PreviewCard.Popup>
                      </PreviewCard.Positioner>
                    </PreviewCard.Portal>
                  </PreviewCard.Root>

                  <ShareInput
                    value={position.shares}
                    disabled={position.locked}
                    inputRef={(node) => {
                      shareInputRefs.current[position.id] = node;
                    }}
                    onChange={(shares) => setShares(position.id, shares)}
                  />

                  <p className="text-right text-sm [font-family:var(--font-mono)]">{currency.format(total)}</p>
                  <div className="flex justify-center">
                    <span className="rounded border border-[#7c5412] bg-[#2f230f] px-2 py-0.5 text-xs text-[#f59e0b] [font-family:var(--font-mono)]">
                      {pctBudget.toFixed(1)}%
                    </span>
                  </div>
                  <NotePopover
                    position={position}
                    isOpen={activeNoteId === position.id}
                    onToggle={() => setActiveNoteId((current) => (current === position.id ? null : position.id))}
                    onClose={() => setActiveNoteId(null)}
                    onChange={(notes) => setNotes(position.id, notes)}
                  />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={position.locked}
                    onClick={() => removePosition(position.id)}
                    className="h-10 w-10 justify-self-center text-3xl leading-none text-[#c4c4cc] hover:bg-[#202024] hover:text-[#f87171]"
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
          </div>
        </section>
      </div>
      {resetDialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setResetDialogOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-title"
            className="w-full max-w-md rounded-sm border border-[var(--tranche-border-strong)] bg-[var(--tranche-panel)] p-5 shadow-2xl"
          >
            <p id="reset-title" className="text-lg font-semibold text-[#f4f4f5]">
              Reset allocation?
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--tranche-muted)]">
              This allocation contains locked positions. Your proceeds budget will be preserved either way.
            </p>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="ghost" onClick={() => setResetDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="outline" onClick={resetKeepingLocked} className="border-[var(--tranche-border-strong)]">
                Keep locked
              </Button>
              <Button variant="destructive" onClick={resetIncludingLocked}>
                Clear all positions
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
