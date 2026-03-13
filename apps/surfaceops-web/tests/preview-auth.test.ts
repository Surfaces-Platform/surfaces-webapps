import { describe, expect, it } from "vitest";
import {
  mergePreviewCookieIntoStorageState,
  parseVercelBypassCookie,
} from "@/lib/contract-workbench/preview-auth";

describe("preview auth helpers", () => {
  it("parses a Vercel bypass cookie for a preview host", () => {
    const cookie = parseVercelBypassCookie(
      [
        "HTTP/2 307",
        "set-cookie: _vercel_jwt=test-token; Max-Age=604800; Path=/; Secure; HttpOnly; SameSite=Lax",
        "",
      ].join("\n"),
      "https://surfaceopsai-git-main-surfaces-platform.vercel.app/contracts/governance",
    );

    expect(cookie.name).toBe("_vercel_jwt");
    expect(cookie.value).toBe("test-token");
    expect(cookie.domain).toBe("surfaceopsai-git-main-surfaces-platform.vercel.app");
    expect(cookie.path).toBe("/");
    expect(cookie.secure).toBe(true);
    expect(cookie.httpOnly).toBe(true);
    expect(cookie.sameSite).toBe("Lax");
    expect(cookie.expires).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it("merges the preview cookie into an existing Playwright storage state", () => {
    const storageState = mergePreviewCookieIntoStorageState(
      {
        cookies: [
          {
            name: "_vercel_jwt",
            value: "stale-token",
            domain: "surfaceopsai-git-main-surfaces-platform.vercel.app",
            path: "/",
            expires: -1,
            httpOnly: true,
            secure: true,
            sameSite: "Lax",
          },
          {
            name: "surfaceops_session",
            value: "app-auth",
            domain: "surfaceopsai-git-main-surfaces-platform.vercel.app",
            path: "/",
            expires: -1,
            httpOnly: true,
            secure: true,
            sameSite: "Lax",
          },
        ],
        origins: [{ origin: "https://surfaceopsai-git-main-surfaces-platform.vercel.app", localStorage: [] }],
      },
      {
        name: "_vercel_jwt",
        value: "fresh-token",
        domain: "surfaceopsai-git-main-surfaces-platform.vercel.app",
        path: "/",
        expires: 123,
        httpOnly: true,
        secure: true,
        sameSite: "Lax",
      },
    );

    expect(storageState.origins).toHaveLength(1);
    expect(storageState.cookies).toHaveLength(2);
    expect(
      storageState.cookies.find((cookie) => cookie.name === "_vercel_jwt")?.value,
    ).toBe("fresh-token");
    expect(
      storageState.cookies.find((cookie) => cookie.name === "surfaceops_session")?.value,
    ).toBe("app-auth");
  });
});
