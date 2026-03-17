import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

import { findSiblingInterfacectlRepoRoot } from "../../../scripts/lib/interfacectl-tooling.mjs";

export const DEFAULT_LOCAL_WORKBENCH_ENV = {
  SURFACEOPS_LOCAL_WORKBENCH: "1",
  SURFACEOPS_LOCAL_LLM_BASE_URL: "http://127.0.0.1:1234/v1",
  SURFACEOPS_LOCAL_LLM_MODEL: "openai/gpt-oss-20b",
};
export const DEFAULT_LOCAL_WORKBENCH_PORT = 3001;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(appRoot, "..", "..");

export function resolveLocalWorkbenchEnv(options = {}) {
  const cwd = path.resolve(options.cwd ?? repoRoot);
  const env = { ...process.env, ...(options.env ?? {}) };

  for (const [key, value] of Object.entries(DEFAULT_LOCAL_WORKBENCH_ENV)) {
    if (!env[key]?.trim()) {
      env[key] = value;
    }
  }

  if (!env.SURFACES_INTERFACECTL_ROOT?.trim()) {
    const interfacectlRoot = findSiblingInterfacectlRepoRoot({ cwd });
    if (interfacectlRoot) {
      env.SURFACES_INTERFACECTL_ROOT = interfacectlRoot;
    }
  }

  return env;
}

export function resolveLocalWorkbenchPort(options = {}) {
  const env = options.env ?? process.env;
  const candidate = options.port
    ?? env.SURFACEOPS_LOCAL_WORKBENCH_PORT
    ?? env.PORT;
  const parsed = Number.parseInt(String(candidate ?? ""), 10);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return DEFAULT_LOCAL_WORKBENCH_PORT;
}

export function startLocalWorkbenchDev(options = {}) {
  const env = resolveLocalWorkbenchEnv(options);
  const port = resolveLocalWorkbenchPort({ ...options, env });
  return spawn("pnpm", ["exec", "next", "dev", "--port", String(port), "--webpack"], {
    cwd: appRoot,
    env: {
      ...env,
      PORT: String(port),
    },
    stdio: "inherit",
    shell: process.platform === "win32",
  });
}

function isMain() {
  return process.argv[1] && path.resolve(process.argv[1]) === __filename;
}

if (isMain()) {
  const child = startLocalWorkbenchDev();

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 0);
  });

  child.on("error", (error) => {
    console.error(error);
    process.exit(1);
  });
}
