import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/desktop/updates/[channel]/[platform]/[[...asset]]/route";

const mocked = vi.hoisted(() => ({
  loadDesktopReleaseManifest: vi.fn(),
  getPromotedDesktopRelease: vi.fn(),
  parseDesktopReleaseChannel: vi.fn(),
  parseDesktopReleasePlatform: vi.fn(),
  resolveDesktopArtifact: vi.fn(),
  buildDesktopLatestMacYml: vi.fn(),
  buildDesktopUpdateAssetPath: vi.fn(),
}));

vi.mock("@/lib/desktop-release-manifest", () => ({
  loadDesktopReleaseManifest: mocked.loadDesktopReleaseManifest,
  getPromotedDesktopRelease: mocked.getPromotedDesktopRelease,
  parseDesktopReleaseChannel: mocked.parseDesktopReleaseChannel,
  parseDesktopReleasePlatform: mocked.parseDesktopReleasePlatform,
  resolveDesktopArtifact: mocked.resolveDesktopArtifact,
  buildDesktopLatestMacYml: mocked.buildDesktopLatestMacYml,
  buildDesktopUpdateAssetPath: mocked.buildDesktopUpdateAssetPath,
}));

describe("desktop update feed route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.parseDesktopReleaseChannel.mockReturnValue("alpha");
    mocked.parseDesktopReleasePlatform.mockReturnValue("darwin-arm64");
    mocked.loadDesktopReleaseManifest.mockResolvedValue({});
    mocked.getPromotedDesktopRelease.mockReturnValue({
      id: "desktop-alpha-1.0.0",
      version: "1.0.0",
      name: "SurfaceOps Desktop 1.0.0",
      publishedAt: "2026-03-17T00:00:00.000Z",
      availability: "published",
      notes: { title: "SurfaceOps Desktop 1.0.0", summary: "summary", bullets: [] },
      platforms: {
        "darwin-arm64": {
          dmg: { url: "https://example.com/SurfaceOps.dmg", size: 1, sha512: "dmg" },
          zip: { url: "https://example.com/SurfaceOps.zip", size: 1, sha512: "zip" },
        },
      },
    });
    mocked.resolveDesktopArtifact.mockImplementation((_release, _platform, kind) => {
      if (kind === "zip") {
        return { url: "https://example.com/SurfaceOps.zip", size: 1, sha512: "zip" };
      }
      return { url: "https://example.com/SurfaceOps.dmg", size: 1, sha512: "dmg" };
    });
    mocked.buildDesktopUpdateAssetPath.mockImplementation((_channel, _platform, asset) => `/api/desktop/updates/alpha/darwin-arm64/${asset}`);
    mocked.buildDesktopLatestMacYml.mockReturnValue("version: 1.0.0");
  });

  it("returns JSON metadata for the promoted release", async () => {
    const response = await GET(
      new Request("http://localhost/api/desktop/updates/alpha/darwin-arm64"),
      { params: Promise.resolve({ channel: "alpha", platform: "darwin-arm64", asset: [] }) },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      release: {
        version: "1.0.0",
      },
    });
  });

  it("serves latest-mac.yml from the manifest release", async () => {
    const response = await GET(
      new Request("http://localhost/api/desktop/updates/alpha/darwin-arm64/latest-mac.yml"),
      { params: Promise.resolve({ channel: "alpha", platform: "darwin-arm64", asset: ["latest-mac.yml"] }) },
    );

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toContain("version: 1.0.0");
  });

  it("redirects ZIP downloads to the promoted artifact", async () => {
    const response = await GET(
      new Request("http://localhost/api/desktop/updates/alpha/darwin-arm64/download.zip"),
      { params: Promise.resolve({ channel: "alpha", platform: "darwin-arm64", asset: ["download.zip"] }) },
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://example.com/SurfaceOps.zip");
  });
});
