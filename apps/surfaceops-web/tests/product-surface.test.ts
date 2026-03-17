import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getSurfaceOpsNavigation,
  isSurfaceOpsDesktopRuntimeEnabled,
  isSurfaceOpsDesktopMarketingMode,
  shouldRedirectToSurfaceOpsDesktopWorkbench,
  shouldRenderSurfaceOpsGlobalChrome,
  shouldRedirectHostedContractsRoutes,
} from "@/lib/product-surface";

describe("surfaceops product surface", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses marketing navigation and redirects hosted contracts in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SURFACEOPS_LOCAL_WORKBENCH", undefined);

    const navigation = getSurfaceOpsNavigation();

    expect(isSurfaceOpsDesktopMarketingMode()).toBe(true);
    expect(isSurfaceOpsDesktopRuntimeEnabled()).toBe(false);
    expect(shouldRenderSurfaceOpsGlobalChrome()).toBe(true);
    expect(shouldRedirectHostedContractsRoutes()).toBe(true);
    expect(shouldRedirectToSurfaceOpsDesktopWorkbench("/download")).toBe(false);
    expect(navigation.sections.map((section) => section.label)).toEqual([
      "Overview",
      "Download",
      "Release Notes",
    ]);
    expect(navigation.utilities.map((utility) => utility.label)).toEqual(["surfaces.dev"]);
  });

  it("keeps local workbench navigation when local mode is enabled", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SURFACEOPS_LOCAL_WORKBENCH", "1");
    vi.stubEnv("SURFACEOPS_DESKTOP_RUNTIME", undefined);

    const navigation = getSurfaceOpsNavigation();

    expect(isSurfaceOpsDesktopMarketingMode()).toBe(false);
    expect(isSurfaceOpsDesktopRuntimeEnabled()).toBe(false);
    expect(shouldRenderSurfaceOpsGlobalChrome()).toBe(true);
    expect(shouldRedirectHostedContractsRoutes()).toBe(false);
    expect(shouldRedirectToSurfaceOpsDesktopWorkbench("/contracts/governance")).toBe(false);
    expect(navigation.sections.map((section) => section.label)).toEqual([
      "Overview",
      "Workbench",
      "Runs",
    ]);
    expect(navigation.utilities.map((utility) => utility.label)).toEqual([
      "Download",
      "Release Notes",
    ]);
  });

  it("uses the single-page desktop shell when desktop runtime is enabled", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SURFACEOPS_LOCAL_WORKBENCH", "1");
    vi.stubEnv("SURFACEOPS_DESKTOP_RUNTIME", "1");

    expect(isSurfaceOpsDesktopMarketingMode()).toBe(false);
    expect(isSurfaceOpsDesktopRuntimeEnabled()).toBe(true);
    expect(shouldRenderSurfaceOpsGlobalChrome()).toBe(false);
    expect(shouldRedirectHostedContractsRoutes()).toBe(false);
    expect(shouldRedirectToSurfaceOpsDesktopWorkbench("/")).toBe(true);
    expect(shouldRedirectToSurfaceOpsDesktopWorkbench("/download")).toBe(true);
    expect(shouldRedirectToSurfaceOpsDesktopWorkbench("/contracts")).toBe(true);
    expect(shouldRedirectToSurfaceOpsDesktopWorkbench("/contracts/reference-target-web")).toBe(true);
    expect(shouldRedirectToSurfaceOpsDesktopWorkbench("/contracts/governance")).toBe(false);
  });
});
