const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("surfaceopsDesktop", {
  platform: process.platform,
  channel: process.env.SURFACEOPS_UPDATE_CHANNEL || "alpha",
  isDesktopRuntime: true,
  updates: {
    getStatus: () => ipcRenderer.invoke("surfaceops-desktop:get-update-status"),
    checkForUpdates: () => ipcRenderer.invoke("surfaceops-desktop:check-for-updates"),
    restartToUpdate: () => ipcRenderer.invoke("surfaceops-desktop:restart-to-update"),
    setChannel: (channel) => ipcRenderer.invoke("surfaceops-desktop:set-update-channel", channel),
    onStatusChange: (listener) => {
      const wrapped = (_event, status) => listener(status);
      ipcRenderer.on("surfaceops-desktop:update-status-changed", wrapped);
      return () => {
        ipcRenderer.removeListener("surfaceops-desktop:update-status-changed", wrapped);
      };
    },
  },
  models: {
    getState: () => ipcRenderer.invoke("surfaceops-desktop:get-model-state"),
    getCatalog: () => ipcRenderer.invoke("surfaceops-desktop:get-model-catalog"),
    install: (modelId) => ipcRenderer.invoke("surfaceops-desktop:install-model", modelId),
    cancelInstall: () => ipcRenderer.invoke("surfaceops-desktop:cancel-model-install"),
    replaceModel: (modelId) => ipcRenderer.invoke("surfaceops-desktop:replace-model", modelId),
    runBenchmark: () => ipcRenderer.invoke("surfaceops-desktop:run-model-benchmark"),
    exportBenchmark: () => ipcRenderer.invoke("surfaceops-desktop:export-model-benchmark"),
    onStateChange: (listener) => {
      const wrapped = (_event, state) => listener(state);
      ipcRenderer.on("surfaceops-desktop:model-state-changed", wrapped);
      return () => {
        ipcRenderer.removeListener("surfaceops-desktop:model-state-changed", wrapped);
      };
    },
  },
});
