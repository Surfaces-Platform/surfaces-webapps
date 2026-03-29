# UI AST V2 Merge Note

**Scope:** `surfaces-webapps` consumer proof only. This repo does not define AST semantics; it proves compatibility with the canonical `interfacectl` cutover.

**Merge order:**

1. `interfacectl`
2. `surfaces-webapps`

---

## A) interfacectl dependency

Pin the dependency in the `surfaces-webapps` PR body to:

- **Branch:** `codex/ui-ast-v2-cutover`
- **Current worktree base SHA:** `b83ec779711613e39127a00e0d42052b39d84d9d`

If the interfacectl PR head changes before opening the `surfaces-webapps` PR, replace the SHA with the final interfacectl PR head SHA. The merge order stays the same.

---

## B) Scope in this repo

This PR should include only:

- `contracts/generated/benchmark-async-data-web.ui.surface.ast.json`
- resolver-backed consumer smoke coverage proving:
  - AST freshness relative to the legacy benchmark contract
  - `validate --ast` against the live benchmark app
  - `compile --ast`
  - `prepare-generation`
  - `prepare-runtime`

Do not generalize benchmark fixtures, local-workbench service inputs, or repo-wide scripts to AST-native inputs in this pass.

---

## C) Accepted benchmark warning posture

The benchmark proof is acceptable for this cutover at:

- **0 validation errors**
- existing warn-level findings remain documented and non-blocking

Current warn-level findings observed during validation:

- `feedback.state-missing` for required async state `empty`
- `feedback.state-missing` for required async state `success`
- `feedback.last-good-content-missing` for the `error` context preserve-section requirement

These warnings are intentionally not fixed in this cutover. If a reviewer blocks on the proof surface warning posture, treat that as a follow-up fixture-cleanup task, not part of the AST cutover itself.

---

## D) Verification

Run with the feature `interfacectl` worktree wired explicitly:

```bash
export SURFACES_INTERFACECTL_ROOT=/Users/mike/SurfacesPlatform/interfacectl/.worktrees/ui-ast-v2-cutover
node --test scripts/__tests__/generation-adapter.test.mjs
```

Expected result:

- existing consumer smoke passes
- benchmark AST freshness passes
- AST-derived compile/prepare-generation/prepare-runtime proof passes

---

## E) Suggested PR body

```markdown
## UI AST V2 consumer proof

### Dependency
- Depends on `interfacectl` branch `codex/ui-ast-v2-cutover`
- Pin to interfacectl SHA `b83ec779711613e39127a00e0d42052b39d84d9d` (update if the interfacectl PR head changes before merge)
- Merge order is fixed: `interfacectl` first, `surfaces-webapps` second

### What changed
- Added committed AST draft for `benchmark-async-data-web`
- Added resolver-backed consumer proof for AST freshness, validate, compile, prepare-generation, and prepare-runtime

### Warning posture
- Benchmark proof remains acceptable at `0` errors
- Existing warn-level async feedback findings are documented and intentionally left out of scope for this cutover
```
