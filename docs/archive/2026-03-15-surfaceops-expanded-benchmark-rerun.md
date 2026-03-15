# 2026-03-15 - SurfaceOps Expanded Benchmark Rerun

## Scope
This note captures the March 15, 2026 rerun of the expanded SurfaceOps benchmark fixture suite after adding:
- `benchmark-shared-shell-web`
- `benchmark-destructive-flow-web`
- `benchmark-design-tokens-web`
- `benchmark-async-data-web`

The goal was to measure how the local LLM benchmark path performs on the new fixture mix, not just on the original `reference-target-web` canary.

## Runtime configuration
- Workspace: `surfaces-webapps`
- Model endpoint: `http://127.0.0.1:1234/v1`
- Loaded LM Studio model alias: `benchmark120b16k`
- Backing model: `openai/gpt-oss-120b`
- Loaded context length: `16,384`
- Guidance strategies: `prompt-summary`, `json-primary`

## Aggregate suite attempt
The first full-suite run was launched as cohort `20260315050908`.

That cohort did not complete. It stopped inside `benchmark-destructive-flow-web` during the `json-primary` strategy because the local LLM exhausted the fixed `32` turn budget after repeated ambiguous `apply_text_edits` anchor matches in `apps/benchmark-destructive-flow-web/app/globals.css`.

Practical consequence:
- the suite-level artifact tree exists
- `reference-target-web` and `benchmark-shared-shell-web` progressed cleanly inside that cohort
- the aggregate cohort did not produce a complete five-fixture report

To finish the readout, each fixture was rerun individually and those completed cohorts are treated as the authoritative per-fixture results below.

## Completed per-fixture cohorts

| Fixture | Cohort | Baseline status | Accepted suggestions | `prompt-summary` | `json-primary` |
| --- | --- | --- | ---: | --- | --- |
| `reference-target-web` | `20260315051800` | `warn` | 2 | `pass` | `pass` |
| `benchmark-shared-shell-web` | `20260315050740` | `block` | 4 | `block` | `block` |
| `benchmark-destructive-flow-web` | `20260315051309` | `block` | 4 | `block` | `block` |
| `benchmark-design-tokens-web` | `20260315051451` | `block` | 5 | `block` | `block` |
| `benchmark-async-data-web` | `20260315051554` | `block` | 4 | `block` | `block` |

## Fixture-by-fixture results

### `reference-target-web`
- Baseline findings:
  - `motion.none-detected`
  - `token.normalization-skipped`
- Both strategies passed in one attempt with zero remaining findings.
- `prompt-summary` resolved the fixture with `0` recoverable tool errors.
- `json-primary` also passed, but needed `3` recoverable tool errors.

Interpretation:
- the canary fixture remains solvable end-to-end under the current harness and local model
- the new benchmark architecture still works on the original repair class

### `benchmark-shared-shell-web`
- Baseline findings:
  - `motion.none-detected`
  - `token.normalization-skipped`
  - `section.missing`
  - `layout.width-undetermined`
- `prompt-summary` reduced the fixture to one remaining blocking finding:
  - `layout.width-undetermined`
- `json-primary` finished with two blocking findings still present:
  - `layout.width-undetermined`
  - `section.missing`

Interpretation:
- both strategies successfully repaired the token and motion issues
- the persistent failure was restoring contract-compliant shared-shell width/layout semantics
- `prompt-summary` performed better on this fixture

### `benchmark-destructive-flow-web`
- Baseline findings:
  - `motion.none-detected`
  - `token.normalization-skipped`
  - `section.missing`
  - `layout.width-undetermined`
- `prompt-summary` finished with:
  - `layout.width-undetermined`
  - `section.missing`
- `json-primary` finished with only:
  - `layout.width-undetermined`

Operational note:
- `json-primary` needed `9` recoverable tool errors to get there
- the failed suite cohort shows this fixture is currently the hardest for the harness because it can trap the model in repeated edit retries against ambiguous anchors

Interpretation:
- `json-primary` had the better repair outcome on this fixture
- the destructive-flow fixture is successfully stressing cross-file structural repair instead of simple style cleanup

### `benchmark-design-tokens-web`
- Baseline findings:
  - `token.normalization-skipped`
  - `section.missing`
  - `layout.width-undetermined`
  - `motion.duration`
  - `motion.timing`
  - `motion.duration`
- Both strategies converged to the same blocked endpoint:
  - `layout.width-undetermined`
  - `section.missing`

Interpretation:
- the local model handled the denser token and motion normalization work
- both strategies still stalled on the higher-order structural repair
- this fixture is useful because it separates token repair capability from layout/section repair capability

### `benchmark-async-data-web`
- Baseline findings:
  - `token.normalization-skipped`
  - `section.missing`
  - `layout.width-undetermined`
  - `layout.container-missing`
- Both strategies finished blocked with the same remaining findings:
  - `layout.container-missing`
  - `layout.width-undetermined`
  - `section.missing`
- `prompt-summary` logged `10` recoverable tool errors.
- `json-primary` logged `8` recoverable tool errors.

Interpretation:
- the async/data-driven fixture is exposing a real weakness in reconstructing shell/container structure across shared and component files
- the model could not recover the required async-state layout semantics in one attempt

## Cross-fixture summary
- Total fixtures run to completion individually: `5`
- Fixtures with any passing strategy: `1/5`
- Strategy sessions that passed: `2/10`
- Total recoverable tool errors:
  - `prompt-summary`: `14`
  - `json-primary`: `20`

What the rerun shows:
- the new fixtures are materially harder than `reference-target-web`
- the model usually clears token and motion repairs first
- the dominant remaining failures are now structural:
  - `layout.width-undetermined`
  - `section.missing`
  - `layout.container-missing`

This is a good benchmark outcome in the architectural sense because the suite is no longer a shallow style-repair test. It is now separating:
- canary-style fixture cleanup that the model can finish
- richer contract-driven reconstruction work that the model still misses

## Strategy signal
There was no single overall winner across the new fixtures.

Observed pattern:
- `prompt-summary` was better on `benchmark-shared-shell-web`
- `json-primary` was better on `benchmark-destructive-flow-web`
- the two strategies tied on `benchmark-design-tokens-web`
- the two strategies tied on `benchmark-async-data-web`
- both passed `reference-target-web`

That means the expanded suite is starting to produce differentiating behavior, but not yet a stable ranking.

## Main bottlenecks exposed by this rerun
1. The local harness still has a hard `32` turn cap, which can terminate a difficult fixture before convergence.
2. Ambiguous edit anchors in CSS can consume the turn budget through repeated repair retries.
3. The local model is more reliable at token and motion repair than at re-establishing required section and page-container layout semantics.

## Workspace state after rerun
Post-run hygiene checks were clean:
- `pnpm workspace:status` returned `PASS`
- `surfaces-webapps` remained clean on `main`
- benchmark artifacts remained local-only under ignored `artifacts/`

## Conclusion
The expanded benchmark suite is working as intended.

It does not yet show a dominant guidance strategy, but it does show that the benchmark now measures a harder and more realistic class of generation repair work. `reference-target-web` remains a useful canary. The four new fixtures are sufficient to expose current model and harness limits around shared layout restoration, required section recovery, and cross-file container semantics.
