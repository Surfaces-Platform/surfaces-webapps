import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";

const STANDALONE_REPO_MARKERS = [
  path.join("packages", "interfacectl-cli", "package.json"),
  path.join("packages", "interfacectl-validator", "package.json"),
];

export const INTERFACECTL_ENV_VARS = {
  root: "SURFACES_INTERFACECTL_ROOT",
  cli: "SURFACES_INTERFACECTL_CLI",
  guard: "SURFACES_INTERFACECTL_GENERATION_GUARD",
};

function toAbsolutePath(cwd, candidate) {
  if (!candidate) return undefined;
  return path.isAbsolute(candidate) ? candidate : path.resolve(cwd, candidate);
}

function ensureFileExists(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${label} file not found at ${filePath}.`);
  }

  if (!fs.statSync(filePath).isFile()) {
    throw new Error(`${label} path is not a file: ${filePath}.`);
  }
}

function isInterfacectlRepoRoot(candidatePath) {
  return STANDALONE_REPO_MARKERS.every((relativePath) =>
    fs.existsSync(path.join(candidatePath, relativePath)),
  );
}

function uniquePaths(paths) {
  return [...new Set(paths.map((candidate) => path.resolve(candidate)))];
}

function getSiblingRepoCandidates(cwd) {
  const repoRoot = path.resolve(cwd);
  const repoName = path.basename(repoRoot);
  const repoParent = path.dirname(repoRoot);
  const candidates = [path.join(repoParent, "interfacectl")];

  if (repoName.startsWith("surfaces-webapps")) {
    candidates.push(
      path.join(repoParent, repoName.replace(/^surfaces-webapps/, "interfacectl")),
    );
  }

  return uniquePaths(candidates).filter((candidate) => candidate !== repoRoot);
}

export function findSiblingInterfacectlRepoRoot(options = {}) {
  const cwd = path.resolve(options.cwd ?? process.cwd());
  return getSiblingRepoCandidates(cwd).find((candidate) => isInterfacectlRepoRoot(candidate));
}

function findPackageRoot(startPath) {
  let current = path.dirname(startPath);
  while (true) {
    const packageJsonPath = path.join(current, "package.json");
    if (fs.existsSync(packageJsonPath)) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return undefined;
    }
    current = parent;
  }
}

function readPackageVersion(packageRoot) {
  if (!packageRoot) return undefined;
  const packageJsonPath = path.join(packageRoot, "package.json");
  if (!fs.existsSync(packageJsonPath)) return undefined;

  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
    return typeof packageJson.version === "string" ? packageJson.version : undefined;
  } catch {
    return undefined;
  }
}

function resolveExplicitCli(cwd, explicitCliPath) {
  if (!explicitCliPath) return undefined;

  const cliPath = toAbsolutePath(cwd, explicitCliPath);
  ensureFileExists(cliPath, "interfacectl CLI");

  const packageRoot = findPackageRoot(cliPath);
  return {
    kind: "cli",
    source: "explicit-cli",
    path: cliPath,
    packageRoot,
    version: readPackageVersion(packageRoot),
  };
}

function resolveExplicitRoot(cwd, explicitRootPath) {
  if (!explicitRootPath) return undefined;

  const repoRoot = toAbsolutePath(cwd, explicitRootPath);
  if (!isInterfacectlRepoRoot(repoRoot)) {
    throw new Error(`Standalone interfacectl repo not found at ${repoRoot}.`);
  }
  const cliPath = path.join(
    repoRoot,
    "packages",
    "interfacectl-cli",
    "dist",
    "index.js",
  );
  ensureFileExists(cliPath, "interfacectl CLI");

  return {
    kind: "cli",
    source: "explicit-root",
    path: cliPath,
    repoRoot,
    packageRoot: path.join(repoRoot, "packages", "interfacectl-cli"),
    version: readPackageVersion(path.join(repoRoot, "packages", "interfacectl-cli")),
  };
}

function resolveSiblingCli(cwd) {
  const repoRoot = findSiblingInterfacectlRepoRoot({ cwd });
  if (!repoRoot) {
    return undefined;
  }

  const cliPath = path.join(
    repoRoot,
    "packages",
    "interfacectl-cli",
    "dist",
    "index.js",
  );
  if (!fs.existsSync(cliPath)) {
    return undefined;
  }

  ensureFileExists(cliPath, "interfacectl CLI");

  return {
    kind: "cli",
    source: "sibling-checkout",
    path: cliPath,
    repoRoot,
    packageRoot: path.join(repoRoot, "packages", "interfacectl-cli"),
    version: readPackageVersion(path.join(repoRoot, "packages", "interfacectl-cli")),
  };
}

function resolveInstalledCli(cwd) {
  const requireFromCwd = createRequire(
    path.join(cwd, "__surfaces_interfacectl_resolver__.cjs"),
  );

  try {
    const cliPath = requireFromCwd.resolve("@surfaces/interfacectl-cli");
    const packageRoot = findPackageRoot(cliPath);
    return {
      kind: "cli",
      source: "installed-package",
      path: cliPath,
      packageRoot,
      version: readPackageVersion(packageRoot),
    };
  } catch {
    return undefined;
  }
}

function resolveExplicitGuard(cwd, explicitGuardPath) {
  if (!explicitGuardPath) return undefined;

  const guardPath = toAbsolutePath(cwd, explicitGuardPath);
  ensureFileExists(guardPath, "Generation guard");

  return {
    kind: "guard",
    source: "explicit-guard",
    path: guardPath,
  };
}

function resolveRootGuard(cwd, explicitRootPath) {
  if (!explicitRootPath) return undefined;

  const repoRoot = toAbsolutePath(cwd, explicitRootPath);
  if (!isInterfacectlRepoRoot(repoRoot)) {
    throw new Error(`Standalone interfacectl repo not found at ${repoRoot}.`);
  }
  const guardPath = path.join(repoRoot, "tools", "check-generation-boundaries.mjs");
  ensureFileExists(guardPath, "Generation guard");

  return {
    kind: "guard",
    source: "explicit-root",
    path: guardPath,
    repoRoot,
  };
}

function resolveGuardFromCliRepo(cliResolution) {
  const repoRoot =
    cliResolution?.repoRoot ??
    (cliResolution?.packageRoot
      ? path.resolve(cliResolution.packageRoot, "..", "..")
      : undefined);

  if (!repoRoot) return undefined;

  const guardPath = path.join(repoRoot, "tools", "check-generation-boundaries.mjs");
  if (!fs.existsSync(guardPath)) {
    return undefined;
  }

  ensureFileExists(guardPath, "Generation guard");

  return {
    kind: "guard",
    source:
      cliResolution.source === "installed-package"
        ? "package-sibling-repo"
        : cliResolution.source,
    path: guardPath,
    repoRoot,
  };
}

function missingCliMessage(cwd) {
  return [
    "Unable to resolve interfacectl CLI.",
    `Set ${INTERFACECTL_ENV_VARS.cli} to an explicit CLI entrypoint,`,
    `set ${INTERFACECTL_ENV_VARS.root} to a standalone interfacectl checkout,`,
    "use a built sibling ../interfacectl checkout,",
    "or install @surfaces/interfacectl-cli into this workspace.",
  ].join(" ");
}

function missingGuardMessage() {
  return [
    "Unable to resolve the shared generation boundary checker.",
    `Set ${INTERFACECTL_ENV_VARS.guard} to an explicit checker path,`,
    `set ${INTERFACECTL_ENV_VARS.root} to a standalone interfacectl checkout,`,
    "use a sibling ../interfacectl checkout,",
    "or install/build an interfacectl source that contains tools/check-generation-boundaries.mjs.",
  ].join(" ");
}

export function resolveCliTool(options = {}) {
  const cwd = path.resolve(options.cwd ?? process.cwd());
  const env = options.env ?? process.env;

  const explicitCliPath = options.cliPath ?? env[INTERFACECTL_ENV_VARS.cli];
  const explicitRootPath = options.rootPath ?? env[INTERFACECTL_ENV_VARS.root];

  return (
    resolveExplicitCli(cwd, explicitCliPath) ??
    resolveExplicitRoot(cwd, explicitRootPath) ??
    resolveSiblingCli(cwd) ??
    resolveInstalledCli(cwd) ??
    (() => {
      throw new Error(missingCliMessage(cwd));
    })()
  );
}

export function resolveGenerationGuardTool(options = {}) {
  const cwd = path.resolve(options.cwd ?? process.cwd());
  const env = options.env ?? process.env;

  const explicitGuardPath =
    options.guardPath ?? env[INTERFACECTL_ENV_VARS.guard];
  const explicitRootPath = options.rootPath ?? env[INTERFACECTL_ENV_VARS.root];

  const explicitGuard = resolveExplicitGuard(cwd, explicitGuardPath);
  if (explicitGuard) {
    return explicitGuard;
  }

  const rootGuard = resolveRootGuard(cwd, explicitRootPath);
  if (rootGuard) {
    return rootGuard;
  }

  let cliResolution = options.cliResolution;
  if (!cliResolution) {
    try {
      cliResolution = resolveCliTool({ cwd, env });
    } catch {
      cliResolution = undefined;
    }
  }

  return (
    resolveGuardFromCliRepo(cliResolution) ??
    (() => {
      throw new Error(missingGuardMessage());
    })()
  );
}

export function resolveInterfacectlTools(options = {}) {
  const cli = resolveCliTool(options);
  const guard = resolveGenerationGuardTool({
    ...options,
    cliResolution: cli,
  });

  return { cli, guard };
}

function getGitSha(repoRoot) {
  if (!repoRoot || !fs.existsSync(path.join(repoRoot, ".git"))) {
    return undefined;
  }

  const result = spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    return undefined;
  }

  return result.stdout.trim() || undefined;
}

export function inspectResolvedTool(kind, options = {}) {
  const resolution =
    kind === "guard"
      ? resolveGenerationGuardTool(options)
      : resolveCliTool(options);

  return {
    kind,
    source: resolution.source,
    path: resolution.path,
    version: resolution.version,
    repoRoot: resolution.repoRoot,
    gitSha: getGitSha(resolution.repoRoot),
  };
}
