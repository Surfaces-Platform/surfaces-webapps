# v1 Step 0: Shell and guardrails

Minimal UI shell and guardrails so future work lands cleanly.

## Files added

- `docs/decisions.md` — Decision log (stableId, excerpts, v1 scope).
- `docs/plans/v1-step-0-shell.md` — This plan.
- `apps/surfaceops-web/lib/mock/signals.ts` — Mock signals data provider.
- `apps/surfaceops-web/app/(shell)/layout.tsx` — Minimal shared layout for shell routes.
- `apps/surfaceops-web/app/(shell)/signals/page.tsx` — Signals list page.
- `apps/surfaceops-web/app/(shell)/signals/[signalKey]/page.tsx` — Signal detail page.

## Routes added

- `/signals` — Table list: Severity, Type, Title, Surface, Last Seen. Empty state: "No signals yet".
- `/signals/[signalKey]` — Title, metadata chips, Occurrences placeholder. Empty state: "No occurrences yet".

## How to run dev server

From repo root:

```bash
pnpm install
pnpm dev:surfaceops
```

Or from the app:

```bash
cd apps/surfaceops-web && pnpm install && pnpm dev
```

SurfaceOps runs at http://localhost:3001. Open `/signals` and navigate to a detail page via a row link.

## Acceptance checks

- Both routes render without console errors.
- List is populated from the mock provider (`lib/mock/signals.ts`).
- Docs exist and are linked from the repo README.
- Manual verification: navigation from `/signals` to a detail page works.
