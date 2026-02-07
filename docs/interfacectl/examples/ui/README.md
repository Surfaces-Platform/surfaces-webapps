# UI validation micro-example

Two blocks to demonstrate contract validation on raw color usage:
- `raw-color.tsx`: uses `rgba(...)` (should be flagged).
- `fixed-color.tsx`: uses `var(--background)` (should pass).

Suggested flow:
1. Import `RawColorBlock` into any page, run `pnpm validate:local` to see the violation.
2. Swap to `FixedColorBlock`, rerun validation to see it pass.
