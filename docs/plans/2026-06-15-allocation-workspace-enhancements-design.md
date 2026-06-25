# Allocation Workspace Enhancements

## Scope

- Fractional share input accepts drafts like `.250`, updates totals live, and steps by one with Arrow Up/Down or +/-.
- Notes move into a compact per-row popover so the table fits smaller desktop and iPad-landscape widths.
- The header shows a 30-second quote strip toggling between major indexes and ETFs.
- Reset clears unlocked allocations directly, but prompts when locked rows exist.
- History handles paused or unreachable Supabase responses without rendering raw upstream HTML.

## Reset Rules

- No locked rows: clear positions and set proceeds to zero.
- Locked rows + Keep locked: preserve budget and locked rows, clear everything else.
- Locked rows + Clear all: preserve budget, clear all rows.

## Validation

Run the production build, check fractional editing and reset choices, verify index/ETF quote toggling, and inspect the allocation/history pages at smaller desktop widths.
