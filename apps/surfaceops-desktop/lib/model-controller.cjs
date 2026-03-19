const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const { Readable } = require("node:stream");
const { createHash, randomUUID } = require("node:crypto");
const { EventEmitter } = require("node:events");

const {
  SURFACEOPS_MODEL_CATALOG_VERSION,
  createDefaultModelInstallState,
  getSurfaceOpsModelCatalog,
  getSurfaceOpsModelCatalogEntry,
} = require("@surfaces/surfaceops-desktop-bridge");

const {
  detectSurfaceOpsHardwareProfile,
} = require("./hardware-profile.cjs");

function buildHuggingFaceDownloadUrl(entry) {
  return `https://huggingface.co/${entry.hfRepo}/resolve/${entry.hfRevision}/${entry.filename}`;
}

function loadModelDownloadOverrides(env) {
  const overridePath = env.SURFACEOPS_DESKTOP_MODEL_DOWNLOAD_OVERRIDES_PATH?.trim();
  if (!overridePath) {
    return new Map();
  }

  const resolvedPath = path.resolve(overridePath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`SurfaceOps model download overrides file is missing at ${resolvedPath}.`);
  }

  const parsed = JSON.parse(fs.readFileSync(resolvedPath, "utf8"));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("SurfaceOps model download overrides must be a JSON object keyed by model id.");
  }

  const overrides = new Map();
  for (const [modelId, value] of Object.entries(parsed)) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error(`SurfaceOps model download override for ${modelId} must be an object.`);
    }
    if (typeof value.downloadUrl !== "string" || !value.downloadUrl.trim()) {
      throw new Error(`SurfaceOps model download override for ${modelId} is missing downloadUrl.`);
    }
    if (typeof value.sha256 !== "string" || !value.sha256.trim()) {
      throw new Error(`SurfaceOps model download override for ${modelId} is missing sha256.`);
    }
    const sizeBytes = Number.parseInt(String(value.sizeBytes ?? ""), 10);
    if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
      throw new Error(`SurfaceOps model download override for ${modelId} is missing a valid sizeBytes.`);
    }
    overrides.set(modelId, {
      downloadUrl: value.downloadUrl.trim(),
      sha256: value.sha256.trim(),
      sizeBytes,
      filename:
        typeof value.filename === "string" && value.filename.trim()
          ? value.filename.trim()
          : null,
    });
  }

  return overrides;
}

function resolveModelDownload(entry, overrides) {
  const override = overrides.get(entry.id);
  return {
    downloadUrl: override?.downloadUrl ?? buildHuggingFaceDownloadUrl(entry),
    sha256: override?.sha256 ?? entry.sha256,
    sizeBytes: override?.sizeBytes ?? entry.sizeBytes,
    filename: override?.filename ?? entry.filename,
  };
}

async function hashFile(filePath) {
  const hash = createHash("sha256");
  const file = fs.createReadStream(filePath);
  for await (const chunk of file) {
    hash.update(chunk);
  }
  return hash.digest("hex");
}

async function fileExists(filePath) {
  try {
    await fsp.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function downloadWithResume({
  url,
  destinationPath,
  expectedSize,
  signal,
  onProgress,
}) {
  const partialPath = `${destinationPath}.part`;
  await fsp.mkdir(path.dirname(destinationPath), { recursive: true });

  let existingBytes = 0;
  if (await fileExists(partialPath)) {
    const stat = await fsp.stat(partialPath);
    existingBytes = stat.size;
  }

  const headers = existingBytes > 0 ? { Range: `bytes=${existingBytes}-` } : {};
  let response = await fetch(url, { headers, signal, redirect: "follow" });

  if (existingBytes > 0 && response.status !== 206) {
    await fsp.rm(partialPath, { force: true });
    existingBytes = 0;
    response = await fetch(url, { signal, redirect: "follow" });
  }

  if (!response.ok) {
    throw new Error(`Model download failed with ${response.status}.`);
  }
  if (!response.body) {
    throw new Error("Model download returned no response body.");
  }

  const totalBytesHeader = Number.parseInt(response.headers.get("content-length") ?? "", 10);
  const totalBytes = Number.isFinite(totalBytesHeader) && totalBytesHeader > 0
    ? totalBytesHeader + existingBytes
    : expectedSize ?? null;
  const writer = fs.createWriteStream(partialPath, {
    flags: existingBytes > 0 ? "a" : "w",
  });

  let bytesDownloaded = existingBytes;
  onProgress?.({
    bytesDownloaded,
    totalBytes,
    resumable: existingBytes > 0,
  });

  try {
    for await (const chunk of Readable.fromWeb(response.body)) {
      if (!writer.write(chunk)) {
        await new Promise((resolve) => writer.once("drain", resolve));
      }
      bytesDownloaded += chunk.length;
      onProgress?.({
        bytesDownloaded,
        totalBytes,
        resumable: true,
      });
    }
    await new Promise((resolve, reject) => {
      writer.once("error", reject);
      writer.end(resolve);
    });
  } catch (error) {
    writer.destroy();
    throw error;
  }

  if (expectedSize && bytesDownloaded !== expectedSize) {
    throw new Error(`Expected ${expectedSize} bytes, received ${bytesDownloaded}.`);
  }

  await fsp.rename(partialPath, destinationPath);
  return {
    bytesDownloaded,
    totalBytes,
  };
}

function createSurfaceOpsModelController(options) {
  const preferencesStore = options.preferencesStore;
  const modeldController = options.modeldController;
  const modelStorageRoot = path.resolve(options.modelStorageRoot);
  const benchmarkRoot = path.resolve(options.benchmarkRoot);
  const exportRoot = path.resolve(options.exportRoot ?? path.join(benchmarkRoot, "exports"));
  const env = options.env ?? process.env;
  const modelDownloadOverrides = loadModelDownloadOverrides(env);
  const emitter = new EventEmitter();
  let installAbortController = null;

  function getCatalog() {
    return {
      version: SURFACEOPS_MODEL_CATALOG_VERSION,
      entries: getSurfaceOpsModelCatalog(),
    };
  }

  function getState() {
    const preferences = preferencesStore.getPreferences();
    return {
      catalogVersion: preferences.catalogVersion || SURFACEOPS_MODEL_CATALOG_VERSION,
      hardwareProfile: preferences.hardwareProfile,
      activeModelId: preferences.activeModelId,
      installedModel: preferences.installedModel,
      installState: preferences.installState ?? createDefaultModelInstallState(),
      runtimeStatus: preferences.runtimeStatus,
      lastBenchmarkSummary: preferences.lastBenchmarkSummary,
    };
  }

  function emitState() {
    const nextState = getState();
    emitter.emit("state", nextState);
    return nextState;
  }

  function onStateChange(listener) {
    emitter.on("state", listener);
    return () => {
      emitter.off("state", listener);
    };
  }

  function updatePreferences(updater) {
    const next = preferencesStore.updatePreferences(updater);
    emitter.emit("state", {
      catalogVersion: next.catalogVersion,
      hardwareProfile: next.hardwareProfile,
      activeModelId: next.activeModelId,
      installedModel: next.installedModel,
      installState: next.installState,
      runtimeStatus: next.runtimeStatus,
      lastBenchmarkSummary: next.lastBenchmarkSummary,
    });
    return next;
  }

  function buildInstallState(overrides = {}) {
    const current = getState().installState ?? createDefaultModelInstallState();
    return {
      ...current,
      ...overrides,
      updatedAt: new Date().toISOString(),
    };
  }

  async function refreshHardwareProfile() {
    const hardwareProfile = detectSurfaceOpsHardwareProfile({ env });
    updatePreferences((current) => ({
      ...current,
      catalogVersion: SURFACEOPS_MODEL_CATALOG_VERSION,
      hardwareProfile,
    }));
    return emitState();
  }

  async function syncRuntimeStatus() {
    const state = getState();
    const installedModel = state.installedModel;
    if (!installedModel || !(await fileExists(installedModel.path))) {
      const runtimeStatus = await modeldController.start(null, null);
      updatePreferences((current) => ({
        ...current,
        activeModelId: null,
        runtimeStatus,
      }));
      return emitState();
    }

    const entry = getSurfaceOpsModelCatalogEntry(installedModel.modelId);
    if (!entry) {
      const runtimeStatus = await modeldController.start(null, null);
      updatePreferences((current) => ({
        ...current,
        activeModelId: null,
        installedModel: null,
        runtimeStatus,
      }));
      return emitState();
    }

    const runtimeStatus = await modeldController.start(entry, installedModel.path);
    updatePreferences((current) => ({
      ...current,
      activeModelId: entry.id,
      runtimeStatus,
    }));
    return emitState();
  }

  function getModelArtifactPath(entry, download) {
    return path.join(modelStorageRoot, entry.id, download.filename);
  }

  async function ensureDownloadedArtifact(entry, signal) {
    const download = resolveModelDownload(entry, modelDownloadOverrides);
    const destinationPath = getModelArtifactPath(entry, download);

    if (await fileExists(destinationPath)) {
      const existingHash = await hashFile(destinationPath);
      if (existingHash === download.sha256) {
        return {
          artifactPath: destinationPath,
          download,
        };
      }
      await fsp.rm(destinationPath, { force: true });
    }

    await downloadWithResume({
      url: download.downloadUrl,
      destinationPath,
      expectedSize: download.sizeBytes,
      signal,
      onProgress: ({ bytesDownloaded, totalBytes, resumable }) => {
        updatePreferences((current) => ({
          ...current,
          installState: buildInstallState({
            phase: "downloading",
            modelId: entry.id,
            progressPercent: totalBytes ? Number(((bytesDownloaded / totalBytes) * 100).toFixed(2)) : null,
            bytesDownloaded,
            totalBytes,
            resumable,
            errorMessage: null,
          }),
        }));
      },
    });

    updatePreferences((current) => ({
      ...current,
      installState: buildInstallState({
        phase: "verifying",
        modelId: entry.id,
        progressPercent: 100,
        bytesDownloaded: download.sizeBytes,
        totalBytes: download.sizeBytes,
        resumable: false,
        errorMessage: null,
      }),
    }));

    const downloadedHash = await hashFile(destinationPath);
    if (downloadedHash !== download.sha256) {
      await fsp.rm(destinationPath, { force: true });
      throw new Error(`Checksum mismatch for ${download.filename}.`);
    }

    return {
      artifactPath: destinationPath,
      download,
    };
  }

  async function removeInstalledModel(previousInstalledModel, nextPath) {
    if (!previousInstalledModel || previousInstalledModel.path === nextPath) {
      return;
    }
    await fsp.rm(previousInstalledModel.path, { force: true });
    await fsp.rm(path.dirname(previousInstalledModel.path), { recursive: true, force: true });
  }

  async function install(modelId) {
    const entry = getSurfaceOpsModelCatalogEntry(modelId);
    if (!entry) {
      throw new Error(`Unknown SurfaceOps model ${modelId}.`);
    }

    const hardwareProfile = detectSurfaceOpsHardwareProfile({ env });
    updatePreferences((current) => ({
      ...current,
      catalogVersion: SURFACEOPS_MODEL_CATALOG_VERSION,
      hardwareProfile,
      installState: buildInstallState({
        phase: "downloading",
        modelId: entry.id,
        progressPercent: 0,
        bytesDownloaded: 0,
        totalBytes: entry.sizeBytes,
        resumable: false,
        errorMessage: null,
      }),
    }));

    const previousInstalledModel = getState().installedModel;
    installAbortController = new AbortController();

    try {
      const preparedArtifact = await ensureDownloadedArtifact(entry, installAbortController.signal);
      updatePreferences((current) => ({
        ...current,
        installState: buildInstallState({
          phase: "warming",
          modelId: entry.id,
          progressPercent: 100,
          bytesDownloaded: preparedArtifact.download.sizeBytes,
          totalBytes: preparedArtifact.download.sizeBytes,
          resumable: false,
          errorMessage: null,
        }),
      }));

      const runtimeStatus = await modeldController.start(entry, preparedArtifact.artifactPath);
      if (runtimeStatus.phase !== "ready" || !runtimeStatus.healthy) {
        throw new Error(runtimeStatus.errorMessage || "SurfaceOps local runtime failed to start.");
      }

      updatePreferences((current) => ({
        ...current,
        catalogVersion: SURFACEOPS_MODEL_CATALOG_VERSION,
        activeModelId: entry.id,
        installedModel: {
          modelId: entry.id,
          path: preparedArtifact.artifactPath,
          sha256: preparedArtifact.download.sha256,
          sizeBytes: preparedArtifact.download.sizeBytes,
          installedAt: new Date().toISOString(),
        },
        installState: buildInstallState({
          phase: "ready",
          modelId: entry.id,
          progressPercent: 100,
          bytesDownloaded: preparedArtifact.download.sizeBytes,
          totalBytes: preparedArtifact.download.sizeBytes,
          resumable: false,
          errorMessage: null,
        }),
        runtimeStatus,
      }));

      await removeInstalledModel(previousInstalledModel, preparedArtifact.artifactPath);
      return emitState();
    } catch (error) {
      const isAbort = error?.name === "AbortError";
      updatePreferences((current) => ({
        ...current,
        installState: buildInstallState({
          phase: isAbort ? "cancelled" : "error",
          modelId: entry.id,
          errorMessage: isAbort ? "Install cancelled." : (error instanceof Error ? error.message : String(error)),
        }),
      }));
      throw error;
    } finally {
      installAbortController = null;
    }
  }

  async function cancelInstall() {
    installAbortController?.abort();
    updatePreferences((current) => ({
      ...current,
      installState: buildInstallState({
        phase: "cancelled",
        errorMessage: "Install cancelled.",
      }),
    }));
    return emitState();
  }

  async function replaceModel(modelId) {
    return install(modelId);
  }

  async function runBenchmark() {
    const state = getState();
    if (state.runtimeStatus.phase !== "ready" || !state.runtimeStatus.healthy || !state.activeModelId) {
      throw new Error("SurfaceOps local runtime is not ready for benchmarking.");
    }

    const benchmarkId = randomUUID();
    const startedAt = new Date().toISOString();
    const startedMs = Date.now();
    const response = await fetch(`${modeldController.baseUrl}/responses`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: state.activeModelId,
        input: "Reply with the exact text BENCHMARK_READY.",
      }),
    });
    const durationMs = Date.now() - startedMs;
    if (!response.ok) {
      throw new Error(`SurfaceOps benchmark failed with ${response.status}.`);
    }
    const payload = await response.json();
    const artifactPath = path.join(benchmarkRoot, `${benchmarkId}.json`);
    const summary = {
      benchmarkId,
      createdAt: startedAt,
      modelId: state.activeModelId,
      label: `${state.activeModelId} local benchmark`,
      durationMs,
      outputTokensPerSecond: null,
      promptTokens: null,
      completionTokens: null,
      artifactPath,
    };
    await fsp.mkdir(path.dirname(artifactPath), { recursive: true });
    await fsp.writeFile(
      artifactPath,
      JSON.stringify({
        summary,
        runtimeStatus: state.runtimeStatus,
        response: payload,
      }, null, 2),
      "utf8",
    );
    updatePreferences((current) => ({
      ...current,
      lastBenchmarkSummary: summary,
    }));
    return summary;
  }

  async function exportBenchmark() {
    const benchmark = getState().lastBenchmarkSummary;
    if (!benchmark) {
      return null;
    }

    const suggestedPath = path.join(exportRoot, path.basename(benchmark.artifactPath));
    let targetPath = suggestedPath;
    if (typeof options.showSaveDialog === "function") {
      const result = await options.showSaveDialog({
        defaultPath: suggestedPath,
      });
      if (result?.canceled || !result?.filePath) {
        return null;
      }
      targetPath = result.filePath;
    }

    await fsp.mkdir(path.dirname(targetPath), { recursive: true });
    await fsp.copyFile(benchmark.artifactPath, targetPath);
    return targetPath;
  }

  async function initialize() {
    await refreshHardwareProfile();
    return syncRuntimeStatus();
  }

  return {
    initialize,
    getState,
    getCatalog,
    install,
    cancelInstall,
    replaceModel,
    runBenchmark,
    exportBenchmark,
    refreshHardwareProfile,
    syncRuntimeStatus,
    onStateChange,
  };
}

module.exports = {
  buildHuggingFaceDownloadUrl,
  createSurfaceOpsModelController,
};
