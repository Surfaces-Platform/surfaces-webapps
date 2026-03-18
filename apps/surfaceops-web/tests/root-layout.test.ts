import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveSurfaceOpsRootChrome } from "@/lib/root-layout";

describe("surfaceops root layout chrome", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("keeps shared navigation for the public marketing site", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SURFACEOPS_LOCAL_WORKBENCH", undefined);
    vi.stubEnv("SURFACEOPS_DESKTOP_RUNTIME", undefined);

    const chrome = resolveSurfaceOpsRootChrome();

    expect(chrome.showGlobalChrome).toBe(true);
    expect(chrome.navigation?.sections.map((section) => section.label)).toEqual([
      "Overview",
      "Download",
      "Release Notes",
    ]);
  });

  it("removes shared navigation entirely in desktop runtime", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SURFACEOPS_LOCAL_WORKBENCH", "1");
    vi.stubEnv("SURFACEOPS_DESKTOP_RUNTIME", "1");

    const chrome = resolveSurfaceOpsRootChrome();

    expect(chrome.showGlobalChrome).toBe(false);
    expect(chrome.navigation).toBeNull();
  });
});
