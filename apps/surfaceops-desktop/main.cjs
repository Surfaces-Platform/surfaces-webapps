const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { setTimeout: wait } = require("node:timers/promises");
const { app, BrowserWindow, Menu, dialog, ipcMain, shell } = require("electron");
const {
  createDisabledUpdaterAdapter,
  createElectronUpdaterAdapter,
  createHttpSmokeUpdaterAdapter,
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
const {
  createSurfaceOpsModeldController,
} = require("./lib/modeld-controller.cjs");
const {
  createSurfaceOpsModelController,
} = require("./lib/model-controller.cjs");

let mainWindow = null;
let managedServer = null;
let desktopConfig = null;
let updaterController = null;
let preferencesStore = null;
let modelController = null;
let modeldController = null;

function resolveCurrentAppVersion() {
  return process.env.SURFACEOPS_DESKTOP_TEST_APP_VERSION?.trim() || app.getVersion();
}

function isDesktopSmokeRun() {
  return Boolean(process.env.SURFACEOPS_DESKTOP_SMOKE_CONFIG_PATH?.trim());
}

const userDataOverride = process.env.SURFACEOPS_DESKTOP_USER_DATA_DIR?.trim();
if (userDataOverride) {
  app.setPath("userData", path.resolve(userDataOverride));
}

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

  const command = buildManagedServerCommand(config, {
    env: {
      SURFACEOPS_DESKTOP_PREFERENCES_PATH: preferencesStore?.filePath,
      SURFACEOPS_LOCAL_LLM_MODEL: modelController?.getState().activeModelId ?? "",
    },
  });
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

function sendModelState() {
  if (!mainWindow || mainWindow.isDestroyed() || !modelController) {
    return;
  }
  mainWindow.webContents.send("surfaceops-desktop:model-state-changed", modelController.getState());
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
  if (isDesktopSmokeRun()) {
    return;
  }

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
  const smokeUpdaterStatusUrl = process.env.SURFACEOPS_DESKTOP_TEST_UPDATE_MOCK_URL?.trim();
  const adapter = smokeUpdaterStatusUrl
    ? createHttpSmokeUpdaterAdapter({ statusUrl: smokeUpdaterStatusUrl })
    : updatesEnabled
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
    currentVersion: resolveCurrentAppVersion(),
    onPromptRestart: smokeUpdaterStatusUrl ? null : promptForRestart,
    disabledReason: smokeUpdaterStatusUrl || updatesEnabled ? null : adapter.disabledReason,
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
  ipcMain.handle("surfaceops-desktop:get-model-state", () => {
    return modelController ? modelController.getState() : null;
  });
  ipcMain.handle("surfaceops-desktop:get-model-catalog", () => {
    return modelController ? modelController.getCatalog() : null;
  });
  ipcMain.handle("surfaceops-desktop:install-model", async (_event, modelId) => {
    if (!modelController) {
      throw new Error("SurfaceOps model controller is not available.");
    }
    return modelController.install(modelId);
  });
  ipcMain.handle("surfaceops-desktop:cancel-model-install", async () => {
    if (!modelController) {
      throw new Error("SurfaceOps model controller is not available.");
    }
    return modelController.cancelInstall();
  });
  ipcMain.handle("surfaceops-desktop:replace-model", async (_event, modelId) => {
    if (!modelController) {
      throw new Error("SurfaceOps model controller is not available.");
    }
    return modelController.replaceModel(modelId);
  });
  ipcMain.handle("surfaceops-desktop:run-model-benchmark", async () => {
    if (!modelController) {
      throw new Error("SurfaceOps model controller is not available.");
    }
    return modelController.runBenchmark();
  });
  ipcMain.handle("surfaceops-desktop:export-model-benchmark", async () => {
    if (!modelController) {
      throw new Error("SurfaceOps model controller is not available.");
    }
    return modelController.exportBenchmark();
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

function readDesktopSmokeConfig() {
  const configPath = process.env.SURFACEOPS_DESKTOP_SMOKE_CONFIG_PATH?.trim();
  if (!configPath) {
    return null;
  }

  const resolvedPath = path.resolve(configPath);
  return JSON.parse(fs.readFileSync(resolvedPath, "utf8"));
}

async function writeDesktopSmokeResult(payload) {
  const resultPath = process.env.SURFACEOPS_DESKTOP_SMOKE_RESULT_PATH?.trim();
  if (!resultPath) {
    return;
  }

  const resolvedPath = path.resolve(resultPath);
  await fs.promises.mkdir(path.dirname(resolvedPath), { recursive: true });
  await fs.promises.writeFile(resolvedPath, JSON.stringify(payload, null, 2), "utf8");
}

async function waitForUpdaterStatus({
  predicate,
  timeoutMs = 120_000,
  description = "updater status",
} = {}) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const status = updaterController?.getStatus();
    if (status && predicate(status)) {
      return status;
    }
    await wait(250);
  }

  throw new Error(`Timed out waiting for ${description}.`);
}

async function waitForMainWindowPath(expectedPath, timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const currentUrl = mainWindow && !mainWindow.isDestroyed()
      ? mainWindow.webContents.getURL()
      : null;
    if (currentUrl) {
      try {
        const parsed = new URL(currentUrl);
        if (parsed.pathname === expectedPath) {
          return currentUrl;
        }
      } catch {
        // continue polling
      }
    }
    await wait(250);
  }

  throw new Error(`Timed out waiting for SurfaceOps desktop window to reach ${expectedPath}.`);
}

async function maybeRunDesktopSmokeScenario() {
  const config = readDesktopSmokeConfig();
  if (!config) {
    return;
  }

  const result = {
    ok: false,
    startedAt: new Date().toISOString(),
    resultLabel: config.resultLabel ?? null,
    currentVersion: resolveCurrentAppVersion(),
    initialUrl: null,
    finalUrl: null,
    installModelId: config.installModelId ?? null,
    replaceModelId: config.replaceModelId ?? null,
    benchmark: null,
    updateStatus: null,
    updateRestartRequested: false,
    finalState: null,
    errorMessage: null,
  };

  try {
    const expectedCurrentVersion = config.expectedCurrentVersion ?? config.expectedVersionAfterRestart ?? null;
    if (expectedCurrentVersion && resolveCurrentAppVersion() !== expectedCurrentVersion) {
      throw new Error(
        `Expected SurfaceOps version ${expectedCurrentVersion}, found ${resolveCurrentAppVersion()}.`,
      );
    }

    result.initialUrl = await waitForMainWindowPath(
      config.expectedInitialPath ?? desktopConfig.workbenchPath,
      config.timeoutMs ?? 120_000,
    );

    if (config.installModelId) {
      await modelController.install(config.installModelId);
      openWorkbench();
      result.finalUrl = await waitForMainWindowPath(
        config.expectedWorkbenchPath ?? desktopConfig.workbenchPath,
        config.timeoutMs ?? 120_000,
      );
    }

    if (config.runBenchmark) {
      result.benchmark = await modelController.runBenchmark();
    }

    if (config.replaceModelId) {
      await modelController.replaceModel(config.replaceModelId);
    }

    if (config.checkForUpdates) {
      if (!updaterController) {
        throw new Error("SurfaceOps updater controller is not available.");
      }

      await updaterController.checkForUpdates({ reason: "manual" });
      if (config.waitForDownloadedVersion) {
        result.updateStatus = await waitForUpdaterStatus({
          predicate: (status) =>
            status.updateDownloaded && status.downloadedVersion === config.waitForDownloadedVersion,
          timeoutMs: config.timeoutMs ?? 120_000,
          description: `downloaded update ${config.waitForDownloadedVersion}`,
        });
      } else {
        result.updateStatus = updaterController.getStatus();
      }
    }

    if (config.expectedFinalPath) {
      openWorkbench();
      result.finalUrl = await waitForMainWindowPath(config.expectedFinalPath, config.timeoutMs ?? 120_000);
    } else if (!result.finalUrl && mainWindow && !mainWindow.isDestroyed()) {
      result.finalUrl = mainWindow.webContents.getURL();
    }

    if (config.restartToUpdate) {
      result.updateStatus = updaterController ? updaterController.getStatus() : result.updateStatus;
      result.updateRestartRequested = true;
      await writeDesktopSmokeResult({
        ...result,
        checkpoint: "before-restart",
        completedAt: new Date().toISOString(),
      });
      if (!updaterController) {
        throw new Error("SurfaceOps updater controller is not available.");
      }
      await updaterController.restartToUpdate();
    }

    result.finalState = modelController.getState();
    result.updateStatus = updaterController ? updaterController.getStatus() : result.updateStatus;
    result.currentVersion = resolveCurrentAppVersion();
    result.ok = true;
  } catch (error) {
    result.errorMessage = error instanceof Error ? error.message : String(error);
  } finally {
    result.completedAt = new Date().toISOString();
    await writeDesktopSmokeResult(result);
    if (config.exitWhenDone !== false) {
      stopManagedServer();
      await modeldController?.stop().catch(() => {});
      app.exit(result.ok ? 0 : 1);
    }
  }
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
  sendModelState();

  mainWindow.on("focus", () => {
    if (!updaterController) {
      return;
    }
    void updaterController.handleFocus();
  });
}

function resolveBundledLlamaServerPath(config) {
  const candidates = app.isPackaged
    ? [
        path.join(process.resourcesPath, "model-runtime", "llama-server"),
        config.bundledLlamaServerPath,
      ]
    : [
        process.env.SURFACEOPS_LLAMA_SERVER_BIN?.trim(),
        config.bundledLlamaServerPath,
      ].filter(Boolean);

  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

function buildSurfaceOpsBackendCommand(config, { modelPath }) {
  const binaryPath = resolveBundledLlamaServerPath(config);
  if (!binaryPath) {
    return null;
  }

  return {
    command: binaryPath,
    args: [
      "--host",
      "127.0.0.1",
      "--port",
      String(config.backendPort),
      "-m",
      modelPath,
      "-c",
      "8192",
    ],
    cwd: path.dirname(binaryPath),
    env: {
      ...process.env,
    },
  };
}

app.whenReady().then(async () => {
  desktopConfig = resolveSurfaceOpsDesktopConfig({
    isPackaged: app.isPackaged,
    bundledRuntimeRoot: app.isPackaged
      ? path.join(process.resourcesPath, "surfaceops-web-runtime")
      : undefined,
    bundledModelRuntimeRoot: app.isPackaged
      ? path.join(process.resourcesPath, "model-runtime")
      : undefined,
  });
  const userDataRoot = app.getPath("userData");
  preferencesStore = createSurfaceOpsDesktopPreferencesStore({
    filePath: path.join(userDataRoot, "surfaceops-desktop-preferences.json"),
    defaultUpdateChannel: desktopConfig.updateChannel,
  });
  modeldController = createSurfaceOpsModeldController({
    port: desktopConfig.modeldPort,
    backendPort: desktopConfig.backendPort,
    getTargetBaseUrl: () => process.env.SURFACEOPS_MODEL_BACKEND_TARGET_URL?.trim() || "",
    buildBackendCommand: ({ modelPath }) => buildSurfaceOpsBackendCommand(desktopConfig, { modelPath }),
  });
  modelController = createSurfaceOpsModelController({
    preferencesStore,
    modeldController,
    modelStorageRoot: path.join(userDataRoot, "models"),
    benchmarkRoot: path.join(userDataRoot, "benchmarks"),
    exportRoot: path.join(userDataRoot, "exports"),
    env: process.env,
    showSaveDialog: (options) => dialog.showSaveDialog(mainWindow ?? undefined, options),
  });
  modelController.onStateChange(() => {
    sendModelState();
  });
  await modelController.initialize();
  configureUpdater(desktopConfig);
  installDesktopIpcHandlers();
  await createMainWindow();
  void maybeRunDesktopSmokeScenario();

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
  void modeldController?.stop();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
