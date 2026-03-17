import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import fsp from "node:fs/promises";

import { createSurfaceOpsDesktopPreferencesStore } from "../lib/preferences-store.cjs";

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
