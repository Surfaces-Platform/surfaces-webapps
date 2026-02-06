# Phase 5 close-out — Human actionability

**Status:** Done. Phase 5 frozen; no tweaks unless something is factually wrong.

Phase 5 added **human actionability only**: who should act (operational responsibility), where to fix (application code, contract definition), and what options exist (deterministic guidance from finding codes). It explicitly did **not** add assign-owner UI, acknowledge failure, muting, retry buttons, Slack/email, runtime behavior, automatic contract edits, or policy evaluation. The system answers "who, what, where, what options" without taking action itself.

---

## One-time production spot-check (do once after merge)

1. **Merge** — Squash merge PR, delete branch, confirm CI green on main.
2. **Failing surface** — Force one (e.g. design-system drift: replace `@surfaces/ui` imports with relative in surfaces-web, run `pnpm run generate:contract`).
3. **Detail page** (`/contracts/surfaces-web`):
   - Operational responsibility label and fallback ("Owner not specified") when empty.
   - "Where to fix" matches the finding (e.g. "Application code, Contract definition" for designSystem.missing).
   - Exactly one guidance line per unique finding code.
   - No guidance when findings are missing; no implied root cause.
4. **Revert** the failure, regenerate, confirm UI returns to green.
