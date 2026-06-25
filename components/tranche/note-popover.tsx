"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { type Position } from "@/lib/store";

interface NotePopoverProps {
  position: Position;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onChange: (notes: string) => void;
}

const NOTE_BUTTON_BASE =
  "relative h-8 w-8 border hover:bg-[var(--tranche-hover)] hover:text-[var(--tranche-warning)]";
const NOTE_BUTTON_FILLED =
  "border-[var(--tranche-warning-border)] bg-[var(--tranche-warning-surface)] text-[var(--tranche-warning)]";
const NOTE_BUTTON_EMPTY = "border-[var(--tranche-border-muted)] text-[var(--tranche-muted-strong)]";
const POPOVER_WIDTH = 320;

export function NotePopover({ position, isOpen, onToggle, onClose, onChange }: NotePopoverProps) {
  const hasNote = position.notes.length > 0;
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;

      const viewportPadding = 12;
      const left = Math.min(
        Math.max(rect.right - POPOVER_WIDTH, viewportPadding),
        window.innerWidth - POPOVER_WIDTH - viewportPadding,
      );
      const top = Math.min(rect.bottom + 10, window.innerHeight - 190);
      setPopoverPosition({ top: Math.max(top, viewportPadding), left });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen]);

  return (
    <div className="relative flex justify-center">
      <Button
        ref={buttonRef}
        variant="ghost"
        size="icon-sm"
        onClick={onToggle}
        className={`${NOTE_BUTTON_BASE} ${hasNote ? NOTE_BUTTON_FILLED : NOTE_BUTTON_EMPTY}`}
        aria-label={hasNote ? "Open position note" : "Add position note"}
        aria-expanded={isOpen}
      >
        <span aria-hidden="true">✎</span>
        {hasNote && <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-[var(--tranche-warning)]" />}
      </Button>
      {isOpen && (
        <div
          className="fixed z-50 w-80 rounded-sm border border-[var(--tranche-border-strong)] bg-[var(--tranche-popover)] p-3 shadow-2xl"
          style={{ top: popoverPosition.top, left: popoverPosition.left }}
        >
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--tranche-muted)]">
              {position.ticker || "Position"} note
            </p>
            <button
              type="button"
              onClick={onClose}
              className="px-1 text-lg leading-none text-[var(--tranche-muted-strong)] hover:text-[var(--tranche-text)]"
              aria-label="Close note"
            >
              ×
            </button>
          </div>
          <textarea
            value={position.notes}
            maxLength={160}
            placeholder="Add note"
            disabled={position.locked}
            autoFocus={!position.locked}
            onChange={(event) => onChange(event.target.value)}
            className="h-24 w-full resize-none rounded-sm border border-[var(--tranche-border-muted)] bg-[var(--tranche-page)] px-2 py-2 text-xs leading-4 text-[var(--tranche-text)] outline-none placeholder:text-[var(--tranche-muted-strong)] focus:border-[var(--tranche-warning)] disabled:border-[var(--tranche-success-border)] disabled:text-[var(--tranche-success-soft)]"
          />
          <p className="mt-1 text-right text-[10px] text-[var(--tranche-muted-strong)]">{position.notes.length}/160</p>
        </div>
      )}
    </div>
  );
}
