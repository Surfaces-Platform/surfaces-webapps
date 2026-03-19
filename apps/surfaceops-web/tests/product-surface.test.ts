import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  SURFACEOPS_DESKTOP_SETUP_PATH,
  SURFACEOPS_DESKTOP_WORKBENCH_PATH,
  createDefaultModelInstallState,
  createDefaultModelState,
  createDefaultRuntimeStatus,
} from "@surfaces/surfaceops-desktop-bridge";
import {
  getSurfaceOpsNavigation,
  isSurfaceOpsDesktopRuntimeEnabled,
  isSurfaceOpsDesktopMarketingMode,
  resolveSurfaceOpsDesktopRuntimePath,
  shouldRedirectToSurfaceOpsDesktopWorkbench,
  shouldRenderSurfaceOpsGlobalChrome,
  shouldRedirectHostedContractsRoutes,
} from "@/lib/product-surface";

async function writeDesktopPreferences(overrides: Record<string, unknown> = {}) {
  const sandbox = await fs.mkdtemp(path.join(os.tmpdir(), "surfaceops-desktop-state-"));
  const filePath = path.join(sandbox, "preferences.json");
  const baseline = createDefaultModelState({
    hardwareProfile: {
      ...createDefaultModelState().hardwareProfile,
      chip: "Apple M2 Pro",
      unifiedMemoryGb: 24,
      recommendedModelId: "balanced",
      supported: true,
      reason: null,
    },
  });

  await fs.writeFile(filePath, JSON.stringify({ ...baseline, ...overrides }, null, 2), "utf8");
  return { sandbox, filePath };
}

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
    expect(shouldRedirectToSurfaceOpsDesktopWorkbench("/contracts/governance")).toBe(true);
    expect(resolveSurfaceOpsDesktopRuntimePath()).toBe(SURFACEOPS_DESKTOP_SETUP_PATH);
  });

  it("keeps desktop runtime pinned to setup until a managed model is ready", async () => {
    const { sandbox, filePath } = await writeDesktopPreferences();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SURFACEOPS_LOCAL_WORKBENCH", "1");
    vi.stubEnv("SURFACEOPS_DESKTOP_RUNTIME", "1");
    vi.stubEnv("SURFACEOPS_DESKTOP_PREFERENCES_PATH", filePath);

    try {
      expect(resolveSurfaceOpsDesktopRuntimePath()).toBe(SURFACEOPS_DESKTOP_SETUP_PATH);
      expect(shouldRedirectToSurfaceOpsDesktopWorkbench("/desktop/setup")).toBe(false);
      expect(shouldRedirectToSurfaceOpsDesktopWorkbench("/contracts/governance")).toBe(true);
    } finally {
      await fs.rm(sandbox, { recursive: true, force: true });
    }
  });

  it("sends desktop runtime to the workbench after managed model setup completes", async () => {
    const { sandbox, filePath } = await writeDesktopPreferences({
      activeModelId: "balanced",
      installedModel: {
        modelId: "balanced",
        path: "/tmp/balanced.gguf",
        sha256: "abc123",
        sizeBytes: 10,
        installedAt: "2026-03-18T00:00:00.000Z",
      },
      installState: createDefaultModelInstallState({
        phase: "ready",
        modelId: "balanced",
        progressPercent: 100,
      }),
      runtimeStatus: createDefaultRuntimeStatus({
        phase: "ready",
        modelId: "balanced",
        healthy: true,
        baseUrl: "http://127.0.0.1:3312/v1",
      }),
    });
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SURFACEOPS_LOCAL_WORKBENCH", "1");
    vi.stubEnv("SURFACEOPS_DESKTOP_RUNTIME", "1");
    vi.stubEnv("SURFACEOPS_DESKTOP_PREFERENCES_PATH", filePath);

    try {
      expect(resolveSurfaceOpsDesktopRuntimePath()).toBe(SURFACEOPS_DESKTOP_WORKBENCH_PATH);
      expect(shouldRedirectToSurfaceOpsDesktopWorkbench("/download")).toBe(true);
      expect(shouldRedirectToSurfaceOpsDesktopWorkbench("/desktop/setup")).toBe(false);
      expect(shouldRedirectToSurfaceOpsDesktopWorkbench("/contracts/governance")).toBe(false);
    } finally {
      await fs.rm(sandbox, { recursive: true, force: true });
    }
  });
});
