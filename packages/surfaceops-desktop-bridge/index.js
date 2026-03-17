const UPDATE_CHANNELS = Object.freeze(["alpha", "stable"]);
const UPDATE_PHASES = Object.freeze([
  "idle",
  "checking",
  "update-available",
  "update-downloaded",
  "error",
  "disabled",
]);
const UPDATE_CHECK_REASONS = Object.freeze(["startup", "focus", "interval", "manual"]);
const DEFAULT_UPDATE_CHANNEL = "alpha";
const DEFAULT_UPDATE_BASE_URL = "https://surfaceops.ai/api/desktop/updates";

function createDefaultUpdateStatus(overrides = {}) {
  return {
    currentVersion: "0.1.0",
    channel: DEFAULT_UPDATE_CHANNEL,
    phase: "idle",
    lastCheckedAt: null,
    lastCheckReason: null,
    availableVersion: null,
    downloadedVersion: null,
    releaseDate: null,
    releaseNotes: null,
    progressPercent: null,
    errorMessage: null,
    updateAvailable: false,
    updateDownloaded: false,
    ...overrides,
  };
}

module.exports = {
  UPDATE_CHANNELS,
  UPDATE_PHASES,
  UPDATE_CHECK_REASONS,
  DEFAULT_UPDATE_CHANNEL,
  DEFAULT_UPDATE_BASE_URL,
  createDefaultUpdateStatus,
};
