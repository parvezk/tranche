import type React from "react";

export function PerfBar({ value }: { value: number | null }) {
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
