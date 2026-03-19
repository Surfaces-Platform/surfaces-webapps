import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createDefaultModelInstallState,
  createDefaultModelState,
  createDefaultRuntimeStatus,
} from "@surfaces/surfaceops-desktop-bridge";

const mocked = vi.hoisted(() => ({
  redirect: vi.fn((target: string) => {
    throw new Error(`redirect:${target}`);
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: mocked.redirect,
}));

import DesktopPage from "@/app/desktop/page";

async function writeReadyDesktopPreferences() {
  const sandbox = await fs.mkdtemp(path.join(os.tmpdir(), "surfaceops-desktop-page-"));
  const filePath = path.join(sandbox, "preferences.json");
  await fs.writeFile(filePath, JSON.stringify(createDefaultModelState({
    hardwareProfile: {
      ...createDefaultModelState().hardwareProfile,
      chip: "Apple M2 Pro",
      unifiedMemoryGb: 24,
      recommendedModelId: "balanced",
      supported: true,
      reason: null,
    },
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
  }), null, 2), "utf8");
  return { sandbox, filePath };
}

describe("desktop compatibility route", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("sends desktop runtime to setup until a managed model is installed", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SURFACEOPS_LOCAL_WORKBENCH", "1");
    vi.stubEnv("SURFACEOPS_DESKTOP_RUNTIME", "1");

    expect(() => DesktopPage()).toThrowError("redirect:/desktop/setup");
    expect(mocked.redirect).toHaveBeenCalledWith("/desktop/setup");
  });

  it("sends desktop runtime to the workbench once a managed model is ready", async () => {
    const { sandbox, filePath } = await writeReadyDesktopPreferences();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SURFACEOPS_LOCAL_WORKBENCH", "1");
    vi.stubEnv("SURFACEOPS_DESKTOP_RUNTIME", "1");
    vi.stubEnv("SURFACEOPS_DESKTOP_PREFERENCES_PATH", filePath);

    try {
      expect(() => DesktopPage()).toThrowError("redirect:/contracts/governance");
      expect(mocked.redirect).toHaveBeenCalledWith("/contracts/governance");
    } finally {
      await fs.rm(sandbox, { recursive: true, force: true });
    }
  });

  it("redirects the public /desktop route to the download page", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SURFACEOPS_LOCAL_WORKBENCH", undefined);
    vi.stubEnv("SURFACEOPS_DESKTOP_RUNTIME", undefined);

    expect(() => DesktopPage()).toThrowError("redirect:/download");
    expect(mocked.redirect).toHaveBeenCalledWith("/download");
  });
});
