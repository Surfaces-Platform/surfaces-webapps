# Phase 5: Human actionability

## What changed
- **Operational responsibility** label (replaces "Owner"); neutral fallback "Owner not specified" when empty.
- **Next steps** section for failing surfaces: "Where to fix" plus deterministic guidance derived from finding codes.
- No buttons, no links that mutate state, no automation.

## What did not change
- No schema changes.
- No CI changes.
- No new commands.
- No automation, alerts, or workflows.

## How to verify

**CLI:**
```bash
pnpm type-check
pnpm validate:local
pnpm run generate:contract
git diff --exit-code contracts/generated/
```

**Manual checklist (one failing surface):**
1. Force design-system failure: replace `@surfaces/ui` imports with relative in `apps/surfaces-web/app/page.tsx`, run `pnpm run generate:contract`.
2. Open `/contracts/surfaces-web` (authenticated).
3. Confirm: Operational responsibility label; "Where to fix: Application code, Contract definition"; one guidance line for `phase0.designSystem.missing`.
4. Revert imports, regenerate, confirm green.
