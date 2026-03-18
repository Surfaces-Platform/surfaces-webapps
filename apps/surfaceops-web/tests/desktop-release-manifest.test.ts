import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_DESKTOP_RELEASE_MANIFEST,
  buildDesktopLatestMacYml,
  buildDesktopUpdateAssetPath,
  loadDesktopReleaseManifest,
  getPromotedDesktopRelease,
} from "@/lib/desktop-release-manifest";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("desktop release manifest helpers", () => {
  it("returns the promoted alpha release from the fallback manifest", () => {
    const release = getPromotedDesktopRelease(DEFAULT_DESKTOP_RELEASE_MANIFEST, "alpha");
    expect(release?.id).toBe("desktop-alpha-0.1.0");
  });

  it("builds canonical asset paths", () => {
    expect(buildDesktopUpdateAssetPath("alpha", "darwin-arm64", "latest-mac.yml")).toBe(
      "/api/desktop/updates/alpha/darwin-arm64/latest-mac.yml",
    );
  });

  it("emits updater yaml when a published zip exists", () => {
    const release = {
      ...DEFAULT_DESKTOP_RELEASE_MANIFEST.channels.alpha.releases[0],
      availability: "published" as const,
      platforms: {
        "darwin-arm64": {
          dmg: { url: "https://example.com/SurfaceOps.dmg", size: 10, sha512: "dmg-sha" },
          zip: { url: "https://example.com/SurfaceOps.zip", size: 12, sha512: "zip-sha" },
        },
      },
    };

    const yaml = buildDesktopLatestMacYml(release, "alpha", "darwin-arm64");
    expect(yaml).toContain("version: 0.1.0");
    expect(yaml).toContain("url: download.zip");
    expect(yaml).toContain("sha512: zip-sha");
  });

  it("loads an explicit rehearsal manifest override without using the production default", async () => {
    vi.stubEnv("SURFACEOPS_DESKTOP_RELEASE_MANIFEST_URL", "https://example.com/rehearsal-manifest.json");
    vi.stubEnv("NODE_ENV", "production");

    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(DEFAULT_DESKTOP_RELEASE_MANIFEST), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const manifest = await loadDesktopReleaseManifest();

    expect(fetchMock).toHaveBeenCalledWith("https://example.com/rehearsal-manifest.json", { cache: "no-store" });
    expect(manifest.channels.alpha.promotedReleaseId).toBe("desktop-alpha-0.1.0");
  });
});
