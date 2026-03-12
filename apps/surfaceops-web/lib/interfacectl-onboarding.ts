import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const INTERFACECTL_ROOT_ENV = "SURFACES_INTERFACECTL_ROOT";
const STANDALONE_REPO_MARKERS = [
  path.join("packages", "interfacectl-cli", "package.json"),
  path.join("packages", "interfacectl-onboarding", "package.json"),
];

type InterfacectlOnboardingModule = {
  runOnboardingRequest: (request: Record<string, unknown>) => Promise<Record<string, unknown>>;
};

export interface SurfaceOpsOnboardingRequest {
  url?: string;
  surfaceName?: string;
  surfaceId?: string;
  authMode?: "none" | "browser-session";
  authProfileName?: string;
  continueOnGate?: boolean;
}

function isInterfacectlRepoRoot(candidatePath: string): boolean {
  return STANDALONE_REPO_MARKERS.every((relativePath) =>
    fs.existsSync(path.join(candidatePath, relativePath)),
  );
}

function getSiblingRepoCandidates(cwd: string): string[] {
  const start = path.resolve(cwd);
  const candidates: string[] = [];
  let current = start;

  while (true) {
    const repoName = path.basename(current);
    const repoParent = path.dirname(current);
    candidates.push(path.join(repoParent, "interfacectl"));

    if (repoName.startsWith("surfaces-webapps")) {
      candidates.push(path.join(repoParent, repoName.replace(/^surfaces-webapps/, "interfacectl")));
    }

    if (repoParent === current) {
      break;
    }
    current = repoParent;
  }

  return [...new Set(candidates.map((candidate) => path.resolve(candidate)))].filter((candidate) => candidate !== start);
}

function resolveInstalledPackageEntry(cwd: string): string | null {
  let current = path.resolve(cwd);

  while (true) {
    const entry = path.join(current, "node_modules", "@surfaces", "interfacectl-onboarding", "dist", "index.js");
    if (fs.existsSync(entry)) {
      return entry;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

function resolveRepoPackageEntry(repoRoot: string): string | null {
  const entry = path.join(repoRoot, "packages", "interfacectl-onboarding", "dist", "index.js");
  return fs.existsSync(entry) ? entry : null;
}

function resolveInterfacectlOnboardingEntry(cwd = process.cwd()): string {
  const explicitRoot = process.env[INTERFACECTL_ROOT_ENV];
  if (explicitRoot && isInterfacectlRepoRoot(explicitRoot)) {
    const explicitEntry = resolveRepoPackageEntry(path.resolve(explicitRoot));
    if (explicitEntry) {
      return explicitEntry;
    }
  }

  const siblingRoot = getSiblingRepoCandidates(cwd).find((candidate) => isInterfacectlRepoRoot(candidate));
  if (siblingRoot) {
    const siblingEntry = resolveRepoPackageEntry(siblingRoot);
    if (siblingEntry) {
      return siblingEntry;
    }
  }

  const installed = resolveInstalledPackageEntry(cwd);
  if (installed) {
    return installed;
  }

  throw new Error(
    "Unable to resolve @surfaces/interfacectl-onboarding. Build a sibling interfacectl checkout or install the package.",
  );
}

async function loadInterfacectlOnboardingModule(): Promise<InterfacectlOnboardingModule> {
  const entry = resolveInterfacectlOnboardingEntry();
  if (process.env.VITEST) {
    return import(pathToFileURL(entry).href) as Promise<InterfacectlOnboardingModule>;
  }
  const runtimeImport = new Function("modulePath", "return import(modulePath);") as (
    modulePath: string,
  ) => Promise<InterfacectlOnboardingModule>;
  return runtimeImport(entry);
}

function getContractsDir(): string {
  const configured = process.env.SURFACEOPS_CONTRACTS_DIR;
  if (configured && configured.trim().length > 0) {
    return path.resolve(configured);
  }
  return path.resolve(process.cwd(), "contracts");
}

export async function runSurfaceOpsOnboarding(request: SurfaceOpsOnboardingRequest): Promise<Record<string, unknown>> {
  const contractsDir = getContractsDir();
  const rootDir = path.dirname(contractsDir);
  const generatedDir = path.join(contractsDir, "generated");
  const onboarding = await loadInterfacectlOnboardingModule();

  return onboarding.runOnboardingRequest({
    rootDir,
    sourceMode: "remote-url",
    url: request.url,
    surfaceName: request.surfaceName,
    surfaceId: request.surfaceId,
    authProfileName:
      request.authMode === "browser-session" ? request.authProfileName?.trim() || undefined : undefined,
    continueOnGate: request.continueOnGate === true,
    outDir: path.relative(rootDir, generatedDir),
  });
}
