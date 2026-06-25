"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ShareInputProps {
  value: number;
  disabled?: boolean;
  inputRef?: (node: HTMLInputElement | null) => void;
  onChange: (value: number) => void;
}

function formatShareDraft(value: number) {
  return Number.isFinite(value) ? String(value) : "0";
}

export function ShareInput({ value, disabled, inputRef, onChange }: ShareInputProps) {
  const [draft, setDraft] = useState(() => formatShareDraft(value));
  const focusedRef = useRef(false);

  useEffect(() => {
    if (!focusedRef.current) {
      setDraft(formatShareDraft(value));
    }
  }, [value]);

  const step = (direction: -1 | 1) => {
    const next = Math.max(0, value + direction);
    setDraft(formatShareDraft(next));
    onChange(next);
  };

  const commitDraft = () => {
    const parsed = Number.parseFloat(draft);
    const next = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
    setDraft(formatShareDraft(next));
    onChange(next);
  };

  return (
    <div className="grid grid-cols-[28px_minmax(60px,1fr)_28px] items-center gap-1">
      <Button
        variant="outline"
        size="icon-sm"
        disabled={disabled}
        onClick={() => step(-1)}
        className="h-8 w-7 border-[#27272a] bg-[#09090b] text-[#e4e4e7] hover:bg-[#202024]"
        aria-label="Decrease shares by one"
      >
        -
      </Button>
      <Input
        ref={inputRef}
        value={draft}
        disabled={disabled}
        inputMode="decimal"
        aria-label="Shares"
        onFocus={() => {
          focusedRef.current = true;
        }}
        onChange={(event) => {
          const nextDraft = event.target.value;
          if (!/^(?:\d+(?:\.\d*)?|\.\d*)?$/.test(nextDraft)) {
            return;
          }

          setDraft(nextDraft);
          const parsed = Number.parseFloat(nextDraft);
          if (Number.isFinite(parsed) && parsed >= 0) {
            onChange(parsed);
          }
        }}
        onBlur={() => {
          focusedRef.current = false;
          commitDraft();
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowUp" || event.key === "ArrowDown") {
            event.preventDefault();
            step(event.key === "ArrowUp" ? 1 : -1);
          }
          if (event.key === "Enter") {
            commitDraft();
            event.currentTarget.select();
          }
        }}
        className="h-8 min-w-0 border-[#27272a] bg-[#09090b] px-1 text-center text-sm [font-family:var(--font-mono)] disabled:border-[#14532d] disabled:text-[#86efac]"
      />
      <Button
        variant="outline"
        size="icon-sm"
        disabled={disabled}
        onClick={() => step(1)}
        className="h-8 w-7 border-[#27272a] bg-[#09090b] text-[#e4e4e7] hover:bg-[#202024]"
        aria-label="Increase shares by one"
      >
        +
      </Button>
    </div>
  );
}
