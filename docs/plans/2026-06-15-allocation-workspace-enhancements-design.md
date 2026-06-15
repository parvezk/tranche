# Allocation Workspace Enhancements

## Goals

- Accept and persist fractional share quantities such as `.250`.
- Keep the allocation table usable on smaller desktop screens and iPad landscape.
- Let a focused shares input increment or decrement by one with the arrow keys.
- Replace the wide notes field with a compact popover.
- Add a 30-second market strip that toggles between major indexes and selected ETFs.
- Add reset behavior that respects locked positions.

## Interaction Design

The shares input keeps a local text draft so intermediate decimal values such as `.`, `.2`, and `.250` remain editable. Valid non-negative values update the allocation immediately. Arrow Up and Arrow Down change the stored quantity by one, as do the existing plus and minus buttons.

Notes are represented by a small button in each row. The button indicates whether a note exists and opens an anchored popover containing the editable text area. Locked rows expose their note for reading but do not allow editing.

The header includes a compact market strip with evenly spaced quote cells. Index mode shows S&P 500, Nasdaq, Dow Jones, Russell 2000, and MSCI World. ETF mode shows VOO, QQQ, VTI, VT, VXUS, VONE, IEUR, and EEM. A control at the right switches modes. Quotes refresh every 30 seconds and use green or red daily movement styling. Data may be delayed by the upstream quote provider.

Reset sits beside Save with tighter button spacing:

- When no positions are locked, reset clears all positions and sets the proceeds budget to zero.
- When locked positions exist, reset opens a modal.
- Keep Locked preserves the budget and locked rows while removing unlocked rows.
- Clear All preserves the budget but removes every row, including locked rows.

## Layout

The current dark, dense allocation-workbench aesthetic remains. The notes column contracts to a compact icon column, action buttons form a close group, and the table grid uses smaller minimum widths. At desktop and iPad-landscape widths, the full working row should fit without page-level overflow. At narrower widths, the table retains contained horizontal scrolling rather than compressing controls below usable sizes.

## Data And API

Fractional quantities remain numeric in Zustand persistence and share URLs. A batch market endpoint fetches the configured symbols concurrently through the existing Yahoo chart helper and returns normalized price and daily change data. The client polls that endpoint every 30 seconds and retains the last successful values when a refresh partially fails.

## Validation

- Unit-test share parsing/formatting and reset state transitions where practical.
- Run TypeScript/build validation.
- Exercise fractional editing, arrow stepping, notes, reset choices, and quote toggling.
- Inspect the allocation page at wide desktop, MacBook Air, and iPad-landscape viewport sizes.
