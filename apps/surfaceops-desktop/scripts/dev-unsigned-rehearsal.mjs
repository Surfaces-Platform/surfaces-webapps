import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { ensureElectronInstalled } from "./ensure-electron.mjs";
import {
  ensureUnsignedRehearsalManifestExists,
  resolveUnsignedRehearsalConfig,
  startUnsignedRehearsalStaticServer,
  waitForUnsignedRehearsalServer,
} from "../../../scripts/release/lib/surfaceops-desktop-unsigned-rehearsal.mjs";

const require = createRequire(import.meta.url);
const { DEFAULT_SURFACEOPS_DESKTOP_PORT } = require("../lib/runtime-config.cjs");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(appRoot, "..", "..");

ensureElectronInstalled();

const unsignedRehearsalConfig = resolveUnsignedRehearsalConfig({ repoRoot });
await ensureUnsignedRehearsalManifestExists(unsignedRehearsalConfig);

const serverState = await startUnsignedRehearsalStaticServer({
  rootDir: unsignedRehearsalConfig.stageDir,
  host: unsignedRehearsalConfig.host,
  port: unsignedRehearsalConfig.port,
  allowPortInUse: true,
});

await waitForUnsignedRehearsalServer(unsignedRehearsalConfig.manifestUrl);

const desktopPort = String(
  process.env.SURFACEOPS_DESKTOP_PORT
    ?? process.env.SURFACEOPS_LOCAL_WORKBENCH_PORT
    ?? DEFAULT_SURFACEOPS_DESKTOP_PORT,
);
const child = spawn("pnpm", ["exec", "electron", "."], {
  cwd: appRoot,
  env: {
    ...process.env,
    NEXT_TELEMETRY_DISABLED: process.env.NEXT_TELEMETRY_DISABLED ?? "1",
    SURFACEOPS_ENABLE_DEV_UPDATES: process.env.SURFACEOPS_ENABLE_DEV_UPDATES ?? "1",
    SURFACEOPS_UPDATE_CHANNEL: process.env.SURFACEOPS_UPDATE_CHANNEL ?? "alpha",
    SURFACEOPS_UPDATE_BASE_URL:
      process.env.SURFACEOPS_UPDATE_BASE_URL
      ?? `http://127.0.0.1:${desktopPort}/api/desktop/updates`,
    SURFACEOPS_DESKTOP_RELEASE_MANIFEST_URL: unsignedRehearsalConfig.manifestUrl,
  },
  stdio: "inherit",
  shell: process.platform === "win32",
});

console.log(
  `SurfaceOps desktop unsigned rehearsal is using ${unsignedRehearsalConfig.manifestUrl}${serverState.reusedExisting ? " (reusing existing static server)" : ""}.`,
);

const shutdown = () => {
  child.kill("SIGTERM");
  if (serverState.server) {
    serverState.server.close();
  }
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

child.on("exit", (code, signal) => {
  if (serverState.server) {
    serverState.server.close();
  }

  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});

child.on("error", (error) => {
  if (serverState.server) {
    serverState.server.close();
  }
  console.error(error);
  process.exit(1);
});
