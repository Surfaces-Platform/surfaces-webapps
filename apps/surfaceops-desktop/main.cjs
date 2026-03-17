const path = require("node:path");
const { spawn } = require("node:child_process");
const { setTimeout: wait } = require("node:timers/promises");
const { app, BrowserWindow, Menu, dialog, ipcMain, shell } = require("electron");
const {
  createDisabledUpdaterAdapter,
  createElectronUpdaterAdapter,
} = require("./lib/updater-adapter.cjs");
const {
  createSurfaceOpsDesktopPreferencesStore,
} = require("./lib/preferences-store.cjs");
const {
  buildManagedServerCommand,
  resolveSurfaceOpsDesktopConfig,
} = require("./lib/runtime-config.cjs");
const {
  buildSurfaceOpsMenuTemplate,
} = require("./lib/menu-template.cjs");
const {
  SurfaceOpsUpdaterController,
} = require("./lib/updater-controller.cjs");

let mainWindow = null;
let managedServer = null;
let desktopConfig = null;
let updaterController = null;
let preferencesStore = null;

function stopManagedServer() {
  if (!managedServer || managedServer.killed) {
    return;
  }

  managedServer.kill("SIGTERM");
  managedServer = null;
}

function startManagedServer(config) {
  if (managedServer && !managedServer.killed) {
    return managedServer;
  }

  const command = buildManagedServerCommand(config);
  managedServer = spawn(command.command, command.args, {
    cwd: command.cwd,
    env: command.env,
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  managedServer.on("exit", () => {
    managedServer = null;
  });

  return managedServer;
}

function sendUpdateStatus() {
  if (!mainWindow || mainWindow.isDestroyed() || !updaterController) {
    return;
  }
  mainWindow.webContents.send("surfaceops-desktop:update-status-changed", updaterController.getStatus());
}

function getCurrentUpdateChannel() {
  if (preferencesStore) {
    return preferencesStore.getUpdateChannel();
  }

  return desktopConfig?.updateChannel ?? "alpha";
}

function openWorkbench() {
  if (!mainWindow || mainWindow.isDestroyed() || !desktopConfig) {
    return;
  }
  void mainWindow.loadURL(desktopConfig.launchUrl);
}

function rebuildMenu() {
  if (!updaterController) {
    return;
  }

  const status = updaterController.getStatus();
  const template = buildSurfaceOpsMenuTemplate({
    status,
    onOpenWorkbench: openWorkbench,
    onCheckForUpdates: () => {
      void updaterController.checkForUpdates({ reason: "manual" });
    },
    onSetUpdateChannel: (channel) => {
      void setUpdateChannel(channel);
    },
    onRestartToUpdate: () => {
      void updaterController.restartToUpdate();
    },
  });

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

async function promptForRestart(status) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  const result = await dialog.showMessageBox(mainWindow, {
    type: "info",
    buttons: ["Restart and Install", "Later"],
    defaultId: 0,
    cancelId: 1,
    title: "SurfaceOps update ready",
    message: `SurfaceOps ${status.downloadedVersion ?? "update"} is ready to install.`,
    detail: "Restart now to apply the downloaded update, or keep working and install it later.",
  });

  if (result.response === 0) {
    await updaterController.restartToUpdate();
  }
}

function configureUpdater(config) {
  if (updaterController) {
    updaterController.dispose();
    updaterController.removeAllListeners();
    updaterController = null;
  }

  const resolvedChannel = getCurrentUpdateChannel();
  const updatesEnabled = app.isPackaged || process.env.SURFACEOPS_ENABLE_DEV_UPDATES === "1";
  const adapter = updatesEnabled
    ? createElectronUpdaterAdapter({
        baseUrl: config.updateBaseUrl,
        channel: resolvedChannel,
        platform: "darwin-arm64",
        forceDevUpdateConfig: !app.isPackaged && process.env.SURFACEOPS_ENABLE_DEV_UPDATES === "1",
      })
    : createDisabledUpdaterAdapter("Updates are only active in packaged builds unless SURFACEOPS_ENABLE_DEV_UPDATES=1.");

  updaterController = new SurfaceOpsUpdaterController({
    adapter,
    channel: resolvedChannel,
    currentVersion: app.getVersion(),
    onPromptRestart: promptForRestart,
    disabledReason: updatesEnabled ? null : adapter.disabledReason,
  });

  updaterController.on("status", () => {
    sendUpdateStatus();
    rebuildMenu();
  });
  rebuildMenu();
  updaterController.start();
  sendUpdateStatus();
}

async function setUpdateChannel(nextChannel) {
  if (!preferencesStore) {
    throw new Error("SurfaceOps desktop preferences are not available.");
  }

  preferencesStore.setUpdateChannel(nextChannel);
  configureUpdater(desktopConfig);
  return updaterController.getStatus();
}

function installDesktopIpcHandlers() {
  ipcMain.handle("surfaceops-desktop:get-update-status", () => {
    return updaterController ? updaterController.getStatus() : null;
  });
  ipcMain.handle("surfaceops-desktop:check-for-updates", async () => {
    if (!updaterController) {
      return null;
    }
    return updaterController.checkForUpdates({ reason: "manual" });
  });
  ipcMain.handle("surfaceops-desktop:restart-to-update", async () => {
    if (!updaterController) {
      return false;
    }
    return updaterController.restartToUpdate();
  });
  ipcMain.handle("surfaceops-desktop:set-update-channel", async (_event, nextChannel) => {
    return setUpdateChannel(nextChannel);
  });
}

async function waitForServer(url, timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.status < 500) {
        return;
      }
    } catch {
      // server still starting
    }

    await wait(500);
  }

  throw new Error(`Timed out waiting for SurfaceOps workbench: ${url}`);
}

function createErrorWindow(error) {
  const detail = error instanceof Error ? error.message : String(error);
  const errorWindow = new BrowserWindow({
    width: 920,
    height: 640,
    backgroundColor: "#f8fafc",
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.cjs"),
    },
  });

  const html = `
    <html>
      <body style="font-family: Inter, sans-serif; background: #f8fafc; color: #0f172a; padding: 40px;">
        <div style="max-width: 720px; margin: 0 auto;">
          <div style="font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: #475569; margin-bottom: 12px;">
            SurfaceOps Desktop Alpha
          </div>
          <h1 style="font-size: 32px; line-height: 1.1; margin: 0 0 16px;">Workbench startup failed</h1>
          <p style="font-size: 16px; line-height: 1.7; color: #334155; margin: 0 0 20px;">
            The Electron shell could not start the local SurfaceOps workbench.
          </p>
          <pre style="white-space: pre-wrap; padding: 18px; border-radius: 14px; border: 1px solid #cbd5e1; background: #ffffff;">${detail}</pre>
        </div>
      </body>
    </html>
  `;

  errorWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
}

async function createMainWindow() {
  const config = desktopConfig;

  if (config.shouldSpawnManagedServer) {
    startManagedServer(config);
  }

  try {
    await waitForServer(config.launchUrl);
  } catch (error) {
    createErrorWindow(error);
    return;
  }

  mainWindow = new BrowserWindow({
    width: 1520,
    height: 980,
    minWidth: 1200,
    minHeight: 800,
    title: "SurfaceOps Desktop Alpha",
    backgroundColor: "#f8fafc",
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.cjs"),
    },
  });

  const baseUrl = new URL(config.baseUrl);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    const target = new URL(url);
    if (target.origin !== baseUrl.origin) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    const target = new URL(url);
    if (target.origin !== baseUrl.origin) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  await mainWindow.loadURL(config.launchUrl);
  sendUpdateStatus();

  mainWindow.on("focus", () => {
    if (!updaterController) {
      return;
    }
    void updaterController.handleFocus();
  });
}

app.whenReady().then(async () => {
  desktopConfig = resolveSurfaceOpsDesktopConfig({
    isPackaged: app.isPackaged,
    bundledRuntimeRoot: app.isPackaged
      ? path.join(process.resourcesPath, "surfaceops-web-runtime")
      : undefined,
  });
  preferencesStore = createSurfaceOpsDesktopPreferencesStore({
    filePath: path.join(app.getPath("userData"), "surfaceops-desktop-preferences.json"),
    defaultUpdateChannel: desktopConfig.updateChannel,
  });
  configureUpdater(desktopConfig);
  installDesktopIpcHandlers();
  await createMainWindow();

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createMainWindow();
    }
  });
});

app.on("before-quit", () => {
  if (updaterController) {
    updaterController.dispose();
  }
  stopManagedServer();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
