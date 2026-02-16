# Feature Plan

## Summary
`p0004` refactors SurfaceOps governance UX into an editor-first workflow with progressive disclosure. The default screen emphasizes draft rule editing while snapshot review and full contract artifacts are moved behind explicit actions (modal/drawer). This reduces cognitive load and avoids exposing the full data model before users need it.

## Strategy alignment
This work strengthens the decision filter by keeping governance actions explicit while reducing UI noise that obscures decision-making. Users can still accept/reject/evolve and apply accepted changes, but the interface now prioritizes the immediate activity instead of exposing all model details at once.

Decision filter sentence
"When an agent proposes a change to the user experience, Surfaces determines whether that change is allowed, under what conditions it may proceed, and blocks or corrects it if it violates intent."

## Contract impact
1. Contract definition
- No canonical contract schema changes.
- No persistence schema changes (`snapshot-index.json`, `decisions.json`, `applies.json` unchanged).
- UI-only restructuring for task-first workflows.

2. Enforcement timing
- `Generation time`: governance editing/review/apply flow UX.
- `CI/CD time`: unchanged.
- `Runtime (edge)`: unchanged.

3. Violation handling
- Publish remains disabled when blocking findings exist.
- Disabled reason is visible in sticky header action rail.
- Snapshot apply behavior and skipped reasons remain unchanged.

## Surface impact
- `surfaceops.ai`: primary and only affected surface.
- `interfacectl`: no behavior changes.
- `surfaces.systems`: optional dogfood extraction input; no canonical authority semantics.

## Non-goals
- No runtime (edge) enforcement changes.
- No CI/CD pipeline changes.
- No API contract changes for governance persistence endpoints.

## Acceptance criteria
1. Default `/contracts/governance?prototype=p0004` opens editor-first workspace.
2. Header shows only essential status/action metadata.
3. Snapshot review opens in modal and supports decision/apply actions.
4. Structured/JSON draft views are in a closable drawer.
5. Scope controls are in a settings popover, not persistent sidebar.
6. Publish action is sticky and shows disabled reason text.
7. `p0004` is active and writable; `p0001/p0002/p0003` are historical.
8. Existing governance persistence APIs still function without schema changes.
9. Type-check and tests pass.

## Risks and drift checks
1. Risk: hiding too much context.
- Mitigation: keep selected/baseline snapshot chips and unresolved count always visible.
2. Risk: modal workflow fragments navigation.
- Mitigation: preserve selected snapshot in URL and return to editor state on close.
3. Risk: publish ambiguity.
- Mitigation: sticky publish action with explicit disable reason.

## Implementation outline
1. Create `p0004` prototype from `p0003`.
2. Rebuild governance shell around compact header + editor-first layout.
3. Convert snapshot review panel to modal with inline evolve notes.
4. Convert contract panel to on-demand drawer.
5. Replace left rail with settings popover.
6. Shift writable prototype boundary and snapshot script handling from `p0003` to `p0004`.
7. Activate `p0004` and preserve prior prototypes as historical.
8. Verify with type-check/tests.
