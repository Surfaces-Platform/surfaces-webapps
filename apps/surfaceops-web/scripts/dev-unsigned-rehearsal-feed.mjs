import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ensureUnsignedRehearsalManifestExists,
  resolveUnsignedRehearsalConfig,
  startUnsignedRehearsalStaticServer,
  waitForUnsignedRehearsalServer,
} from "../../../scripts/release/lib/surfaceops-desktop-unsigned-rehearsal.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(appRoot, "..", "..");

const unsignedRehearsalConfig = resolveUnsignedRehearsalConfig({ repoRoot });
await ensureUnsignedRehearsalManifestExists(unsignedRehearsalConfig);

const serverState = await startUnsignedRehearsalStaticServer({
  rootDir: unsignedRehearsalConfig.stageDir,
  host: unsignedRehearsalConfig.host,
  port: unsignedRehearsalConfig.port,
  allowPortInUse: true,
});

await waitForUnsignedRehearsalServer(unsignedRehearsalConfig.manifestUrl);

const child = spawn("pnpm", ["exec", "next", "dev", "--port", "3001", "--webpack"], {
  cwd: appRoot,
  env: {
    ...process.env,
    NEXT_TELEMETRY_DISABLED: process.env.NEXT_TELEMETRY_DISABLED ?? "1",
    SURFACEOPS_LOCAL_WORKBENCH: process.env.SURFACEOPS_LOCAL_WORKBENCH ?? "1",
    SURFACEOPS_DESKTOP_RELEASE_MANIFEST_URL: unsignedRehearsalConfig.manifestUrl,
  },
  stdio: "inherit",
  shell: process.platform === "win32",
});

console.log(
  `SurfaceOps unsigned rehearsal feed is using ${unsignedRehearsalConfig.manifestUrl}${serverState.reusedExisting ? " (reusing existing static server)" : ""}.`,
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
