# Phase 5 close-out — Human actionability

**Scope:** SurfaceOps UI phase. Independent of interfacectl CLI phase numbering.

**Status:** Done. Phase 5 frozen; no tweaks unless something is factually wrong.

Phase 5 added **human actionability only**: who should act (operational responsibility), where to fix (application code, contract definition), and what options exist (deterministic guidance from finding codes). It explicitly did **not** add assign-owner UI, acknowledge failure, muting, retry buttons, Slack/email, runtime behavior, automatic contract edits, or policy evaluation. The system answers "who, what, where, what options" without taking action itself.

---

## One-time production spot-check (do once after merge)

- [2025-02-05] Phase 0.5 drill: finding `phase0.authRoutes.register.missing`, spot-check passed, drill removed.

**Without forcing a failure:**
1. Logged out: `/` loads; `/contracts` prompts for auth.
2. Log in; open `/contracts/surfaces-web` and one other surface.
3. If all pass: confirm no "Next steps" on pass pages; Phase 5 did not change pass/unknown behavior.

**Known failing surface (no app code changes):**
1. Edit `contracts/generated/surfaces-web.extraction.json`: set `designSystemComponents` to `[]`.
2. Run `pnpm run generate:contract` and `validate-extracted` to confirm failure.
3. Commit, push, deploy. Verify Phase 5 UI on `/contracts/surfaces-web`: operational responsibility, "Why this failed", "Next steps" with one guidance per finding, "Where to fix" matches.
4. Revert the extraction edit, regenerate, push, redeploy.

---

## Phase 6 (decide before coding)

Phase 5 answers "Who acts and where." Phase 6 must pick one:
- **6A: Workflow integration** — How this information flows into tickets, PRs, or on-call.
- **6B: Trend intelligence** — Aggregation over time, not per surface.
- **6C: Contract authorship UX** — Making contract changes easier and safer.

Recommendation: 6A first (minimal workflow integration). Lightest options: "copy button + prefilled issue text" vs "GitHub issue automation from CI on failure."
