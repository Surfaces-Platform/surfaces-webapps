const path = require("node:path");
const fs = require("node:fs");
const {
  DEFAULT_UPDATE_BASE_URL,
  DEFAULT_UPDATE_CHANNEL,
  UPDATE_CHANNELS,
} = require("@surfaces/surfaceops-desktop-bridge");

const DEFAULT_SURFACEOPS_DESKTOP_PORT = 3311;
const DEFAULT_SURFACEOPS_MODELD_PORT = 3312;
const DEFAULT_SURFACEOPS_MODEL_BACKEND_PORT = 3313;
const DEFAULT_WORKBENCH_PATH = "/contracts/governance";

function resolvePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return fallback;
}

function resolveSurfaceOpsDesktopConfig(options = {}) {
  const env = options.env ?? process.env;
  const appRoot = path.resolve(options.appRoot ?? path.resolve(__dirname, ".."));
  const repoRoot = path.resolve(options.repoRoot ?? path.resolve(appRoot, "..", ".."));
  const isPackaged = Boolean(options.isPackaged ?? false);
  const managedPort = resolvePositiveInteger(
    env.SURFACEOPS_DESKTOP_PORT ?? env.SURFACEOPS_LOCAL_WORKBENCH_PORT,
    DEFAULT_SURFACEOPS_DESKTOP_PORT,
  );
  const modeldPort = resolvePositiveInteger(
    env.SURFACEOPS_DESKTOP_MODELD_PORT,
    managedPort + 1,
  );
  const backendPort = resolvePositiveInteger(
    env.SURFACEOPS_DESKTOP_MODEL_BACKEND_PORT,
    modeldPort + 1,
  );
  const updateChannel = UPDATE_CHANNELS.includes(env.SURFACEOPS_UPDATE_CHANNEL)
    ? env.SURFACEOPS_UPDATE_CHANNEL
    : DEFAULT_UPDATE_CHANNEL;
  const updateBaseUrl = env.SURFACEOPS_UPDATE_BASE_URL?.trim() || DEFAULT_UPDATE_BASE_URL;
  const baseUrl = env.SURFACEOPS_DESKTOP_TARGET_URL?.trim() || `http://localhost:${managedPort}`;
  const workbenchPath = env.SURFACEOPS_DESKTOP_WORKBENCH_PATH?.trim() || DEFAULT_WORKBENCH_PATH;
  const bundledRuntimeRoot = path.resolve(
    options.bundledRuntimeRoot
      ?? env.SURFACEOPS_DESKTOP_RUNTIME_ROOT
      ?? path.join(appRoot, ".desktop-runtime", "surfaceops-web"),
  );
  const metadataPath = path.join(bundledRuntimeRoot, "metadata.json");
  let bundledServerPath = null;
  if (fs.existsSync(metadataPath)) {
    const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8"));
    if (typeof metadata.serverPath === "string" && metadata.serverPath.trim()) {
      bundledServerPath = path.resolve(bundledRuntimeRoot, metadata.serverPath);
    }
  }
  if (!bundledServerPath) {
    bundledServerPath = path.join(bundledRuntimeRoot, "standalone", "apps", "surfaceops-web", "server.js");
  }
  const bundledModelRuntimeRoot = path.resolve(
    options.bundledModelRuntimeRoot
      ?? env.SURFACEOPS_DESKTOP_MODEL_RUNTIME_ROOT
      ?? path.join(appRoot, ".desktop-runtime", "model-runtime"),
  );
  const bundledLlamaServerPath = path.resolve(
    options.bundledLlamaServerPath
      ?? env.SURFACEOPS_LLAMA_SERVER_BIN
      ?? path.join(bundledModelRuntimeRoot, "llama-server"),
  );
  const launchUrl = new URL(workbenchPath, baseUrl).toString();

  return {
    appRoot,
    repoRoot,
    isPackaged,
    baseUrl,
    launchUrl,
    updateBaseUrl,
    updateChannel,
    managedPort,
    modeldPort,
    modeldBaseUrl: `http://127.0.0.1:${modeldPort}/v1`,
    backendPort,
    bundledLlamaServerPath,
    workbenchPath,
    bundledRuntimeRoot,
    bundledServerPath,
    shouldSpawnManagedServer: !env.SURFACEOPS_DESKTOP_TARGET_URL?.trim(),
  };
}

function buildManagedServerCommand(config, options = {}) {
  const env = {
    ...process.env,
    ...(options.env ?? {}),
    NEXT_TELEMETRY_DISABLED: "1",
    SURFACEOPS_LOCAL_WORKBENCH: "1",
    SURFACEOPS_DESKTOP_RUNTIME: "1",
    SURFACEOPS_LOCAL_WORKBENCH_PORT: String(config.managedPort),
    SURFACEOPS_LOCAL_LLM_BASE_URL: config.modeldBaseUrl,
    SURFACEOPS_UPDATE_CHANNEL: config.updateChannel,
    SURFACEOPS_UPDATE_BASE_URL: config.updateBaseUrl,
  };

  if (config.isPackaged) {
    return {
      command: process.execPath,
      args: [config.bundledServerPath],
      cwd: path.dirname(config.bundledServerPath),
      env: {
        ...env,
        ELECTRON_RUN_AS_NODE: "1",
        PORT: String(config.managedPort),
        HOSTNAME: "127.0.0.1",
      },
    };
  }

  return {
    command: "pnpm",
    args: ["run", "dev:local-workbench"],
    cwd: path.join(config.repoRoot, "apps", "surfaceops-web"),
    env,
  };
}

module.exports = {
  DEFAULT_SURFACEOPS_DESKTOP_PORT,
  DEFAULT_SURFACEOPS_MODELD_PORT,
  DEFAULT_SURFACEOPS_MODEL_BACKEND_PORT,
  DEFAULT_WORKBENCH_PATH,
  resolveSurfaceOpsDesktopConfig,
  buildManagedServerCommand,
};
