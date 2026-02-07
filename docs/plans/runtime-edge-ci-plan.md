# Feature Plan

## Summary
Document and ship the outward-facing pieces that make Surfaces enforcement portable: a runtime/edge enforcement doc with adapter stubs, generator-time adapter snippets, turnkey CI/CD templates with troubleshooting, and a visibility hook for validation runs. This keeps the contract model usable across build, CI, and edge contexts, not just in our UI.

## Strategy alignment
This work operationalizes the decision filter by showing concrete, enforced pathways at generation time (generators), CI/CD (blocking merges), and runtime/edge (adaptive UI gating). It strengthens the single-contract promise and reduces any enforcement-free gaps before users experience failures.

Decision filter sentence
"When an agent proposes a change to the user experience, Surfaces determines whether that change is allowed, under what conditions it may proceed, and blocks or corrects it if it violates intent."

## Contract impact
1. Contract definition
   - No schema change; we document how existing contract fields are consumed at runtime/edge and by generators. We may add a derived "runtime manifest" view (doc only) that references current fields (layout, color, motion, sections).

2. Enforcement timing
   - Generation time: generator adapters consume contract and emit provenance.
   - CI/CD: validation blocks merges via templates.
   - Runtime/edge: adapter stubs gate adaptive changes before render.

3. Violation handling
   - Generation: block/emit warnings based on policy; provenance required.
   - CI/CD: fail pipeline on strict violations; emit JSON for warnings.
   - Runtime/edge: block or correct by policy; log structured violation payloads.

## Surface impact
- surfaces.systems: docs reference canonical contract; no UI change.
- surfaceops.ai: future view to surface CI runs/contract diffs (spec only in this slice).
- interfacectl: docs + templates for CLI usage; adapters reference CLI outputs.
- surfaces.dev: hosts developer-facing docs; will link to new runtime/edge guide, CI templates, and generator snippets so external teams can adopt.

## Non-goals
- No new contract schema fields or validator logic changes.
- No automated Slack/email workflow integrations.
- No runtime SDK with full parity—only minimal stubs/examples.
- No new UI screens shipped now; only a spec for SurfaceOps visibility.

## Acceptance criteria
1. A new runtime/edge enforcement doc exists with JS edge and Swift/Kotlin stubs.
2. Generator consumption doc includes at least three adapter snippets (Cursor/Lovable/Make/Figma plugin pattern) plus provenance example.
3. Contract-validation doc includes copy-paste GitHub Actions and GitLab CI templates and an exit-code troubleshooting matrix.
4. A short spec or checklist exists for SurfaceOps visibility of validation runs + contract diffs (even if not yet implemented).
5. All new docs reference the existing contract file paths and CLI commands, keeping semantics unchanged.
6. Examples of violation payload shape and fallback behavior are documented for runtime/edge adapters.
7. Docs are self-contained (no external links required) and scoped to external adopters.

## Risks and drift checks
1. Drift to observability-only: Mitigation—explicitly document blocking behavior and exit codes for CI/runtime adapters.
2. Over-scoping runtime SDK: Mitigation—provide minimal stubs and performance budgets; defer full SDK.
3. Generator guidance becoming non-deterministic: Mitigation—keep provenance and strict/warn mapping tied to existing policy fields; include fixtures references.

## Implementation outline
- Add runtime/edge enforcement doc with adapter stubs and payload examples.
- Update generator-consumption doc with adapter snippets and provenance examples.
- Update contract-validation doc with CI templates (GitHub Actions, GitLab) and troubleshooting matrix.
- Add short SurfaceOps visibility spec/checklist describing inputs/outputs needed to show CI runs and contract diffs.
