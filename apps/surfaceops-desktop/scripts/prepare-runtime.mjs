import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import fsp from "node:fs/promises";
import { createHash } from "node:crypto";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const desktopRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(desktopRoot, "..", "..");
const webAppRoot = path.join(repoRoot, "apps", "surfaceops-web");
const runtimeRoot = path.join(desktopRoot, ".desktop-runtime", "surfaceops-web");
const modelRuntimeRoot = path.join(desktopRoot, ".desktop-runtime", "model-runtime");
const modelRuntimeTemplateRoot = path.join(desktopRoot, "resources", "model-runtime");
const modelRuntimeCacheRoot = path.join(desktopRoot, ".cache", "model-runtime");
const modelRuntimeManifestPath = path.join(modelRuntimeTemplateRoot, "llama-runtime.manifest.json");

function encodePnpmPackageName(packageName) {
  return packageName.startsWith("@") ? packageName.replace("/", "+") : packageName;
}

function runOrThrow(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? repoRoot,
    stdio: options.stdio ?? "inherit",
    env: {
      ...process.env,
      ...options.env,
    },
  });

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with status ${result.status ?? "unknown"}.`);
  }
}

async function hashFile(filePath) {
  const hash = createHash("sha256");
  const stream = fs.createReadStream(filePath);
  for await (const chunk of stream) {
    hash.update(chunk);
  }
  return hash.digest("hex");
}

async function copyPath(source, target, options = {}) {
  const stat = await fsp.lstat(source);
  await fsp.mkdir(path.dirname(target), { recursive: true });
  if (stat.isDirectory()) {
    await fsp.cp(source, target, {
      recursive: true,
      force: true,
      dereference: options.dereference ?? true,
      verbatimSymlinks: options.dereference === false,
    });
    return;
  }

  if (stat.isSymbolicLink()) {
    const symlinkTarget = await fsp.readlink(source);
    await fsp.rm(target, { recursive: true, force: true });
    await fsp.symlink(symlinkTarget, target);
    return;
  }

  await fsp.copyFile(source, target);
}

async function copyDirectoryContents(sourceDir, targetDir, options = {}) {
  const excludedPaths = new Set((options.excludePaths ?? []).map((entry) => path.resolve(entry)));
  await fsp.mkdir(targetDir, { recursive: true });
  for (const entry of await fsp.readdir(sourceDir)) {
    const sourcePath = path.join(sourceDir, entry);
    if (excludedPaths.has(path.resolve(sourcePath))) {
      continue;
    }
    await copyPath(sourcePath, path.join(targetDir, entry));
  }
}

async function copyRuntimeSupportFiles(sourceDir, targetDir, entrypoint = "llama-server") {
  const runtimeFiles = await fsp.readdir(sourceDir);
  for (const fileName of runtimeFiles) {
    if (
      fileName === entrypoint
      || fileName === "ggml-metal.metal"
      || (fileName.startsWith("lib") && fileName.endsWith(".dylib"))
      || fileName.startsWith("LICENSE")
      || (fileName.startsWith("ggml-") && fileName.endsWith(".h"))
    ) {
      await copyPath(path.join(sourceDir, fileName), path.join(targetDir, fileName));
    }
  }
}

export function resolvePreparedStandaloneServerPath({ runtimeRoot, standaloneRoot, resolvedServerPath }) {
  const normalizedRuntimeRoot = path.resolve(runtimeRoot);
  const normalizedStandaloneRoot = path.resolve(standaloneRoot);
  const normalizedResolvedServerPath = path.resolve(resolvedServerPath);
  const relativeServerPath = path.relative(normalizedStandaloneRoot, normalizedResolvedServerPath);

  if (
    !relativeServerPath
    || relativeServerPath.startsWith("..")
    || path.isAbsolute(relativeServerPath)
  ) {
    throw new Error(
      `Standalone SurfaceOps server ${normalizedResolvedServerPath} is not contained within ${normalizedStandaloneRoot}.`,
    );
  }

  return path.join(normalizedRuntimeRoot, "standalone", relativeServerPath);
}

function parseJson(text, label) {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Could not parse ${label}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function resolvePositiveInteger(value) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export async function readBundledModelRuntimeManifest(options = {}) {
  const manifestPath = path.resolve(options.manifestPath ?? modelRuntimeManifestPath);
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Bundled llama.cpp runtime manifest is missing at ${manifestPath}.`);
  }

  const manifest = parseJson(await fsp.readFile(manifestPath, "utf8"), manifestPath);
  const requiredFields = ["vendor", "releaseTag", "assetName", "downloadUrl", "sha256", "archiveRoot", "entrypoint"];
  for (const field of requiredFields) {
    if (typeof manifest[field] !== "string" || !manifest[field].trim()) {
      throw new Error(`Bundled llama.cpp runtime manifest is missing ${field}.`);
    }
  }

  const sizeBytes = resolvePositiveInteger(manifest.sizeBytes);
  if (!sizeBytes) {
    throw new Error("Bundled llama.cpp runtime manifest is missing a valid sizeBytes value.");
  }

  return {
    ...manifest,
    manifestPath,
    sizeBytes,
  };
}

async function downloadFile(url, destinationPath) {
  const resolvedUrl = new URL(url);
  if (resolvedUrl.protocol === "file:") {
    await copyPath(fileURLToPath(resolvedUrl), destinationPath);
    return;
  }

  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) {
    throw new Error(`Could not download bundled llama.cpp runtime from ${url}: ${response.status}.`);
  }
  if (!response.body) {
    throw new Error(`Bundled llama.cpp runtime download from ${url} returned no body.`);
  }

  await fsp.mkdir(path.dirname(destinationPath), { recursive: true });
  const writer = fs.createWriteStream(destinationPath);
  try {
    for await (const chunk of Readable.fromWeb(response.body)) {
      if (!writer.write(chunk)) {
        await new Promise((resolve) => writer.once("drain", resolve));
      }
    }
    await new Promise((resolve, reject) => {
      writer.once("error", reject);
      writer.end(resolve);
    });
  } catch (error) {
    writer.destroy();
    throw error;
  }
}

async function ensureDownloadedModelRuntimeArchive(manifest, options = {}) {
  const cacheRoot = path.resolve(options.cacheRoot ?? modelRuntimeCacheRoot);
  const archivePath = path.join(cacheRoot, manifest.assetName);

  await fsp.mkdir(cacheRoot, { recursive: true });

  if (fs.existsSync(archivePath)) {
    const existingHash = await hashFile(archivePath);
    const existingStat = await fsp.stat(archivePath);
    if (existingHash === manifest.sha256 && existingStat.size === manifest.sizeBytes) {
      return archivePath;
    }
    await fsp.rm(archivePath, { force: true });
  }

  const tempPath = `${archivePath}.tmp`;
  await fsp.rm(tempPath, { force: true });
  await downloadFile(manifest.downloadUrl, tempPath);

  const [downloadedHash, downloadedStat] = await Promise.all([
    hashFile(tempPath),
    fsp.stat(tempPath),
  ]);
  if (downloadedHash !== manifest.sha256) {
    await fsp.rm(tempPath, { force: true });
    throw new Error(
      `Bundled llama.cpp runtime checksum mismatch for ${manifest.assetName}. Expected ${manifest.sha256}, received ${downloadedHash}.`,
    );
  }
  if (downloadedStat.size !== manifest.sizeBytes) {
    await fsp.rm(tempPath, { force: true });
    throw new Error(
      `Bundled llama.cpp runtime size mismatch for ${manifest.assetName}. Expected ${manifest.sizeBytes}, received ${downloadedStat.size}.`,
    );
  }

  await fsp.rename(tempPath, archivePath);
  return archivePath;
}

async function extractBundledModelRuntimeArchive(archivePath, outputDir) {
  await fsp.mkdir(outputDir, { recursive: true });
  if (archivePath.endsWith(".tar.gz")) {
    runOrThrow("tar", ["-xzf", archivePath, "-C", outputDir], { stdio: "pipe" });
    return;
  }
  if (archivePath.endsWith(".zip")) {
    runOrThrow("unzip", ["-oq", archivePath, "-d", outputDir], { stdio: "pipe" });
    return;
  }
  throw new Error(`Unsupported bundled llama.cpp runtime archive type for ${archivePath}.`);
}

function resolveRuntimeOverride(sourceOverridePath) {
  const overridePath = path.resolve(sourceOverridePath);
  if (!fs.existsSync(overridePath)) {
    throw new Error(`SURFACEOPS_LLAMA_SERVER_BIN points to a missing path: ${overridePath}`);
  }

  const stat = fs.statSync(overridePath);
  const runtimeRoot = stat.isDirectory() ? overridePath : path.dirname(overridePath);
  const binaryPath = stat.isDirectory() ? path.join(overridePath, "llama-server") : overridePath;

  if (!fs.existsSync(binaryPath)) {
    throw new Error(`Expected llama-server in override runtime path ${runtimeRoot}.`);
  }

  return {
    runtimeRoot,
    binaryPath,
    isDirectoryOverride: stat.isDirectory(),
  };
}

async function finalizePreparedModelRuntime(outputRoot, entrypoint = "llama-server") {
  const binaryPath = path.join(outputRoot, entrypoint);
  if (!fs.existsSync(binaryPath)) {
    throw new Error(`Prepared bundled model runtime is missing ${entrypoint} at ${binaryPath}.`);
  }

  await fsp.chmod(binaryPath, 0o755);
  return {
    outputRoot,
    binaryPath,
  };
}

export async function prepareBundledModelRuntime(options = {}) {
  const templateRoot = path.resolve(options.templateRoot ?? modelRuntimeTemplateRoot);
  const outputRoot = path.resolve(options.outputRoot ?? modelRuntimeRoot);
  const sourceBinaryPath = options.sourceBinaryPath?.trim()
    || process.env.SURFACEOPS_LLAMA_SERVER_BIN?.trim();

  await fsp.rm(outputRoot, { recursive: true, force: true });
  await fsp.mkdir(outputRoot, { recursive: true });

  if (fs.existsSync(templateRoot)) {
    await copyPath(templateRoot, outputRoot);
  }

  if (sourceBinaryPath) {
    const override = resolveRuntimeOverride(sourceBinaryPath);
    if (override.isDirectoryOverride) {
      await copyDirectoryContents(override.runtimeRoot, outputRoot, {
        excludePaths: [outputRoot],
      });
    } else {
      await copyRuntimeSupportFiles(override.runtimeRoot, outputRoot, path.basename(override.binaryPath));
    }
    return finalizePreparedModelRuntime(outputRoot);
  }

  const manifest = await readBundledModelRuntimeManifest({
    manifestPath: options.manifestPath,
  });
  const archivePath = await ensureDownloadedModelRuntimeArchive(manifest, {
    cacheRoot: options.cacheRoot,
  });
  const extractionRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "surfaceops-model-runtime-extract-"));

  try {
    await extractBundledModelRuntimeArchive(archivePath, extractionRoot);
    const bundledRuntimeRoot = path.join(extractionRoot, manifest.archiveRoot);
    if (!fs.existsSync(bundledRuntimeRoot)) {
      throw new Error(
        `Bundled llama.cpp runtime archive ${manifest.assetName} did not contain ${manifest.archiveRoot}.`,
      );
    }
    await copyDirectoryContents(bundledRuntimeRoot, outputRoot);
  } finally {
    await fsp.rm(extractionRoot, { recursive: true, force: true });
  }

  return finalizePreparedModelRuntime(outputRoot, manifest.entrypoint);
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

export async function prepareBundledWorkbenchRuntime(options = {}) {
  const sourceWebAppRoot = path.resolve(options.webAppRoot ?? webAppRoot);
  const outputRoot = path.resolve(options.outputRoot ?? runtimeRoot);
  const sourceStandaloneRoot = path.resolve(options.standaloneRoot ?? path.join(sourceWebAppRoot, ".next", "standalone"));
  const sourceStaticRoot = path.resolve(options.staticRoot ?? path.join(sourceWebAppRoot, ".next", "static"));
  const sourcePublicRoot = path.resolve(options.publicRoot ?? path.join(sourceWebAppRoot, "public"));
  const standaloneServerPath = path.join(sourceStandaloneRoot, "apps", "surfaceops-web", "server.js");
  const standaloneFallbackPath = path.join(sourceStandaloneRoot, "server.js");
  const resolvedServerPath = fs.existsSync(standaloneServerPath)
    ? standaloneServerPath
    : standaloneFallbackPath;

  if (!fs.existsSync(resolvedServerPath)) {
    throw new Error("Could not find the standalone SurfaceOps server.js output.");
  }

  await fsp.rm(outputRoot, { recursive: true, force: true });
  await repairBrokenPnpmAliasSymlinks(sourceStandaloneRoot);
  await copyPath(sourceStandaloneRoot, path.join(outputRoot, "standalone"), {
    // Preserve pnpm symlinks so the standalone server keeps its module graph intact.
    dereference: false,
  });

  if (fs.existsSync(sourceStaticRoot)) {
    await copyPath(
      sourceStaticRoot,
      path.join(outputRoot, "standalone", "apps", "surfaceops-web", ".next", "static"),
    );
  }

  if (fs.existsSync(sourcePublicRoot)) {
    await copyPath(
      sourcePublicRoot,
      path.join(outputRoot, "standalone", "apps", "surfaceops-web", "public"),
    );
  }

  const preparedServerPath = resolvePreparedStandaloneServerPath({
    runtimeRoot: outputRoot,
    standaloneRoot: sourceStandaloneRoot,
    resolvedServerPath,
  });
  const metadataPath = path.join(outputRoot, "metadata.json");

  await fsp.writeFile(
    metadataPath,
    JSON.stringify(
      {
        preparedAt: new Date().toISOString(),
        serverPath: path.relative(outputRoot, preparedServerPath),
      },
      null,
      2,
    ),
    "utf8",
  );

  return {
    outputRoot,
    metadataPath,
    serverPath: preparedServerPath,
  };
}

async function main() {
  await fsp.rm(modelRuntimeRoot, { recursive: true, force: true });

  runOrThrow("pnpm", ["--filter", "@surfaces/platform-auth", "build"], { cwd: repoRoot });
  runOrThrow("pnpm", ["--filter", "surfaceops-web", "build"], {
    cwd: repoRoot,
    env: {
      SURFACEOPS_LOCAL_WORKBENCH: "1",
      SURFACEOPS_DESKTOP_RUNTIME: "1",
      NEXT_TELEMETRY_DISABLED: "1",
    },
  });

  await prepareBundledWorkbenchRuntime();
  await prepareBundledModelRuntime();
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
