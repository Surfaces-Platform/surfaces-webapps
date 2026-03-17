const { EventEmitter } = require("node:events");
const {
  createDefaultUpdateStatus,
  DEFAULT_UPDATE_CHANNEL,
} = require("@surfaces/surfaceops-desktop-bridge");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeReleaseNotes(value) {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  if (Array.isArray(value)) {
    const text = value
      .map((entry) => {
        if (!entry || typeof entry !== "object") {
          return null;
        }
        if (typeof entry.note === "string" && entry.note.trim()) {
          return entry.note.trim();
        }
        return null;
      })
      .filter(Boolean)
      .join("\n\n");
    return text || null;
  }

  if (value && typeof value === "object" && typeof value.releaseNotes === "string") {
    return value.releaseNotes.trim() || null;
  }

  return null;
}

class SurfaceOpsUpdaterController extends EventEmitter {
  constructor({
    adapter,
    channel = DEFAULT_UPDATE_CHANNEL,
    currentVersion = "0.1.0",
    now = () => Date.now(),
    debounceMs = 30_000,
    intervalMs = 4 * 60 * 60 * 1000,
    promptRepeatMs = 15 * 60 * 1000,
    onPromptRestart = null,
    disabledReason = null,
  }) {
    super();
    this.adapter = adapter;
    this.channel = channel;
    this.now = now;
    this.debounceMs = debounceMs;
    this.intervalMs = intervalMs;
    this.promptRepeatMs = promptRepeatMs;
    this.onPromptRestart = onPromptRestart;
    this.intervalHandle = null;
    this.lastCheckStartedAt = 0;
    this.lastPromptAt = null;
    this.status = createDefaultUpdateStatus({
      currentVersion,
      channel,
      phase: disabledReason ? "disabled" : "idle",
      errorMessage: disabledReason,
    });

    this.handleCheckingForUpdate = this.handleCheckingForUpdate.bind(this);
    this.handleUpdateAvailable = this.handleUpdateAvailable.bind(this);
    this.handleUpdateNotAvailable = this.handleUpdateNotAvailable.bind(this);
    this.handleDownloadProgress = this.handleDownloadProgress.bind(this);
    this.handleUpdateDownloaded = this.handleUpdateDownloaded.bind(this);
    this.handleError = this.handleError.bind(this);

    if (this.adapter) {
      this.adapter.on("checking-for-update", this.handleCheckingForUpdate);
      this.adapter.on("update-available", this.handleUpdateAvailable);
      this.adapter.on("update-not-available", this.handleUpdateNotAvailable);
      this.adapter.on("download-progress", this.handleDownloadProgress);
      this.adapter.on("update-downloaded", this.handleUpdateDownloaded);
      this.adapter.on("error", this.handleError);
    }
  }

  notify() {
    this.emit("status", this.getStatus());
  }

  getStatus() {
    return clone(this.status);
  }

  setStatus(update) {
    this.status = {
      ...this.status,
      ...update,
    };
    this.notify();
    return this.getStatus();
  }

  start() {
    if (this.status.phase === "disabled") {
      return this.getStatus();
    }
    if (!this.intervalHandle) {
      this.intervalHandle = setInterval(() => {
        void this.checkForUpdates({ reason: "interval" });
      }, this.intervalMs);
    }
    void this.checkForUpdates({ reason: "startup" });
    return this.getStatus();
  }

  stop() {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  dispose() {
    this.stop();

    if (!this.adapter) {
      return;
    }

    this.adapter.removeListener?.("checking-for-update", this.handleCheckingForUpdate);
    this.adapter.removeListener?.("update-available", this.handleUpdateAvailable);
    this.adapter.removeListener?.("update-not-available", this.handleUpdateNotAvailable);
    this.adapter.removeListener?.("download-progress", this.handleDownloadProgress);
    this.adapter.removeListener?.("update-downloaded", this.handleUpdateDownloaded);
    this.adapter.removeListener?.("error", this.handleError);
  }

  canCheck(reason) {
    if (this.status.phase === "disabled" || this.status.phase === "checking" || this.status.updateDownloaded) {
      return false;
    }

    const elapsed = this.now() - this.lastCheckStartedAt;
    if (reason !== "manual" && elapsed < this.debounceMs) {
      return false;
    }

    return true;
  }

  async checkForUpdates({ reason = "manual" } = {}) {
    if (!this.canCheck(reason)) {
      return this.getStatus();
    }

    this.lastCheckStartedAt = this.now();
    this.setStatus({
      phase: "checking",
      lastCheckReason: reason,
      lastCheckedAt: new Date(this.lastCheckStartedAt).toISOString(),
      errorMessage: null,
      progressPercent: null,
    });

    try {
      await this.adapter.checkForUpdates();
    } catch (error) {
      this.handleError(error);
    }

    return this.getStatus();
  }

  async handleFocus() {
    if (this.status.updateDownloaded) {
      await this.promptForRestartIfDue();
      return this.getStatus();
    }

    await this.checkForUpdates({ reason: "focus" });
    return this.getStatus();
  }

  async promptForRestartIfDue() {
    if (!this.status.updateDownloaded || !this.onPromptRestart) {
      return;
    }

    const now = this.now();
    if (typeof this.lastPromptAt === "number" && now - this.lastPromptAt < this.promptRepeatMs) {
      return;
    }

    this.lastPromptAt = now;
    await this.onPromptRestart(this.getStatus());
  }

  async restartToUpdate() {
    if (!this.status.updateDownloaded) {
      return false;
    }
    this.adapter.quitAndInstall();
    return true;
  }

  handleCheckingForUpdate() {
    this.setStatus({
      phase: "checking",
      errorMessage: null,
      progressPercent: null,
    });
  }

  handleUpdateAvailable(info) {
    this.setStatus({
      phase: "update-available",
      updateAvailable: true,
      availableVersion: typeof info?.version === "string" ? info.version : null,
      releaseDate: info?.releaseDate ? new Date(info.releaseDate).toISOString() : null,
      releaseNotes: normalizeReleaseNotes(info?.releaseNotes),
      errorMessage: null,
      progressPercent: 0,
    });
  }

  handleUpdateNotAvailable() {
    if (this.status.updateDownloaded) {
      return;
    }
    this.setStatus({
      phase: "idle",
      updateAvailable: false,
      availableVersion: null,
      downloadedVersion: null,
      releaseDate: null,
      releaseNotes: null,
      progressPercent: null,
      errorMessage: null,
    });
  }

  handleDownloadProgress(progress) {
    this.setStatus({
      phase: "update-available",
      progressPercent: typeof progress?.percent === "number" ? Math.round(progress.percent) : this.status.progressPercent,
      errorMessage: null,
    });
  }

  async handleUpdateDownloaded(info) {
    this.setStatus({
      phase: "update-downloaded",
      updateAvailable: true,
      updateDownloaded: true,
      downloadedVersion:
        typeof info?.version === "string"
          ? info.version
          : this.status.availableVersion,
      availableVersion:
        typeof info?.version === "string"
          ? info.version
          : this.status.availableVersion,
      releaseDate: info?.releaseDate ? new Date(info.releaseDate).toISOString() : this.status.releaseDate,
      releaseNotes: normalizeReleaseNotes(info?.releaseNotes) ?? this.status.releaseNotes,
      progressPercent: 100,
      errorMessage: null,
    });
    await this.promptForRestartIfDue();
  }

  handleError(error) {
    this.setStatus({
      phase: this.status.updateDownloaded ? "update-downloaded" : "error",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
  }
}

module.exports = {
  SurfaceOpsUpdaterController,
};
