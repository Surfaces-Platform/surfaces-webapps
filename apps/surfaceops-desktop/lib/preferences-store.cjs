const fs = require("node:fs");
const path = require("node:path");
const {
  DEFAULT_UPDATE_CHANNEL,
  UPDATE_CHANNELS,
} = require("@surfaces/surfaceops-desktop-bridge");

function isValidUpdateChannel(value) {
  return UPDATE_CHANNELS.includes(value);
}

function createSurfaceOpsDesktopPreferencesStore({
  filePath,
  defaultUpdateChannel = DEFAULT_UPDATE_CHANNEL,
} = {}) {
  const preferencesPath = path.resolve(filePath ?? "surfaceops-desktop-preferences.json");

  function readRawPreferences() {
    try {
      const raw = fs.readFileSync(preferencesPath, "utf8");
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  function getPreferences() {
    const rawPreferences = readRawPreferences();
    return {
      updateChannel: isValidUpdateChannel(rawPreferences.updateChannel)
        ? rawPreferences.updateChannel
        : defaultUpdateChannel,
    };
  }

  function getUpdateChannel() {
    return getPreferences().updateChannel;
  }

  function setUpdateChannel(updateChannel) {
    if (!isValidUpdateChannel(updateChannel)) {
      throw new Error(`Unsupported SurfaceOps update channel: ${updateChannel}`);
    }

    const rawPreferences = readRawPreferences();
    const nextPreferences = {
      ...rawPreferences,
      updateChannel,
      updatedAt: new Date().toISOString(),
    };

    fs.mkdirSync(path.dirname(preferencesPath), { recursive: true });
    fs.writeFileSync(preferencesPath, JSON.stringify(nextPreferences, null, 2), "utf8");

    return {
      updateChannel: nextPreferences.updateChannel,
    };
  }

  return {
    filePath: preferencesPath,
    getPreferences,
    getUpdateChannel,
    setUpdateChannel,
  };
}

module.exports = {
  createSurfaceOpsDesktopPreferencesStore,
};
