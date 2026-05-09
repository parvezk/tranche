import type React from "react";
import { PerfBar } from "@/components/perf-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { currency, formatSignedPct, perfColor } from "@/lib/utils";
import type { Position } from "@/lib/store";

interface PositionRowProps {
  position: Position;
  budget: number;
  activePopoverId: string | null;
  popoverPosition: { top: number; left: number } | null;
  perfLoadingMap: Record<string, boolean>;
  tickerInputRef: (node: HTMLInputElement | null) => void;
  shareInputRef: (node: HTMLInputElement | null) => void;
  handleTickerChange: (positionId: string, value: string) => void;
  handleTickerKeyDown: (event: React.KeyboardEvent<HTMLInputElement>, positionId: string, ticker: string) => void;
  handleTickerBlur: (positionId: string, ticker: string) => void;
  handlePositionMouseEnter: (position: Position, currentTarget: HTMLElement) => void;
  handlePositionMouseLeave: () => void;
  handlePopoverMouseEnter: () => void;
  handlePopoverMouseLeave: () => void;
  incrementShares: (position: Position, event: React.MouseEvent, amount: number) => void;
  handleShareChange: (event: React.ChangeEvent<HTMLInputElement>, positionId: string) => void;
  removePosition: (id: string) => void;

}

export function PositionRow({
  position,
  budget,
  activePopoverId,
  popoverPosition,
  perfLoadingMap,
  tickerInputRef,
  shareInputRef,
  handleTickerChange,
  handleTickerKeyDown,
  handleTickerBlur,
  handlePositionMouseEnter,
  handlePositionMouseLeave,
  handlePopoverMouseEnter,
  handlePopoverMouseLeave,
  incrementShares,
  handleShareChange,
  removePosition,

}: PositionRowProps) {
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
    <div className="grid min-w-[740px] grid-cols-[88px_minmax(280px,1fr)_148px_112px_88px_36px] items-center gap-3 px-3 py-3 sm:px-4">
      <Input
        ref={tickerInputRef}
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
        onMouseEnter={(event) => handlePositionMouseEnter(position, event.currentTarget)}
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

        {showPopover && popoverPosition && (
          <div
            className="fixed z-40 w-64 rounded-sm border border-[#27272a] bg-[#121214] p-3 shadow-xl"
            style={{ top: popoverPosition.top, left: popoverPosition.left }}
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
          ref={shareInputRef}
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
}
