import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

function resolveRepoRoot(start = process.cwd()): string {
  let current = path.resolve(start);
  while (true) {
    if (fs.existsSync(path.join(current, "pnpm-workspace.yaml"))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      throw new Error("Could not resolve the Surfaces workspace root.");
    }
    current = parent;
  }
}

function resolveResolverScript(): string {
  return path.join(resolveRepoRoot(), "scripts", "interfacectl-tool.mjs");
}

function defaultInterfacectlRoot(): string | null {
  const repoRoot = resolveRepoRoot();
  const repoParent = path.dirname(repoRoot);
  const workspaceParent = path.dirname(repoParent);
  const candidates = [
    path.join(repoParent, "interfacectl"),
    path.join(workspaceParent, "interfacectl"),
    path.join(repoParent, "interfacectl-main"),
    path.join(workspaceParent, ".worktrees", "interfacectl-main"),
  ];

  for (const candidate of candidates) {
    if (
      fs.existsSync(path.join(candidate, "packages", "interfacectl-cli", "dist", "index.js")) &&
      fs.existsSync(path.join(candidate, "packages", "interfacectl-validator", "package.json"))
    ) {
      return candidate;
    }
  }
  return null;
}

export interface InterfacectlResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export async function runInterfacectlCli(
  args: string[],
  options: {
    cwd: string;
    env?: NodeJS.ProcessEnv;
    acceptExitCodes?: number[];
  },
): Promise<InterfacectlResult> {
  const detectedRoot = process.env.SURFACES_INTERFACECTL_ROOT ? null : defaultInterfacectlRoot();
  const env = {
    ...process.env,
    ...(process.env.SURFACES_INTERFACECTL_ROOT
      ? {}
      : detectedRoot
        ? { SURFACES_INTERFACECTL_ROOT: detectedRoot }
        : {}),
    ...options.env,
  };
  const resolver = resolveResolverScript();
  return new Promise<InterfacectlResult>((resolve, reject) => {
    const child = spawn(process.execPath, [resolver, "run", "cli", ...args], {
      cwd: options.cwd,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      const exitCode = typeof code === "number" ? code : 1;
      const acceptedExitCodes = new Set([0, ...(options.acceptExitCodes ?? [])]);
      if (!acceptedExitCodes.has(exitCode)) {
        reject(
          new Error(
            [
              `interfacectl exited with code ${exitCode}.`,
              stderr.trim(),
              stdout.trim(),
            ].filter(Boolean).join("\n"),
          ),
        );
        return;
      }
      resolve({ exitCode, stdout, stderr });
    });
  });
}

export function resolveWorkspaceRoot(start = process.cwd()): string {
  return resolveRepoRoot(start);
}
