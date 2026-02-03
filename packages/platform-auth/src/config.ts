/**
 * Reads and validates environment variables for platform-auth.
 * OIDC endpoints are derived via discovery, not from env.
 */
import type { PlatformAuthConfig } from "./types.js";

/** Thrown when required env vars are missing; detail is for server logs only. */
export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
    Object.setPrototypeOf(this, ConfigError.prototype);
  }
}

const DEFAULT_SCOPE = "openid profile email";
const DEFAULT_SESSION_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

export function getConfig(env: Record<string, string | undefined> = process.env): PlatformAuthConfig {
  const oidcIssuer = env.OIDC_ISSUER;
  const oidcClientId = env.OIDC_CLIENT_ID;
  const oidcClientSecret = env.OIDC_CLIENT_SECRET;
  const oidcRedirectUri = env.OIDC_REDIRECT_URI;
  const oidcPostLogoutRedirectUri = env.OIDC_POST_LOGOUT_REDIRECT_URI ?? "/";
  const sessionSecret = env.SESSION_SECRET;
  const surfaceId = env.PLATFORM_SURFACE_ID;

  if (!oidcIssuer?.trim()) throw new ConfigError("OIDC_ISSUER is required");
  if (!oidcClientId?.trim()) throw new ConfigError("OIDC_CLIENT_ID is required");
  if (!oidcRedirectUri?.trim()) throw new ConfigError("OIDC_REDIRECT_URI is required");
  if (!sessionSecret?.trim()) throw new ConfigError("SESSION_SECRET is required");
  if (!surfaceId?.trim()) throw new ConfigError("PLATFORM_SURFACE_ID is required");

  return {
    oidcIssuer: oidcIssuer.trim(),
    oidcClientId: oidcClientId.trim(),
    oidcClientSecret: oidcClientSecret?.trim() || undefined,
    oidcRedirectUri: oidcRedirectUri.trim(),
    oidcPostLogoutRedirectUri: oidcPostLogoutRedirectUri.trim(),
    oidcScope: env.OIDC_SCOPE?.trim() || DEFAULT_SCOPE,
    oidcAudience: env.OIDC_AUDIENCE?.trim() || undefined,
    sessionSecret: sessionSecret.trim(),
    surfaceId: surfaceId.trim(),
    sessionTtlSeconds:
      env.SESSION_TTL_SECONDS != null
        ? parseInt(env.SESSION_TTL_SECONDS, 10)
        : DEFAULT_SESSION_TTL_SECONDS,
  };
}
