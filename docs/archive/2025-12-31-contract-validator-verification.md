# Contract Validator MVP – Verification Report

- **Date:** 2025-12-31
- **Commit Ref:** _working tree (see git history prior to verification)_
- **Operator:** Contract Validator hardening run (Cursor session)
- **CLI Entry Point:** `pnpm exec interfacectl validate --root . --contract contracts/surfaces.web.contract.json` (after installing `@surfaces/interfacectl-cli`)
- **Environment:** Node 22.16.0, pnpm 10.26.2, macOS 25.2.0

## Scope

Verification covered deterministic drift detection for the three surfaces (`interfacectl-web`, `surfaceops-web`, `surfaces-web`) using the canonical contract at `contracts/surfaces.web.contract.json`. Testing followed `docs/interfacectl/TESTING.md` and was limited to validation and error-surface assessment—no new features were added.

## Findings Summary

| Checklist | Scenario | Status | Notes |
| --- | --- | --- | --- |
| 1 | Smoke test (`pnpm exec interfacectl validate --root . --contract contracts/surfaces.web.contract.json`) | ✅ Pass | Baseline clean run exits 0 with success summary. |
| 2.1 | Contract JSON corruption | ✅ Fail (expected) | Exit 2, message pinpoints parse offset & contract path. |
| 2.2 | Remove required field (`constraints`) | ✅ Fail | Exit 2, AJV error `missingProperty:"constraints"`. |
| 2.3 | Duplicate required section IDs | ✅ Fail | Exit 2, AJV pointer `/surfaces/0/requiredSections`. |
| 3.1 | Rename required section (`landing.guidance`) | ✅ Fail | Exit 1, reports missing + unexpected section with file path. |
| 3.2 | Section present on wrong surface | ✅ Fail | Exit 1, same dual finding for `surfaceops-web`. |
| 3.3 | Unexpected extra section | ✅ Fail | Exit 1, lists `landing.experimental` with source file. |
| 4.1 | Introduce disallowed font (`Roboto`) | ✅ Fail | Exit 1, includes font name & CSS path. |
| 4.2 | Surface uses font not allowed by contract | ✅ Fail | Exit 1 after temporarily tightening contract, shows offending font. |
| 5.1 | Remove shared container width signal | ✅ Fail | Exit 1 + warning when CSS token missing; drift caught. |
| 5.2 | Increase max width to 1200px | ✅ Fail | Exit 1 with expected vs reported widths. |
| 6.1 | Change motion duration to 200 ms | ✅ Fail | Exit 1, lists allowed durations. |
| 6.2 | Change motion easing to `ease-in-out` | ✅ Fail | Exit 1, lists allowed timing functions. |
| 8.1 | Deterministic output | ✅ Pass | Re-running with no changes reproduces identical success output. |
| 8.2 | `--json` output | ⚠️ Not implemented | CLI ignores `--json`; only textual summary emitted. |
| 8.3 | Exit codes | ✅ Pass | 0=clean, 1=drift, 2=contract/schema failure. |
| 9 | Break → detect → fix loop | ✅ Pass | Each scenario restored clean state after fix run. |

## Detailed Notes

- **Error clarity.** Drift messages are surface-scoped with actionable details (offending ID/font/layout/motion and source file), keeping fixes obvious.
- **Contract schema errors.** AJV output uses JSON pointers; concise yet accurate for required fields & duplicates.
- **Layout checks.** When the CSS width token is removed, the validator emits both a warning (unable to resolve width) and a violation. This redundancy is harmless but could be collapsed in a future pass.
- **Motion checks.** Changing either duration or easing correctly reports the allowed values and the file containing the violation.
- **Container usage gap.** Removing the `.contract-container` wrapper from JSX while leaving the CSS token intact does *not* arise in the current checklist; static descriptor logic only inspects the token. Strengthening markup enforcement is recommended if the contract intends to mandate wrapper usage.
- **JSON output gap.** The CLI currently lacks machine-readable output despite checklist guidance. Downstream automation still depends on parsing human-readable text.

## Recommendations for Next Iteration (not implemented)

1. **Static markup enforcement.** Extend descriptor extraction to verify that each surface renders the expected container class / wrapper, not just that the CSS token exists.
2. **Machine-readable output.** Add `--json` support (or document its absence) with a stable schema for findings to improve CI artifacts and future integrations.
3. **Message smoothing.** Consider deduplicating the width warning/violation pair once container checks are in place.
4. **Document exit codes & current CLI flags.** Update `docs/interfacectl/contract-validation.md` to describe exit codes and note that `--json` is currently unsupported.

## Clean-Up Checklist

- All temporary edits were reverted after each test. `pnpm exec interfacectl validate --root . --contract contracts/surfaces.web.contract.json` returns exit code 0 on the restored tree.
- Contract at `contracts/surfaces.web.contract.json` now matches the canonical definition.
- The `docs/interfacectl/test-history/` folder now holds this report for auditing.
