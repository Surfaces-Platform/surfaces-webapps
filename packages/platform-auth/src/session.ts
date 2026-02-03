/**
 * Session cookie: sign, read, clear.
 * Cookie contract: HttpOnly, SameSite=Lax, Path=/, no Domain.
 * Production: Secure, __Host-surfaces_session. Localhost: Secure=false, surfaces_session.
 */
import * as jose from "jose";
import type { Session } from "./types.js";

export const SESSION_COOKIE_PROD = "__Host-surfaces_session";
export const SESSION_COOKIE_DEV = "surfaces_session";

function getCookieName(isProduction: boolean): string {
  return isProduction ? SESSION_COOKIE_PROD : SESSION_COOKIE_DEV;
}

function isProduction(req: Request): boolean {
  try {
    const url = new URL(req.url);
    const host = url.hostname.toLowerCase();
    return host !== "localhost" && host !== "127.0.0.1";
  } catch {
    return false;
  }
}

export async function createSessionCookie(
  session: Session,
  secret: string,
  isProduction: boolean,
  expSeconds: number
): Promise<string> {
  const key = new TextEncoder().encode(secret);
  const exp = Math.floor(Date.now() / 1000) + expSeconds;
  const token = await new jose.SignJWT({ ...session })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(exp)
    .sign(key);

  const name = getCookieName(isProduction);
  const parts = [
    `${name}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=" + expSeconds,
  ];
  if (isProduction) {
    parts.push("Secure");
  }

  return parts.join("; ");
}

export function clearSessionCookie(isProduction: boolean): string {
  const name = getCookieName(isProduction);
  return `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

function getCookieValue(req: Request, cookieName: string): string | null {
  const header = req.headers.get("cookie");
  if (!header) return null;
  const cookies = header.split(";").map((c) => c.trim());
  const prefix = cookieName + "=";
  for (const c of cookies) {
    if (c.startsWith(prefix)) {
      return decodeURIComponent(c.slice(prefix.length)).trim();
    }
  }
  return null;
}

export async function readSessionCookie(
  req: Request,
  secret: string,
  isProduction: boolean
): Promise<Session | null> {
  const name = getCookieName(isProduction);
  const value = getCookieValue(req, name);
  if (!value) return null;

  try {
    const key = new TextEncoder().encode(secret);
    const { payload } = await jose.jwtVerify(value, key);
    return {
      userId: String(payload.userId ?? ""),
      email: String(payload.email ?? ""),
      name: String(payload.name ?? ""),
      workspaceId: String(payload.workspaceId ?? ""),
      roles: Array.isArray(payload.roles) ? payload.roles.filter((r): r is string => typeof r === "string") : [],
      surfaceAccess: Array.isArray(payload.surfaceAccess) ? payload.surfaceAccess.filter((s): s is string => typeof s === "string") : [],
    };
  } catch {
    return null;
  }
}

export { isProduction };
