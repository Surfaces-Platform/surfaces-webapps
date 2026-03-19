import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import fsp from "node:fs/promises";

import { createSurfaceOpsDesktopPreferencesStore } from "../lib/preferences-store.cjs";
import {
  SURFACEOPS_MODEL_CATALOG_VERSION,
  createDefaultModelInstallState,
  createDefaultModelState,
  createDefaultRuntimeStatus,
} from "@surfaces/surfaceops-desktop-bridge";

test("preferences store falls back to the default update channel", async () => {
  const sandbox = await fsp.mkdtemp(path.join(os.tmpdir(), "surfaceops-desktop-preferences-"));

  try {
    const store = createSurfaceOpsDesktopPreferencesStore({
      filePath: path.join(sandbox, "preferences.json"),
      defaultUpdateChannel: "alpha",
    });

    assert.equal(store.getUpdateChannel(), "alpha");
  } finally {
    await fsp.rm(sandbox, { recursive: true, force: true });
  }
});

test("preferences store persists a valid update channel", async () => {
  const sandbox = await fsp.mkdtemp(path.join(os.tmpdir(), "surfaceops-desktop-preferences-"));

  try {
    const filePath = path.join(sandbox, "preferences.json");
    const store = createSurfaceOpsDesktopPreferencesStore({
      filePath,
      defaultUpdateChannel: "alpha",
    });

    const nextPreferences = store.setUpdateChannel("stable");

    assert.equal(nextPreferences.updateChannel, "stable");
    assert.equal(store.getUpdateChannel(), "stable");
    assert.equal(fs.existsSync(filePath), true);
  } finally {
    await fsp.rm(sandbox, { recursive: true, force: true });
  }
});

test("preferences store ignores invalid persisted channels", async () => {
  const sandbox = await fsp.mkdtemp(path.join(os.tmpdir(), "surfaceops-desktop-preferences-"));

  try {
    const filePath = path.join(sandbox, "preferences.json");
    await fsp.writeFile(
      filePath,
      JSON.stringify({ updateChannel: "beta" }, null, 2),
      "utf8",
    );

    const store = createSurfaceOpsDesktopPreferencesStore({
      filePath,
      defaultUpdateChannel: "alpha",
    });

    assert.equal(store.getUpdateChannel(), "alpha");
  } finally {
    await fsp.rm(sandbox, { recursive: true, force: true });
  }
});

test("preferences store persists managed model state", async () => {
  const sandbox = await fsp.mkdtemp(path.join(os.tmpdir(), "surfaceops-desktop-preferences-"));

  try {
    const filePath = path.join(sandbox, "preferences.json");
    const store = createSurfaceOpsDesktopPreferencesStore({
      filePath,
      defaultUpdateChannel: "alpha",
    });

    const nextPreferences = store.updatePreferences((current) => ({
      ...current,
      catalogVersion: SURFACEOPS_MODEL_CATALOG_VERSION,
      hardwareProfile: {
        ...createDefaultModelState().hardwareProfile,
        chip: "Apple M3 Pro",
        unifiedMemoryGb: 36,
        recommendedModelId: "quality",
        supported: true,
        reason: null,
      },
      activeModelId: "quality",
      installedModel: {
        modelId: "quality",
        path: "/tmp/quality.gguf",
        sha256: "abc123",
        sizeBytes: 123,
        installedAt: "2026-03-18T00:00:00.000Z",
      },
      installState: createDefaultModelInstallState({
        phase: "ready",
        modelId: "quality",
        progressPercent: 100,
      }),
      runtimeStatus: createDefaultRuntimeStatus({
        phase: "ready",
        modelId: "quality",
        healthy: true,
        baseUrl: "http://127.0.0.1:3312/v1",
      }),
      lastBenchmarkSummary: {
        benchmarkId: "bench-1",
        createdAt: "2026-03-18T00:10:00.000Z",
        modelId: "quality",
        label: "quality local benchmark",
        durationMs: 950,
        outputTokensPerSecond: 42.5,
        promptTokens: 12,
        completionTokens: 40,
        artifactPath: "/tmp/bench-1.json",
      },
    }));

    assert.equal(nextPreferences.activeModelId, "quality");
    assert.equal(nextPreferences.hardwareProfile.chip, "Apple M3 Pro");
    assert.equal(nextPreferences.runtimeStatus.phase, "ready");
    assert.equal(nextPreferences.runtimeStatus.healthy, true);
    assert.equal(nextPreferences.lastBenchmarkSummary?.benchmarkId, "bench-1");
    assert.equal(fs.existsSync(filePath), true);
  } finally {
    await fsp.rm(sandbox, { recursive: true, force: true });
  }
});
