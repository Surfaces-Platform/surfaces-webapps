# Feature Plan

## Summary
Add support in platform-auth for namespaced Auth0 claims so a shared Auth0 application can supply required contract claims (`workspace_id`, `surface_access`) without breaking existing raw claims. Provide an Auth0 Post Login Action and env documentation to ensure tokens meet runtime contract requirements across all four surfaces.

## Strategy alignment
This strengthens runtime enforcement by ensuring required contract claims are always present before sessions are created. It prevents unauthorized or under-specified sessions from being accepted, blocking or correcting invalid identity inputs before users experience failures.

Decision filter sentence
"When an agent proposes a change to the user experience, Surfaces determines whether that change is allowed, under what conditions it may proceed, and blocks or corrects it if it violates intent."

## Contract impact
1. Contract definition  
Require `workspace_id` (and optional `surface_access`) to be present on authenticated sessions; add support for namespaced equivalents without changing semantics.

2. Enforcement timing  
Runtime: enforced during `/auth/callback` token validation before session creation.

3. Violation handling  
Missing or empty workspace claim returns `AUTH_MISSING_WORKSPACE` (403). Surface allowlist violations return `AUTH_SURFACE_DENIED` (403).

## Surface impact
All four surfaces use the same platform-auth runtime contract and shared Auth0 app:
- surfaces.systems
- surfaceops.ai
- interfacectl.com
- surfaces.dev

## Non-goals
- No change to Auth0 tenant data beyond adding a Post Login Action.
- No new IdP support or token sources (access token/userinfo remain unused).
- No changes to session schema or API shape.

## Acceptance criteria
1. platform-auth accepts workspace id from namespaced `https://surfaces.systems/workspace_id`.
2. Raw `workspace_id` continues to work unchanged.
3. Optional env overrides `OIDC_WORKSPACE_CLAIM` and `OIDC_SURFACE_ACCESS_CLAIM` are respected.
4. Auth0 Post Login Action sets the namespaced claims on the ID token.
5. `/auth/callback` creates a session when the namespaced claims are present.
6. `/auth/session` returns 200 after login on all four surfaces.
7. Missing/empty workspace claim still returns `AUTH_MISSING_WORKSPACE`.

## Risks and drift checks
1. Risk: turning enforcement into observability by tolerating missing claims.  
   Mitigation: keep `AUTH_MISSING_WORKSPACE` blocking behavior unchanged.
2. Risk: accepting unscoped access without surface allowlist.  
   Mitigation: preserve `surface_access` enforcement when present.
3. Risk: weakening contract by changing claim semantics.  
   Mitigation: only add namespaced alias; raw semantics unchanged.

## Implementation outline
1. Add namespaced claim keys to platform-auth and resolve in `validateClaims`.
2. Add optional env claim overrides in config; pass mapping to `validateClaims`.
3. Document Auth0 Post Login Action and env additions.
4. Redeploy all surfaces and verify `/auth/session` after login.
