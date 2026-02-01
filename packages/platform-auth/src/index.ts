/**
 * Platform Auth Contract v1 — public API.
 */
import { getConfig } from "./config.js";
import { fetchOidcConfig, generatePKCE, getAuthorizeUrl, exchangeCodeForTokens, validateIdToken, validateClaims } from "./oidc.js";
import { createSessionCookie, readSessionCookie, clearSessionCookie, isProduction } from "./session.js";
import { validateReturnTo } from "./returnTo.js";
import {
  buildPkceSetCookie,
  buildStateSetCookie,
  buildClearPkceStateCookies,
  getPkceVerifier,
  getStatePayload,
} from "./pkce-cookies.js";
import { AUTH_INVALID_STATE, AUTH_TOKEN_EXCHANGE_FAILED } from "./errors.js";
import { createErrorResponse } from "./errors.js";

function clearPkceStateAndError(
  prod: boolean,
  code: "AUTH_INVALID_STATE" | "AUTH_TOKEN_EXCHANGE_FAILED",
  status: number,
  message?: string
): Response {
  const [clearPkce, clearState] = buildClearPkceStateCookies(prod);
  const resp = createErrorResponse(code, message, status);
  resp.headers.append("Set-Cookie", clearPkce);
  resp.headers.append("Set-Cookie", clearState);
  return resp;
}

function clearPkceStateAndRespond(prod: boolean, response: Response): Response {
  const [clearPkce, clearState] = buildClearPkceStateCookies(prod);
  response.headers.append("Set-Cookie", clearPkce);
  response.headers.append("Set-Cookie", clearState);
  return response;
}

import type { Session, ClaimMapping } from "./types.js";

/**
 * GET /auth/login
 * Reads returnTo, validates, generates PKCE + state, stores in cookies, redirects to IdP.
 */
export async function startLogin(req: Request, opts: { surface: string }): Promise<Response> {
  try {
    const config = getConfig();
    const url = new URL(req.url);
    const returnToRaw = url.searchParams.get("returnTo") ?? "/";
    const validated = validateReturnTo(returnToRaw);
    if (validated instanceof Response) return validated;
    const returnTo = validated;

    return await startLoginAsync(config, opts.surface, returnTo, req);
  } catch (err) {
    console.error("[platform-auth] startLogin error:", err);
    return createErrorResponse(AUTH_TOKEN_EXCHANGE_FAILED, String((err as Error)?.message ?? err), 500);
  }
}

async function startLoginAsync(
  config: ReturnType<typeof getConfig>,
  surface: string,
  returnTo: string,
  req: Request
): Promise<Response> {
  const discovery = await fetchOidcConfig(config.oidcIssuer);
  const { verifier, challenge } = await generatePKCE();

  const state = base64UrlEncode(crypto.getRandomValues(new Uint8Array(32)));
  const statePayload = { state, returnTo, surface, csrf: state };

  const prod = isProduction(req);
  const authUrl = getAuthorizeUrl(discovery, config, { state, codeChallenge: challenge });

  const pkceCookie = buildPkceSetCookie(verifier, prod);
  const stateCookie = await buildStateSetCookie(statePayload, config.sessionSecret, prod);

  return new Response(null, {
    status: 302,
    headers: {
      Location: authUrl,
      "Set-Cookie": [pkceCookie, stateCookie].join(", "),
    },
  });
}

function base64UrlEncode(buf: Uint8Array): string {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * GET /auth/callback
 * Validates state, exchanges code, validates claims, creates session, redirects to returnTo.
 */
export async function handleCallback(req: Request, opts: { surface: string }): Promise<Response> {
  try {
    const config = getConfig();
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const stateFromIdp = url.searchParams.get("state");

    if (!code || !stateFromIdp) {
      return createErrorResponse(AUTH_INVALID_STATE, undefined, 400);
    }

    const prod = isProduction(req);
    const verifier = getPkceVerifier(req, prod);
    const statePayload = await getStatePayload(req, config.sessionSecret, prod);

    if (!verifier || !statePayload) {
      return clearPkceStateAndError(prod, AUTH_INVALID_STATE, 400);
    }
    if (statePayload.state !== stateFromIdp || statePayload.surface !== opts.surface) {
      return clearPkceStateAndError(prod, AUTH_INVALID_STATE, 400);
    }

    const discovery = await fetchOidcConfig(config.oidcIssuer);
    let tokens: { id_token: string };
    try {
      tokens = await exchangeCodeForTokens(discovery, config, { code, verifier });
    } catch (err) {
      return clearPkceStateAndError(prod, AUTH_TOKEN_EXCHANGE_FAILED, 401, String((err as Error)?.message ?? err));
    }

    const claims = await validateIdToken(discovery, config, tokens.id_token);
    const result = validateClaims(claims, opts.surface);
    if (result instanceof Response) {
      return clearPkceStateAndRespond(prod, result);
    }
    const session = result;

    const sessionCookie = await createSessionCookie(session, config.sessionSecret, prod, config.sessionTtlSeconds);
    const [clearPkce, clearState] = buildClearPkceStateCookies(prod);

    const returnTo = validateReturnTo(statePayload.returnTo);
    const target = typeof returnTo === "string" ? returnTo : "/";

    return new Response(null, {
      status: 302,
      headers: {
        Location: target,
        "Set-Cookie": [sessionCookie, clearPkce, clearState].join(", "),
      },
    });
  } catch (err) {
    console.error("[platform-auth] handleCallback error:", err);
    return createErrorResponse(AUTH_TOKEN_EXCHANGE_FAILED, String((err as Error)?.message ?? err), 500);
  }
}

/**
 * GET /auth/session
 * Returns 200 JSON session or 401.
 */
export async function getSession(req: Request): Promise<{ ok: true; session: Session } | { ok: false }> {
  try {
    const config = getConfig();
    const prod = isProduction(req);
    const session = await readSessionCookie(req, config.sessionSecret, prod);
    if (session) return { ok: true, session };
    return { ok: false };
  } catch {
    return { ok: false };
  }
}

/**
 * requireSession: returns session or throws 401 Response.
 */
export async function requireSession(req: Request): Promise<Session> {
  const result = await getSession(req);
  if (result.ok) return result.session;
  throw createErrorResponse(AUTH_INVALID_STATE, "Session required", 401) as unknown as never;
}

/**
 * POST /auth/logout
 * Clears session. If global=1, redirects to IdP logout.
 */
export async function logout(req: Request, opts: { surface: string; global?: boolean }): Promise<Response> {
  const config = getConfig();
  const prod = isProduction(req);
  const clearCookie = clearSessionCookie(prod);

  const url = new URL(req.url);
  const doGlobal = url.searchParams.get("global") === "1";

  if (doGlobal) {
    const discovery = await fetchOidcConfig(config.oidcIssuer);
    const endSession = discovery.end_session_endpoint;
    if (endSession) {
      const logoutUrl = new URL(endSession);
      logoutUrl.searchParams.set("post_logout_redirect_uri", config.oidcPostLogoutRedirectUri);
      return new Response(null, {
        status: 302,
        headers: {
          Location: logoutUrl.toString(),
          "Set-Cookie": clearCookie,
        },
      });
    }
  }

  return new Response(null, {
    status: 204,
    headers: { "Set-Cookie": clearCookie },
  });
}

export type { Session, ClaimMapping };
export { AUTH_MISSING_WORKSPACE, AUTH_SURFACE_DENIED, AUTH_INVALID_STATE, AUTH_TOKEN_EXCHANGE_FAILED, AUTH_INVALID_RETURN_TO } from "./errors.js";
