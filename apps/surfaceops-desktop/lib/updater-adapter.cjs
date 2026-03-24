const fs = require("node:fs");
const { EventEmitter } = require("node:events");
const { setTimeout: wait } = require("node:timers/promises");
const {
  DEFAULT_UPDATE_BASE_URL,
  DEFAULT_UPDATE_CHANNEL,
} = require("@surfaces/surfaceops-desktop-bridge");

function createDisabledUpdaterAdapter(reason) {
  const adapter = new EventEmitter();
  adapter.disabledReason = reason;
  adapter.checkForUpdates = async () => ({ disabled: true, reason });
  adapter.quitAndInstall = () => false;
  return adapter;
}

function createElectronUpdaterAdapter({
  baseUrl = DEFAULT_UPDATE_BASE_URL,
  channel = DEFAULT_UPDATE_CHANNEL,
  platform = "darwin-arm64",
  forceDevUpdateConfig = false,
}) {
  const { autoUpdater } = require("electron-updater");

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowPrerelease = channel !== "stable";
  autoUpdater.forceDevUpdateConfig = forceDevUpdateConfig;
  autoUpdater.setFeedURL({
    provider: "generic",
    url: `${baseUrl.replace(/\/+$/, "")}/${channel}/${platform}`,
  });

  return autoUpdater;
}

function normalizeMockReleaseNotes(value) {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  if (Array.isArray(value)) {
    return value.map((entry) => String(entry ?? "").trim()).filter(Boolean).join("\n\n") || null;
  }

  return null;
}

function createHttpSmokeUpdaterAdapter({ statusUrl }) {
  const adapter = new EventEmitter();
  adapter.statusUrl = statusUrl.replace(/\/+$/, "");
  adapter.latestPayload = null;
  adapter.quitAndInstall = () => {
    const signalPath = adapter.latestPayload?.quitAndInstallSignalPath;
    if (typeof signalPath === "string" && signalPath.trim()) {
      fs.mkdirSync(require("node:path").dirname(signalPath), { recursive: true });
      fs.writeFileSync(
        signalPath,
        JSON.stringify({
          requestedAt: new Date().toISOString(),
          version: adapter.latestPayload?.version ?? null,
        }, null, 2),
        "utf8",
      );
    }
    return true;
  };
  adapter.checkForUpdates = async () => {
    adapter.emit("checking-for-update");
    const response = await fetch(adapter.statusUrl, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Smoke updater status fetch failed with ${response.status}.`);
    }

    const payload = await response.json();
    adapter.latestPayload = payload;
    if (!payload?.available) {
      adapter.emit("update-not-available");
      return { available: false };
    }

    const info = {
      version: typeof payload.version === "string" ? payload.version : null,
      releaseDate: payload.releaseDate ?? new Date().toISOString(),
      releaseNotes: normalizeMockReleaseNotes(payload.releaseNotes),
    };
    adapter.emit("update-available", info);

    const progressPercents = Array.isArray(payload.progressPercents)
      ? payload.progressPercents.filter((value) => Number.isFinite(value))
      : [100];
    for (const percent of progressPercents) {
      await wait(10);
      adapter.emit("download-progress", { percent });
    }

    adapter.emit("update-downloaded", info);
    return { available: true, info };
  };
  return adapter;
}

module.exports = {
  createDisabledUpdaterAdapter,
  createElectronUpdaterAdapter,
  createHttpSmokeUpdaterAdapter,
};
