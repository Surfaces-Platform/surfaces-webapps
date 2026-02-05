# PR #9 Merge Note

**Date:** 2026-02-03  
**Repo:** Surfaces-Platform/surfaces-webapps  
**PR:** https://github.com/Surfaces-Platform/surfaces-webapps/pull/9

## Summary
Merged PR #9 (squash) to add namespaced Auth0 claim support in platform-auth and document the Auth0 Post Login Action for a single shared Auth0 application.

## Changes included
- platform-auth accepts namespaced `https://surfaces.systems/workspace_id` and `https://surfaces.systems/surface_access`.
- Optional env overrides: `OIDC_WORKSPACE_CLAIM`, `OIDC_SURFACE_ACCESS_CLAIM`.
- Auth0 Post Login Action documented.
- Runtime rollout notes updated; feature plan added.

## Checks
- CI checks: all green (contract validation + Vercel previews).
- Production sanity checks: `/auth/login` → 302 to Auth0; `/auth/session` → 401 when unauthenticated.
- Browser SSO: verified on all four domains; `/auth/session` returns 200 after login.

## Follow-ups
- None required. If claim keys change, set `OIDC_WORKSPACE_CLAIM` / `OIDC_SURFACE_ACCESS_CLAIM` accordingly.
