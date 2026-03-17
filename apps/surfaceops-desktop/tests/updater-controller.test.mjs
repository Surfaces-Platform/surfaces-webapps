import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";

import { SurfaceOpsUpdaterController } from "../lib/updater-controller.cjs";

class FakeUpdaterAdapter extends EventEmitter {
  constructor(handler) {
    super();
    this.handler = handler;
    this.quitCalled = false;
  }

  async checkForUpdates() {
    await this.handler(this);
  }

  quitAndInstall() {
    this.quitCalled = true;
  }
}

test("updater controller settles to idle when no update is available", async () => {
  const adapter = new FakeUpdaterAdapter(async (emitter) => {
    emitter.emit("checking-for-update");
    emitter.emit("update-not-available");
  });

  const controller = new SurfaceOpsUpdaterController({
    adapter,
    currentVersion: "0.1.0",
  });

  await controller.checkForUpdates({ reason: "manual" });
  const status = controller.getStatus();
  assert.equal(status.phase, "idle");
  assert.equal(status.updateAvailable, false);
  assert.equal(status.availableVersion, null);
});

test("updater controller tracks available and downloaded updates", async () => {
  const adapter = new FakeUpdaterAdapter(async (emitter) => {
    emitter.emit("checking-for-update");
    emitter.emit("update-available", {
      version: "0.1.1",
      releaseDate: "2026-03-16T00:00:00.000Z",
      releaseNotes: "Desktop alpha refresh",
    });
    emitter.emit("download-progress", { percent: 47.2 });
    emitter.emit("update-downloaded", {
      version: "0.1.1",
      releaseDate: "2026-03-16T00:00:00.000Z",
      releaseNotes: "Desktop alpha refresh",
    });
  });

  const prompted = [];
  const controller = new SurfaceOpsUpdaterController({
    adapter,
    currentVersion: "0.1.0",
    onPromptRestart: async (status) => {
      prompted.push(status.downloadedVersion);
    },
  });

  await controller.checkForUpdates({ reason: "startup" });
  const status = controller.getStatus();
  assert.equal(status.phase, "update-downloaded");
  assert.equal(status.availableVersion, "0.1.1");
  assert.equal(status.downloadedVersion, "0.1.1");
  assert.equal(status.updateDownloaded, true);
  assert.equal(status.progressPercent, 100);
  assert.deepEqual(prompted, ["0.1.1"]);
});

test("updater controller reprompts on focus when an update is pending", async () => {
  let now = 0;
  const adapter = new FakeUpdaterAdapter(async () => {});
  const prompted = [];
  const controller = new SurfaceOpsUpdaterController({
    adapter,
    currentVersion: "0.1.0",
    now: () => now,
    promptRepeatMs: 10,
    onPromptRestart: async (status) => {
      prompted.push(status.downloadedVersion);
    },
  });

  controller.handleUpdateDownloaded({
    version: "0.2.0",
    releaseDate: "2026-03-16T00:00:00.000Z",
  });
  now += 5;
  await controller.handleFocus();
  now += 10;
  await controller.handleFocus();

  assert.deepEqual(prompted, ["0.2.0", "0.2.0"]);
});

test("updater controller restarts to install downloaded updates", async () => {
  const adapter = new FakeUpdaterAdapter(async () => {});
  const controller = new SurfaceOpsUpdaterController({
    adapter,
    currentVersion: "0.1.0",
  });

  controller.handleUpdateDownloaded({ version: "0.3.0" });
  const restarted = await controller.restartToUpdate();

  assert.equal(restarted, true);
  assert.equal(adapter.quitCalled, true);
});
