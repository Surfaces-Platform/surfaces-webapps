export interface PlaywrightCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires: number;
  httpOnly: boolean;
  secure: boolean;
  sameSite: "Strict" | "Lax" | "None";
}

export interface PlaywrightStorageState {
  cookies: PlaywrightCookie[];
  origins: Array<Record<string, unknown>>;
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function toSameSite(value: string | undefined): PlaywrightCookie["sameSite"] {
  if (value === "Strict" || value === "None") {
    return value;
  }
  return "Lax";
}

export function parseVercelBypassCookie(headersText: string, previewUrl: string): PlaywrightCookie {
  const match = headersText.match(/^set-cookie:\s*_vercel_jwt=([^;]+);([^\n]*)$/im);
  if (!match) {
    throw new Error("Could not find a Vercel protection bypass cookie in the response headers.");
  }

  const url = new URL(previewUrl);
  const value = match[1];
  const attributes = match[2]
    .split(";")
    .map((attribute) => attribute.trim())
    .filter(Boolean);

  const maxAge = attributes.find((attribute) => attribute.toLowerCase().startsWith("max-age="));
  const sameSite = attributes.find((attribute) => attribute.toLowerCase().startsWith("samesite="));
  const secure = attributes.some((attribute) => attribute.toLowerCase() === "secure");
  const httpOnly = attributes.some((attribute) => attribute.toLowerCase() === "httponly");
  const pathAttr = attributes.find((attribute) => attribute.toLowerCase().startsWith("path="));
  const expirySeconds = maxAge ? Number.parseInt(maxAge.split("=")[1] ?? "", 10) : 60 * 60;

  return {
    name: "_vercel_jwt",
    value,
    domain: url.hostname,
    path: pathAttr?.split("=")[1] || "/",
    expires: Math.floor(Date.now() / 1000) + (Number.isFinite(expirySeconds) ? expirySeconds : 60 * 60),
    httpOnly,
    secure,
    sameSite: toSameSite(sameSite?.split("=")[1]),
  };
}

export function mergePreviewCookieIntoStorageState(
  storageState: Record<string, unknown> | null | undefined,
  cookie: PlaywrightCookie,
): PlaywrightStorageState {
  const parsed = asObject(storageState);
  const cookies = Array.isArray(parsed?.cookies) ? [...parsed.cookies] : [];
  const origins = Array.isArray(parsed?.origins)
    ? parsed.origins.filter((entry): entry is Record<string, unknown> => Boolean(asObject(entry)))
    : [];

  const normalizedCookies = cookies
    .map((entry) => asObject(entry))
    .filter((entry): entry is Record<string, unknown> => entry !== null)
    .filter((entry) => {
      return !(
        entry.name === cookie.name &&
        entry.domain === cookie.domain &&
        entry.path === cookie.path
      );
    })
    .map((entry) => ({
      name: String(entry.name ?? ""),
      value: String(entry.value ?? ""),
      domain: String(entry.domain ?? ""),
      path: String(entry.path ?? "/"),
      expires:
        typeof entry.expires === "number" && Number.isFinite(entry.expires)
          ? entry.expires
          : -1,
      httpOnly: Boolean(entry.httpOnly),
      secure: Boolean(entry.secure),
      sameSite: toSameSite(typeof entry.sameSite === "string" ? entry.sameSite : undefined),
    }))
    .filter((entry) => entry.name && entry.domain);

  normalizedCookies.push(cookie);

  return {
    cookies: normalizedCookies,
    origins,
  };
}
