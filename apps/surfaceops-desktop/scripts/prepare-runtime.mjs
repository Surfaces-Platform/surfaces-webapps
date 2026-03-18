import path from "node:path";
import fs from "node:fs";
import fsp from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const desktopRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(desktopRoot, "..", "..");
const webAppRoot = path.join(repoRoot, "apps", "surfaceops-web");
const runtimeRoot = path.join(desktopRoot, ".desktop-runtime", "surfaceops-web");

function encodePnpmPackageName(packageName) {
  return packageName.startsWith("@") ? packageName.replace("/", "+") : packageName;
}

function runOrThrow(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? repoRoot,
    stdio: "inherit",
    env: {
      ...process.env,
      ...options.env,
    },
  });

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with status ${result.status ?? "unknown"}.`);
  }
}

async function copyPath(source, target) {
  await fsp.mkdir(path.dirname(target), { recursive: true });
  await fsp.cp(source, target, {
    recursive: true,
    force: true,
    dereference: true,
  });
}

function findPnpmPackageCandidates(pnpmRoot, packageName) {
  const encodedPackageName = `${encodePnpmPackageName(packageName)}@`;
  const candidates = [];

  for (const entry of fs.readdirSync(pnpmRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || !entry.name.startsWith(encodedPackageName)) {
      continue;
    }

    const candidatePath = path.join(pnpmRoot, entry.name, "node_modules", packageName);
    if (fs.existsSync(candidatePath)) {
      candidates.push(candidatePath);
    }
  }

  return candidates.sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
}

export async function repairBrokenPnpmAliasSymlinks(standaloneRoot) {
  const pnpmRoot = path.join(standaloneRoot, "node_modules", ".pnpm");
  const aliasRoot = path.join(pnpmRoot, "node_modules");

  if (!fs.existsSync(aliasRoot)) {
    return [];
  }

  const repairs = [];

  async function walkAliasDir(currentDir) {
    for (const entry of await fsp.readdir(currentDir, { withFileTypes: true })) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        await walkAliasDir(fullPath);
        continue;
      }

      if (!entry.isSymbolicLink()) {
        continue;
      }

      const currentTarget = await fsp.readlink(fullPath);
      const resolvedTarget = path.resolve(path.dirname(fullPath), currentTarget);
      if (fs.existsSync(resolvedTarget)) {
        continue;
      }

      const packageName = path.relative(aliasRoot, fullPath).split(path.sep).join("/");
      const candidates = findPnpmPackageCandidates(pnpmRoot, packageName);
      if (candidates.length === 0) {
        throw new Error(
          `Could not repair broken standalone symlink for ${packageName} at ${fullPath}.`,
        );
      }

      const nextTarget = candidates.at(-1);
      const relativeTarget = path.relative(path.dirname(fullPath), nextTarget);
      await fsp.rm(fullPath, { force: true });
      await fsp.symlink(relativeTarget, fullPath, "dir");
      repairs.push({
        packageName,
        from: currentTarget,
        to: relativeTarget,
      });
    }
  }

  await walkAliasDir(aliasRoot);
  return repairs;
}

async function main() {
  await fsp.rm(runtimeRoot, { recursive: true, force: true });

  runOrThrow("pnpm", ["--filter", "@surfaces/platform-auth", "build"], { cwd: repoRoot });
  runOrThrow("pnpm", ["--filter", "surfaceops-web", "build"], {
    cwd: repoRoot,
    env: {
      SURFACEOPS_LOCAL_WORKBENCH: "1",
      SURFACEOPS_DESKTOP_RUNTIME: "1",
      NEXT_TELEMETRY_DISABLED: "1",
    },
  });

  const standaloneRoot = path.join(webAppRoot, ".next", "standalone");
  const standaloneServerPath = path.join(standaloneRoot, "apps", "surfaceops-web", "server.js");
  const standaloneFallbackPath = path.join(standaloneRoot, "server.js");

  const resolvedServerPath = fs.existsSync(standaloneServerPath)
    ? standaloneServerPath
    : standaloneFallbackPath;

  if (!fs.existsSync(resolvedServerPath)) {
    throw new Error("Could not find the standalone SurfaceOps server.js output.");
  }

  await repairBrokenPnpmAliasSymlinks(standaloneRoot);

  await copyPath(standaloneRoot, path.join(runtimeRoot, "standalone"));
  await copyPath(path.join(webAppRoot, ".next", "static"), path.join(runtimeRoot, "standalone", "apps", "surfaceops-web", ".next", "static"));
  await copyPath(path.join(webAppRoot, "public"), path.join(runtimeRoot, "standalone", "apps", "surfaceops-web", "public"));

  await fsp.writeFile(
    path.join(runtimeRoot, "metadata.json"),
    JSON.stringify(
      {
        preparedAt: new Date().toISOString(),
        serverPath: path.relative(runtimeRoot, resolvedServerPath),
      },
      null,
      2,
    ),
    "utf8",
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
