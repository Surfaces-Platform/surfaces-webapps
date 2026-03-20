import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);

const RELEASE_ASSET_PATTERNS = [
  /\.dmg$/i,
  /\.zip$/i,
  /\.blockmap$/i,
  /\.yml$/i,
];

function parseArgs(argv) {
  const args = {
    extra: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (!current?.startsWith("--")) {
      continue;
    }

    const key = current.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Expected a value after ${current}.`);
    }

    if (key === "extra") {
      args.extra.push(value);
    } else {
      args[key] = value;
    }
    index += 1;
  }

  return args;
}

function isReleaseAsset(fileName) {
  return RELEASE_ASSET_PATTERNS.some((pattern) => pattern.test(fileName));
}

export async function listSurfaceOpsDesktopReleaseAssets({ distDir }) {
  const resolvedDistDir = path.resolve(distDir);
  const entries = await fs.readdir(resolvedDistDir, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && isReleaseAsset(entry.name))
    .map((entry) => path.join(resolvedDistDir, entry.name))
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
}

async function assertFileExists(filePath) {
  try {
    await fs.access(filePath);
  } catch {
    throw new Error(`Missing expected release asset ${filePath}.`);
  }
}

function runOrThrow(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: process.env,
  });

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with status ${result.status ?? "unknown"}.`);
  }
}

export async function uploadSurfaceOpsDesktopReleaseAssets({
  releaseTag,
  distDir,
  extra = [],
} = {}) {
  if (!releaseTag) {
    throw new Error("Missing required releaseTag.");
  }
  if (!distDir) {
    throw new Error("Missing required distDir.");
  }

  const releaseAssets = await listSurfaceOpsDesktopReleaseAssets({ distDir });
  if (releaseAssets.length === 0) {
    throw new Error(`No top-level desktop release assets found in ${path.resolve(distDir)}.`);
  }

  const extraAssets = extra.map((filePath) => path.resolve(filePath));
  await Promise.all(extraAssets.map(assertFileExists));

  runOrThrow("gh", [
    "release",
    "upload",
    releaseTag,
    ...releaseAssets,
    ...extraAssets,
    "--clobber",
  ]);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const releaseTag = args["release-tag"]?.trim();
  const distDir = args["dist-dir"]?.trim();
  await uploadSurfaceOpsDesktopReleaseAssets({
    releaseTag,
    distDir,
    extra: args.extra,
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
