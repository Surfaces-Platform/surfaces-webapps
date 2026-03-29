import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

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
  ].map((candidate) => path.resolve(candidate));

  for (const candidate of [...new Set(candidates)]) {
    if (
      fs.existsSync(path.join(candidate, "packages", "interfacectl-cli", "dist", "index.js")) &&
      fs.existsSync(path.join(candidate, "packages", "interfacectl-validator", "package.json"))
    ) {
      return candidate;
    }
  }
  return null;
}

export type InterfacectlUiAstChangeAction = "set" | "add";

export interface InterfacectlUiAstChange {
  path: string;
  action: InterfacectlUiAstChangeAction;
  value: string | number;
  summary: string;
}

export interface InterfacectlUiAstLifecycleRecord {
  stage: string;
  validation: { status: string };
  approval: { status: string; requiredRoles: string[] };
  publication: { status: string };
  observation: { status: string; lastVerdict?: string };
}

export interface InterfacectlUiAstReviewArtifact {
  review: {
    status: string;
    requiresHumanReview: boolean;
  };
  summary: {
    changeCount: number;
    nodeChangeCount: number;
    governanceChangeCount: number;
    platformChangeCount: number;
  };
}

export interface InterfacectlUiAstIntegrationEvidence {
  consumer: string;
  platform: string;
  integratedAt: string;
  compatibilityChecks: Array<{
    code: string;
    status: string;
    message: string;
  }>;
  exceptions: Array<{
    code: string;
    approvedBy: string;
    note?: string;
  }>;
}

export interface InterfacectlUiAstPromotionRecord {
  promotionId: string;
  promotedAt: string;
  lifecycleStage: string;
  artifacts: {
    astPath: string;
    bundleRoot: string;
    generationPayloadPath: string;
    runtimePayloadPath: string;
    integrationEvidencePath?: string;
  };
}

export interface InterfacectlUiAstTools {
  applyUiAstChange: (ast: unknown, change: InterfacectlUiAstChange) => unknown;
  buildUiAstIntegrationEvidence: (options: unknown) => unknown;
  buildUiAstLifecycleRecord: (ast: unknown, options?: unknown) => unknown;
  buildUiAstPromotionRecord: (options: unknown) => unknown;
  buildUiAstReviewArtifact: (before: unknown, after: unknown, surfaceId?: string) => unknown;
  deriveLegacyContractFromUiAst: (ast: unknown) => unknown;
  migrateLegacyContractToUiAst: (contract: unknown) => unknown;
  normalizeUiAst: (ast: unknown) => unknown;
  summarizeUiAst: (ast: unknown) => unknown;
}

let cachedUiAstTools: Promise<InterfacectlUiAstTools> | null = null;

export interface InterfacectlResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export function resolveInterfacectlRoot(): string {
  const configuredRoot = process.env.SURFACES_INTERFACECTL_ROOT?.trim();
  if (configuredRoot) {
    return path.resolve(configuredRoot);
  }
  const detectedRoot = defaultInterfacectlRoot();
  if (detectedRoot) {
    return detectedRoot;
  }
  throw new Error("Could not resolve the interfacectl root.");
}

export async function loadInterfacectlUiAstTools(): Promise<InterfacectlUiAstTools> {
  if (!cachedUiAstTools) {
    cachedUiAstTools = (async () => {
      const modulePath = path.join(
        resolveInterfacectlRoot(),
        "packages",
        "interfacectl-validator",
        "dist",
        "index.js",
      );
      const moduleUrl = pathToFileURL(modulePath).href;
      const loaded = await import(moduleUrl) as Partial<InterfacectlUiAstTools>;
      const tools = {
        applyUiAstChange: loaded.applyUiAstChange,
        buildUiAstIntegrationEvidence: loaded.buildUiAstIntegrationEvidence,
        buildUiAstLifecycleRecord: loaded.buildUiAstLifecycleRecord,
        buildUiAstPromotionRecord: loaded.buildUiAstPromotionRecord,
        buildUiAstReviewArtifact: loaded.buildUiAstReviewArtifact,
        deriveLegacyContractFromUiAst: loaded.deriveLegacyContractFromUiAst,
        migrateLegacyContractToUiAst: loaded.migrateLegacyContractToUiAst,
        normalizeUiAst: loaded.normalizeUiAst,
        summarizeUiAst: loaded.summarizeUiAst,
      };
      for (const [name, value] of Object.entries(tools)) {
        if (typeof value !== "function") {
          throw new Error(`interfacectl validator export ${name} is unavailable.`);
        }
      }
      return tools as InterfacectlUiAstTools;
    })();
  }
  return cachedUiAstTools;
}

export async function runInterfacectlCli(
  args: string[],
  options: {
    cwd: string;
    env?: NodeJS.ProcessEnv;
    acceptExitCodes?: number[];
  },
): Promise<InterfacectlResult> {
  const env = {
    ...process.env,
    ...(process.env.SURFACES_INTERFACECTL_ROOT
      ? {}
      : { SURFACES_INTERFACECTL_ROOT: resolveInterfacectlRoot() }),
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
