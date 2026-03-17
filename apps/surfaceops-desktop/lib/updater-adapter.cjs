const { EventEmitter } = require("node:events");
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

module.exports = {
  createDisabledUpdaterAdapter,
  createElectronUpdaterAdapter,
};
