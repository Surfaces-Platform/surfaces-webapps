# Feature Plan

## Summary
This feature upgrades governance prototype `p0003` into a persistence-first workflow at `/contracts/governance?prototype=p0003`. It adds snapshot history, persistent decision logging, and a writable draft contract artifact that is mutated only through explicit accepted-apply actions. The prototype preserves `p0001` and `p0002` as historical read-only references while introducing local deterministic file persistence for governance actions.

## Strategy alignment
This work strengthens the decision filter sentence by converting extraction compare outcomes into explicit, durable governance decisions that can be replayed into a draft contract artifact. It ensures that contract evolution is gated by explicit `accept/reject/evolve` choices and avoids silent mutation pathways.

Decision filter sentence
"When an agent proposes a change to the user experience, Surfaces determines whether that change is allowed, under what conditions it may proceed, and blocks or corrects it if it violates intent."

## Contract impact
1. Contract definition
- No canonical platform contract schema changes.
- Adds governance prototype persistence artifacts and semantics:
  - `contract.draft.json` as the only writable contract artifact in `p0003`.
  - `snapshot-index.json` baseline/latest snapshot pointers.
  - `decisions.json` accept/reject/evolve logs.
  - `applies.json` materialization logs.
- Conservative apply mapping:
  - `authaware-diff` -> `generation.structuralChangesRequireReview`.
  - `hasshell-diff` -> `layout.requireGlobalHeader`.
  - `routes-diff` and `design-diff` are accepted but skipped for auto-mutation.

2. Enforcement timing
- `Generation time`: governance compare, decision logging, and draft mutation.
- `CI/CD time`: unchanged.
- `Runtime (edge)`: unchanged.

3. Violation handling
- Invalid payloads and non-`p0003` writes are blocked (400/403).
- Unsupported auto-apply operations are signaled and logged as skipped.
- Every apply attempt is logged in `applies.json`.

## Surface impact
- `surfaceops.ai`: primary surface for this prototype workflow.
- `surfaces.systems`: optional dogfood extraction input via generated `surfaces-web.extraction.json` (not product authority).
- `interfacectl`: unchanged behavior; still used to generate extraction artifacts.

## Non-goals
- No runtime (edge) enforcement changes.
- No CI/CD policy changes.
- No DB-backed persistence; file-only deterministic storage.
- No write capabilities for `p0001` or `p0002`.

## Acceptance criteria
1. `p0003` ingests multiple snapshots and shows timeline ordering.
2. Compare uses selected snapshot vs baseline snapshot.
3. Decision actions survive refresh/restart via `decisions.json`.
4. Apply accepted mutates only allowed fields in `contract.draft.json`.
5. Apply updates baseline snapshot pointer to selected snapshot.
6. `routes-diff` and `design-diff` accepted actions are logged as skipped with reason.
7. `POST /api/prototypes/governance/*` rejects non-`p0003` mutations.
8. `p0001` and `p0002` remain selectable and read-only.
9. `/contracts` and `/contracts/runs` remain unaffected.
10. Type-check and tests pass for affected packages/scripts.

## Risks and drift checks
1. Risk: drifting into analytics/dashboard framing.
- Mitigation: each diff row requires explicit decision state and apply path.
2. Risk: source-of-truth ambiguity between seed/draft/snapshots.
- Mitigation: explicit labels and single writable artifact (`contract.draft.json`).
3. Risk: unsafe auto-apply behavior.
- Mitigation: conservative apply mapping and explicit skipped reasons for non-mappable diffs.

## Implementation outline
1. Create and activate `p0003`.
2. Scaffold persistence artifacts (`draft`, `snapshots`, `index`, `decisions`, `applies`).
3. Add shared persistence helpers with atomic write semantics.
4. Extend registry loading for draft/snapshot/decision/apply context.
5. Add snapshot/decision/apply API routes with strict `p0003` guards.
6. Extend snapshot script to append timestamped snapshots and update index.
7. Upgrade governance UI with timeline selection and persistent decision/apply actions.
8. Validate with type-check and targeted tests.
