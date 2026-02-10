# Contract Evolution Tracking Plan (Strategy-Aligned)

## Why this exists
This plan operationalizes `docs/strategy.md` by ensuring contract enforcement outcomes are tracked across:
- bootstrap
- generation
- ci
- runtime

It closes the gap where demos proved enforcement, but SurfaceOps only showed point-in-time state.

## Phase 1 (implemented)
1. Repo-backed run artifacts in `contracts/generated/`:
   - `contract-runs.json`
   - `contract-lineage.json`
2. Demo emitters now append normalized run events.
3. Bootstrap demo supports `--promote` to write extraction/contract artifacts to canonical generated paths.
4. SurfaceOps reads `contract-runs.json` first, with fallback to existing extraction/outcomes logic.
5. SurfaceOps runs list and detail pages show latest source/time/version and a per-surface evolution timeline + finding code delta.
6. CI validates run-artifact schema via `pnpm run validate:run-artifacts`.

## Phase 2 (next)
1. Strengthen idempotency and ordering guarantees in run writes.
2. Add per-source KPIs in SurfaceOps (pass rate, recurring codes, time-to-green).
3. Add promotion checks driven by run history.
4. Add `RunStore` DB implementation while keeping JSON compatibility.

## Strategy check
- Contracts over conventions: run artifacts are deterministic and validated.
- Gates before feedback: demos emit gate outcomes at each enforcement point.
- Same contract, many surfaces: one run schema spans all sources.
- Observability does not replace enforcement: run timeline visualizes outcomes, it does not weaken blocking semantics.
