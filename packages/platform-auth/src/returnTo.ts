/**
 * returnTo validation: relative path only, no scheme/host.
 */
import { AUTH_INVALID_RETURN_TO } from "./errors.js";
import { createErrorResponse } from "./errors.js";

export function validateReturnTo(returnTo: string): string | Response {
  const trimmed = returnTo.trim();
  if (!trimmed) return "/";

  if (!trimmed.startsWith("/")) {
    return createErrorResponse(AUTH_INVALID_RETURN_TO, undefined, 400);
  }
  if (trimmed.includes("://") || trimmed.startsWith("//")) {
    return createErrorResponse(AUTH_INVALID_RETURN_TO, undefined, 400);
  }

  return trimmed;
}
