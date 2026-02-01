# Decisions

- **stableId-first correlation for signals** — Signals are correlated by a stable identifier so that the same logical signal can be tracked across time and surfaces.
- **Excerpts are capped and redacted** — Displayed excerpts (e.g. in lists or detail views) are length-limited and may be redacted for safety and consistency.
- **v1 supports diff + validate first; enforce and compile later** — The first version focuses on diffing and validation; enforcement and compile-time integration are planned for later.
