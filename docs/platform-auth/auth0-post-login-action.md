# Auth0 Post Login Action — custom claims for platform-auth

Use this Action in Auth0 so the ID token includes `workspace_id` and `surface_access` claims that platform-auth expects. With one shared Auth0 application across all four surfaces, add this as a **Post Login** Action and ensure it runs for your application.

## Claim keys (namespaced)

- `https://surfaces.systems/workspace_id` — required; platform-auth also accepts raw `workspace_id`.
- `https://surfaces.systems/surface_access` — optional array of surface ids; platform-auth also accepts raw `surface_access`.

## Code to paste into Auth0

In Auth0 Dashboard: **Actions** → **Library** → **Build Custom** (or **Flows** → **Login** → add Action). Name it e.g. "Surfaces custom claims". Trigger: **Login / Post Login**. Paste:

```javascript
exports.onExecutePostLogin = async (event, api) => {
  // workspace_id: from app_metadata if set, otherwise deterministic default
  const workspaceId =
    event.user.app_metadata?.workspace_id || "ws_" + event.user.user_id.replace(/\|/g, "_");

  api.idToken.setCustomClaim("https://surfaces.systems/workspace_id", workspaceId);

  // surface_access: default allowlist for all four surfaces (override via app_metadata if needed)
  const surfaceAccess =
    event.user.app_metadata?.surface_access ||
    [
      "surfaces.systems",
      "surfaceops.ai",
      "interfacectl.com",
      "surfaces.dev",
    ];

  api.idToken.setCustomClaim("https://surfaces.systems/surface_access", surfaceAccess);
};
```

Then add this Action to the **Login** flow and **Apply** so it runs for your application.

## Behavior

- **workspace_id**: If `event.user.app_metadata.workspace_id` is set (e.g. via Auth0 Dashboard or Management API), that value is used. Otherwise the default is `ws_` + the user id with `|` replaced by `_` (safe for JWTs).
- **surface_access**: If `event.user.app_metadata.surface_access` is set, that array is used. Otherwise the default list includes all four surfaces so login works on any of them.
- No Management API calls; only `event.user` and `api.idToken.setCustomClaim` are used.

## Auth0 application checklist

For the single shared **Regular Web Application**:

- **Application Type**: Regular Web Application
- **Token Endpoint Authentication Method**: Post (or as required for your client secret)
- **Allowed Callback URLs** (comma or newline separated; use **www** and **https**):
  - `https://www.surfaces.systems/auth/callback`
  - `https://www.surfaceops.ai/auth/callback`
  - `https://www.interfacectl.com/auth/callback`
  - `https://www.surfaces.dev/auth/callback`
- **Allowed Logout URLs**:
  - `https://www.surfaces.systems/`
  - `https://www.surfaceops.ai/`
  - `https://www.interfacectl.com/`
  - `https://www.surfaces.dev/`
- **Settings** → ensure the Login Action above is in the Login flow and applied.

No code changes are required in the repo for claim keys if you use the namespaced keys above; platform-auth accepts them by default.
