import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

export function resolveElectronPaths() {
  const electronPackagePath = require.resolve("electron/package.json");
  const electronRoot = path.dirname(electronPackagePath);

  return {
    electronRoot,
    installScriptPath: path.join(electronRoot, "install.js"),
    binaryMarkerPath: path.join(electronRoot, "dist", "version"),
  };
}

export function ensureElectronInstalled() {
  const paths = resolveElectronPaths();
  if (fs.existsSync(paths.binaryMarkerPath)) {
    return;
  }

  const result = spawnSync(process.execPath, [paths.installScriptPath], {
    stdio: "inherit",
    env: process.env,
  });

  if (result.status !== 0) {
    throw new Error(`Electron install script failed with status ${result.status ?? "unknown"}.`);
  }
}

if (import.meta.url === new URL(process.argv[1], "file:").href) {
  ensureElectronInstalled();
}
