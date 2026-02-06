# Phase 0.5 drill runbook and close-out

## What changed
- **Runbook:** `docs/plans/phase-0.5-drill-runbook.md` — ship, spot-check, revert sequence for the temporary `/auth/register` drill.
- **Close-out:** One-line entry in `docs/plans/phase-5-close-out.md` — drill completed, spot-check passed, removed.

## What did not change
- No contract, schema, or app code changes.
- Drill was never merged; this PR adds documentation only.

## How to verify
```bash
git diff --stat
# Expect: phase-0.5-drill-runbook.md (new), phase-5-close-out.md (one line added)
```
