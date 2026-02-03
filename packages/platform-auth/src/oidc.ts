/**
 * OIDC discovery, PKCE, token exchange, and JWT validation.
 * Uses {OIDC_ISSUER}/.well-known/openid-configuration for endpoints.
 */
import * as jose from "jose";
import type { OidcDiscoveryConfig, PlatformAuthConfig, ClaimMapping } from "./types.js";
import type { Session } from "./types.js";
import { AUTH_MISSING_WORKSPACE, AUTH_SURFACE_DENIED } from "./errors.js";
import { createErrorResponse } from "./errors.js";

const DISCOVERY_CACHE = new Map<string, { config: OidcDiscoveryConfig; expires: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function fetchOidcConfig(issuer: string): Promise<OidcDiscoveryConfig> {
  const cached = DISCOVERY_CACHE.get(issuer);
  if (cached && cached.expires > Date.now()) {
    return cached.config;
  }

  const url = `${issuer.replace(/\/$/, "")}/.well-known/openid-configuration`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`OIDC discovery failed: ${res.status} ${res.statusText}`);
  }
  const doc = (await res.json()) as Record<string, unknown>;

  const config: OidcDiscoveryConfig = {
    issuer: String(doc.issuer ?? issuer),
    authorization_endpoint: String(doc.authorization_endpoint),
    token_endpoint: String(doc.token_endpoint),
    jwks_uri: String(doc.jwks_uri),
    end_session_endpoint: doc.end_session_endpoint != null ? String(doc.end_session_endpoint) : undefined,
  };

  DISCOVERY_CACHE.set(issuer, { config, expires: Date.now() + CACHE_TTL_MS });
  return config;
}

/**
 * Generate PKCE code verifier and S256 code challenge.
 */
export async function generatePKCE(): Promise<{ verifier: string; challenge: string }> {
  const verifier = base64UrlEncode(crypto.getRandomValues(new Uint8Array(32)));
  const encoder = new TextEncoder();
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(verifier));
  const challenge = base64UrlEncode(new Uint8Array(digest));
  return { verifier, challenge };
}

function base64UrlEncode(buf: Uint8Array): string {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function getAuthorizeUrl(
  discovery: OidcDiscoveryConfig,
  config: PlatformAuthConfig,
  params: { state: string; codeChallenge: string }
): string {
  const url = new URL(discovery.authorization_endpoint);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", config.oidcClientId);
  url.searchParams.set("redirect_uri", config.oidcRedirectUri);
  url.searchParams.set("scope", config.oidcScope);
  url.searchParams.set("state", params.state);
  url.searchParams.set("code_challenge", params.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  if (config.oidcAudience) {
    url.searchParams.set("audience", config.oidcAudience);
  }
  return url.toString();
}

export async function exchangeCodeForTokens(
  discovery: OidcDiscoveryConfig,
  config: PlatformAuthConfig,
  params: { code: string; verifier: string }
): Promise<{ id_token: string; access_token?: string }> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: params.code,
    redirect_uri: config.oidcRedirectUri,
    client_id: config.oidcClientId,
    code_verifier: params.verifier,
  });
  if (config.oidcClientSecret) {
    body.set("client_secret", config.oidcClientSecret);
  }

  const res = await fetch(discovery.token_endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as { id_token?: string; access_token?: string };
  if (!data.id_token) {
    throw new Error("Token response missing id_token");
  }
  return {
    id_token: data.id_token,
    access_token: data.access_token,
  };
}

export async function validateIdToken(
  discovery: OidcDiscoveryConfig,
  config: PlatformAuthConfig,
  idToken: string
): Promise<Record<string, unknown>> {
  const JWKS = jose.createRemoteJWKSet(new URL(discovery.jwks_uri));
  const { payload } = await jose.jwtVerify(idToken, JWKS, {
    issuer: discovery.issuer,
    audience: config.oidcAudience ?? config.oidcClientId,
  });
  return payload as Record<string, unknown>;
}

const DEFAULT_CLAIM_KEYS = {
  sub: "sub",
  email: "email",
  name: "name",
  preferredUsername: "preferred_username",
  workspaceId: "workspace_id",
  roles: "roles",
  surfaceAccess: "surface_access",
} as const;

/** Auth0-friendly namespaced claim keys (single shared app). Checked after mapping, before raw key. */
export const NAMESPACED_CLAIM_KEYS = {
  workspaceId: "https://surfaces.systems/workspace_id",
  surfaceAccess: "https://surfaces.systems/surface_access",
} as const;

function getClaimKey(contractKey: keyof typeof DEFAULT_CLAIM_KEYS, mapping?: ClaimMapping): string {
  const m = mapping as Record<string, string> | undefined;
  return (m?.[contractKey] as string | undefined) ?? DEFAULT_CLAIM_KEYS[contractKey];
}

/** First defined value from claims for the given keys (mapping key, namespaced, then default). */
function getClaimValue(
  claims: Record<string, unknown>,
  keys: string[]
): unknown {
  for (const k of keys) {
    const v = claims[k];
    if (v !== undefined && v !== null) return v;
  }
  return undefined;
}

export function validateClaims(
  claims: Record<string, unknown>,
  surfaceId: string,
  mapping?: ClaimMapping
): Session | Response {
  const sub = claims[getClaimKey("sub", mapping)];
  const email = claims[getClaimKey("email", mapping)];
  const name =
    claims[getClaimKey("name", mapping)] ?? claims[getClaimKey("preferredUsername", mapping)];
  const workspaceId = getClaimValue(claims, [
    getClaimKey("workspaceId", mapping),
    NAMESPACED_CLAIM_KEYS.workspaceId,
    DEFAULT_CLAIM_KEYS.workspaceId,
  ]);
  const roles = claims[getClaimKey("roles", mapping)];
  const surfaceAccess = getClaimValue(claims, [
    getClaimKey("surfaceAccess", mapping),
    NAMESPACED_CLAIM_KEYS.surfaceAccess,
    DEFAULT_CLAIM_KEYS.surfaceAccess,
  ]);

  if (!workspaceId || (typeof workspaceId === "string" && !workspaceId.trim())) {
    return createErrorResponse(AUTH_MISSING_WORKSPACE, undefined, 403);
  }

  if (surfaceAccess != null && Array.isArray(surfaceAccess)) {
    const allowed = surfaceAccess.some(
      (s) => typeof s === "string" && s.trim() === surfaceId
    );
    if (!allowed) {
      return createErrorResponse(AUTH_SURFACE_DENIED, undefined, 403);
    }
  }

  const rolesArray = Array.isArray(roles)
    ? roles.filter((r): r is string => typeof r === "string")
    : [];

  const surfaceAccessArray =
    Array.isArray(surfaceAccess) && surfaceAccess.every((s) => typeof s === "string")
      ? (surfaceAccess as string[])
      : [];

  return {
    userId: String(sub ?? ""),
    email: String(email ?? ""),
    name: String(name ?? ""),
    workspaceId: String(workspaceId),
    roles: rolesArray,
    surfaceAccess: surfaceAccessArray,
  };
}
