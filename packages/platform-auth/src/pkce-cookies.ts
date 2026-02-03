/**
 * Short-lived cookies for PKCE verifier and state during OIDC flow.
 */
import * as jose from "jose";
import type { StatePayload } from "./types.js";

const PKCE_COOKIE_PROD = "__Host-surfaces_pkce";
const PKCE_COOKIE_DEV = "surfaces_pkce";
const STATE_COOKIE_PROD = "__Host-surfaces_state";
const STATE_COOKIE_DEV = "surfaces_state";
const PKCE_TTL_SEC = 600; // 10 minutes

function pkceName(prod: boolean) {
  return prod ? PKCE_COOKIE_PROD : PKCE_COOKIE_DEV;
}
function stateName(prod: boolean) {
  return prod ? STATE_COOKIE_PROD : STATE_COOKIE_DEV;
}

function cookieParts(prod: boolean): string[] {
  return ["Path=/", "HttpOnly", "SameSite=Lax", `Max-Age=${PKCE_TTL_SEC}`];
}

export function buildPkceSetCookie(verifier: string, prod: boolean): string {
  const name = pkceName(prod);
  const parts = [name + "=" + encodeURIComponent(verifier), ...cookieParts(prod)];
  if (prod) parts.push("Secure");
  return parts.join("; ");
}

export function buildStateSetCookie(payload: StatePayload, secret: string, prod: boolean): Promise<string> {
  return (async () => {
    const key = new TextEncoder().encode(secret);
    const token = await new jose.SignJWT(payload as unknown as jose.JWTPayload)
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("10m")
      .sign(key);
    const name = stateName(prod);
    const parts = [name + "=" + encodeURIComponent(token), ...cookieParts(prod)];
    if (prod) parts.push("Secure");
    return parts.join("; ");
  })();
}

export function buildClearPkceStateCookies(prod: boolean): [string, string] {
  const clear = (n: string) => `${n}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
  return [clear(pkceName(prod)), clear(stateName(prod))];
}

function getCookie(req: Request, name: string): string | null {
  const header = req.headers.get("cookie");
  if (!header) return null;
  const prefix = name + "=";
  for (const c of header.split(";").map((s) => s.trim())) {
    if (c.startsWith(prefix)) {
      return decodeURIComponent(c.slice(prefix.length)).trim();
    }
  }
  return null;
}

export function getPkceVerifier(req: Request, prod: boolean): string | null {
  return getCookie(req, pkceName(prod));
}

export async function getStatePayload(
  req: Request,
  secret: string,
  prod: boolean
): Promise<StatePayload | null> {
  const raw = getCookie(req, stateName(prod));
  if (!raw) return null;
  try {
    const key = new TextEncoder().encode(secret);
    const { payload } = await jose.jwtVerify(raw, key);
    return payload as unknown as StatePayload;
  } catch {
    return null;
  }
}
