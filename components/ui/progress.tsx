"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  indicatorClassName?: string;
}

function Progress({ className, value = 0, indicatorClassName, ...props }: ProgressProps) {
  return (
    <div className={cn("relative h-2 w-full overflow-hidden bg-[#27272a]", className)} {...props}>
      <div
        className={cn("h-full w-full flex-1 bg-[#4ade80] transition-all", indicatorClassName)}
        style={{ transform: `translateX(-${100 - Math.max(0, Math.min(value, 100))}%)` }}
      />
    </div>
  );
}

export { Progress };
