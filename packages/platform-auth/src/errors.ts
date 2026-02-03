/**
 * Platform Auth Contract v1 — stable error codes.
 * Each code maps to a specific contract violation.
 */
export const AUTH_CONFIG_MISSING = "AUTH_CONFIG_MISSING" as const;
export const AUTH_MISSING_WORKSPACE = "AUTH_MISSING_WORKSPACE" as const;
export const AUTH_SURFACE_DENIED = "AUTH_SURFACE_DENIED" as const;
export const AUTH_INVALID_STATE = "AUTH_INVALID_STATE" as const;
export const AUTH_TOKEN_EXCHANGE_FAILED = "AUTH_TOKEN_EXCHANGE_FAILED" as const;
export const AUTH_INVALID_RETURN_TO = "AUTH_INVALID_RETURN_TO" as const;

export type AuthErrorCode =
  | typeof AUTH_CONFIG_MISSING
  | typeof AUTH_MISSING_WORKSPACE
  | typeof AUTH_SURFACE_DENIED
  | typeof AUTH_INVALID_STATE
  | typeof AUTH_TOKEN_EXCHANGE_FAILED
  | typeof AUTH_INVALID_RETURN_TO;

const MESSAGES: Record<AuthErrorCode, string> = {
  [AUTH_CONFIG_MISSING]: "Missing auth configuration",
  [AUTH_MISSING_WORKSPACE]: "workspace_id claim missing or empty",
  [AUTH_SURFACE_DENIED]: "surface_access claim does not include this surface",
  [AUTH_INVALID_STATE]: "state mismatch or expired",
  [AUTH_TOKEN_EXCHANGE_FAILED]: "authorization code exchange failed",
  [AUTH_INVALID_RETURN_TO]: "returnTo is not a valid relative path",
};

export function createErrorResponse(
  code: AuthErrorCode,
  message?: string,
  status: number = 401
): Response {
  const body = JSON.stringify({
    code,
    message: message ?? MESSAGES[code],
  });
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}
