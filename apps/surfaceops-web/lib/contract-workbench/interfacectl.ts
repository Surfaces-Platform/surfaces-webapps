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

export interface InterfacectlResult {
  stdout: string;
  stderr: string;
}

export async function runInterfacectlCli(
  args: string[],
  options: {
    cwd: string;
    env?: NodeJS.ProcessEnv;
  },
): Promise<InterfacectlResult> {
  const env = {
    ...process.env,
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
      if (code !== 0) {
        reject(
          new Error(
            [
              `interfacectl exited with code ${code}.`,
              stderr.trim(),
              stdout.trim(),
            ].filter(Boolean).join("\n"),
          ),
        );
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}
