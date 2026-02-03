/**
 * Platform Auth Contract v1 — session and config types.
 */
export interface Session {
  userId: string;
  email: string;
  name: string;
  workspaceId: string;
  roles: string[];
  surfaceAccess: string[];
}

/**
 * Optional claim mapping for IdPs that use alternate claim names.
 * Renaming only — does not weaken semantics.
 * After mapping, workspace_id is still required and surface_access enforcement still applies.
 */
export interface ClaimMapping {
  sub?: string;
  email?: string;
  name?: string;
  preferredUsername?: string;
  workspaceId?: string;
  roles?: string;
  surfaceAccess?: string;
}

export interface OidcDiscoveryConfig {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri: string;
  end_session_endpoint?: string;
}

export interface PlatformAuthConfig {
  oidcIssuer: string;
  oidcClientId: string;
  oidcClientSecret?: string;
  oidcRedirectUri: string;
  oidcPostLogoutRedirectUri: string;
  oidcScope: string;
  oidcAudience?: string;
  sessionSecret: string;
  surfaceId: string;
  sessionTtlSeconds: number;
}

export interface StatePayload {
  state: string;
  returnTo: string;
  surface: string;
  csrf: string;
}
