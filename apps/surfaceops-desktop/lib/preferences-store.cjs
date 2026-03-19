const fs = require("node:fs");
const path = require("node:path");
const {
  DEFAULT_UPDATE_CHANNEL,
  UPDATE_CHANNELS,
  SURFACEOPS_MODEL_CATALOG_VERSION,
  createDefaultModelInstallState,
  createDefaultModelState,
  createDefaultRuntimeStatus,
} = require("@surfaces/surfaceops-desktop-bridge");

function isValidUpdateChannel(value) {
  return UPDATE_CHANNELS.includes(value);
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeRecommendedRange(value) {
  if (!isRecord(value)) {
    return null;
  }

  const min = Number.parseInt(String(value.min ?? ""), 10);
  if (!Number.isFinite(min) || min <= 0) {
    return null;
  }

  const maxCandidate = value.max;
  const max = maxCandidate === null
    ? null
    : Number.parseInt(String(maxCandidate ?? ""), 10);

  return {
    min,
    max: Number.isFinite(max) && max > 0 ? max : null,
  };
}

function normalizeHardwareProfile(value, fallbackModelId) {
  const fallback = createDefaultModelState().hardwareProfile;
  if (!isRecord(value)) {
    return {
      ...fallback,
      recommendedModelId: fallbackModelId ?? fallback.recommendedModelId,
    };
  }

  const unifiedMemoryGb = Number.parseInt(String(value.unifiedMemoryGb ?? ""), 10);
  return {
    platform: value.platform === "darwin-arm64" ? "darwin-arm64" : fallback.platform,
    chip: typeof value.chip === "string" && value.chip.trim() ? value.chip.trim() : fallback.chip,
    unifiedMemoryGb: Number.isFinite(unifiedMemoryGb) && unifiedMemoryGb > 0 ? unifiedMemoryGb : fallback.unifiedMemoryGb,
    recommendedModelId:
      typeof value.recommendedModelId === "string" && value.recommendedModelId.trim()
        ? value.recommendedModelId.trim()
        : fallbackModelId ?? fallback.recommendedModelId,
    supported: value.supported === true,
    reason: typeof value.reason === "string" ? value.reason : fallback.reason,
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : fallback.updatedAt,
  };
}

function normalizeInstalledModel(value) {
  if (!isRecord(value)) {
    return null;
  }

  if (
    typeof value.modelId !== "string"
    || !value.modelId.trim()
    || typeof value.path !== "string"
    || !value.path.trim()
    || typeof value.sha256 !== "string"
    || !value.sha256.trim()
  ) {
    return null;
  }

  const sizeBytes = Number.parseInt(String(value.sizeBytes ?? ""), 10);
  return {
    modelId: value.modelId.trim(),
    path: value.path.trim(),
    sha256: value.sha256.trim(),
    sizeBytes: Number.isFinite(sizeBytes) && sizeBytes >= 0 ? sizeBytes : 0,
    installedAt: typeof value.installedAt === "string" ? value.installedAt : new Date().toISOString(),
  };
}

function normalizeInstallState(value) {
  const fallback = createDefaultModelInstallState();
  if (!isRecord(value)) {
    return fallback;
  }

  const progressPercent = Number.parseFloat(String(value.progressPercent ?? ""));
  const bytesDownloaded = Number.parseInt(String(value.bytesDownloaded ?? ""), 10);
  const totalBytes = Number.parseInt(String(value.totalBytes ?? ""), 10);
  const phase = typeof value.phase === "string" ? value.phase : fallback.phase;

  return {
    ...fallback,
    phase,
    modelId: typeof value.modelId === "string" ? value.modelId : fallback.modelId,
    progressPercent: Number.isFinite(progressPercent) ? progressPercent : fallback.progressPercent,
    bytesDownloaded: Number.isFinite(bytesDownloaded) && bytesDownloaded >= 0 ? bytesDownloaded : fallback.bytesDownloaded,
    totalBytes: Number.isFinite(totalBytes) && totalBytes >= 0 ? totalBytes : fallback.totalBytes,
    errorMessage: typeof value.errorMessage === "string" ? value.errorMessage : fallback.errorMessage,
    resumable: value.resumable === true,
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : fallback.updatedAt,
  };
}

function normalizeRuntimeStatus(value) {
  const fallback = createDefaultRuntimeStatus();
  if (!isRecord(value)) {
    return fallback;
  }

  const phase = typeof value.phase === "string" ? value.phase : fallback.phase;
  return {
    ...fallback,
    phase,
    modelId: typeof value.modelId === "string" ? value.modelId : fallback.modelId,
    backendFamily: value.backendFamily === "llama.cpp" ? "llama.cpp" : fallback.backendFamily,
    baseUrl: typeof value.baseUrl === "string" ? value.baseUrl : fallback.baseUrl,
    backendBaseUrl: typeof value.backendBaseUrl === "string" ? value.backendBaseUrl : fallback.backendBaseUrl,
    healthy: value.healthy === true,
    errorMessage: typeof value.errorMessage === "string" ? value.errorMessage : fallback.errorMessage,
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : fallback.updatedAt,
  };
}

function normalizeBenchmarkSummary(value) {
  if (!isRecord(value)) {
    return null;
  }

  if (
    typeof value.benchmarkId !== "string"
    || !value.benchmarkId.trim()
    || typeof value.modelId !== "string"
    || !value.modelId.trim()
    || typeof value.label !== "string"
    || !value.label.trim()
    || typeof value.artifactPath !== "string"
    || !value.artifactPath.trim()
  ) {
    return null;
  }

  const durationMs = Number.parseInt(String(value.durationMs ?? ""), 10);
  const outputTokensPerSecond = Number.parseFloat(String(value.outputTokensPerSecond ?? ""));
  const promptTokens = Number.parseInt(String(value.promptTokens ?? ""), 10);
  const completionTokens = Number.parseInt(String(value.completionTokens ?? ""), 10);

  return {
    benchmarkId: value.benchmarkId.trim(),
    createdAt: typeof value.createdAt === "string" ? value.createdAt : new Date().toISOString(),
    modelId: value.modelId.trim(),
    label: value.label.trim(),
    durationMs: Number.isFinite(durationMs) && durationMs >= 0 ? durationMs : 0,
    outputTokensPerSecond: Number.isFinite(outputTokensPerSecond) ? outputTokensPerSecond : null,
    promptTokens: Number.isFinite(promptTokens) && promptTokens >= 0 ? promptTokens : null,
    completionTokens: Number.isFinite(completionTokens) && completionTokens >= 0 ? completionTokens : null,
    artifactPath: value.artifactPath.trim(),
  };
}

function normalizePreferences(rawPreferences, defaultUpdateChannel) {
  const fallbackState = createDefaultModelState();
  const hardwareProfile = normalizeHardwareProfile(
    rawPreferences.hardwareProfile,
    fallbackState.hardwareProfile.recommendedModelId,
  );
  return {
    updateChannel: isValidUpdateChannel(rawPreferences.updateChannel)
      ? rawPreferences.updateChannel
      : defaultUpdateChannel,
    catalogVersion:
      typeof rawPreferences.catalogVersion === "string" && rawPreferences.catalogVersion.trim()
        ? rawPreferences.catalogVersion.trim()
        : SURFACEOPS_MODEL_CATALOG_VERSION,
    hardwareProfile,
    activeModelId:
      typeof rawPreferences.activeModelId === "string" && rawPreferences.activeModelId.trim()
        ? rawPreferences.activeModelId.trim()
        : null,
    installedModel: normalizeInstalledModel(rawPreferences.installedModel),
    installState: normalizeInstallState(rawPreferences.installState),
    runtimeStatus: normalizeRuntimeStatus(rawPreferences.runtimeStatus),
    lastBenchmarkSummary: normalizeBenchmarkSummary(rawPreferences.lastBenchmarkSummary),
    updatedAt: typeof rawPreferences.updatedAt === "string" ? rawPreferences.updatedAt : null,
  };
}

function createSurfaceOpsDesktopPreferencesStore({
  filePath,
  defaultUpdateChannel = DEFAULT_UPDATE_CHANNEL,
} = {}) {
  const preferencesPath = path.resolve(filePath ?? "surfaceops-desktop-preferences.json");

  function readRawPreferences() {
    try {
      const raw = fs.readFileSync(preferencesPath, "utf8");
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  function getPreferences() {
    const rawPreferences = readRawPreferences();
    return normalizePreferences(rawPreferences, defaultUpdateChannel);
  }

  function getUpdateChannel() {
    return getPreferences().updateChannel;
  }

  function updatePreferences(updater) {
    const currentPreferences = getPreferences();
    const nextPreferences = typeof updater === "function"
      ? updater(currentPreferences)
      : {
          ...currentPreferences,
          ...(isRecord(updater) ? updater : {}),
        };

    const normalized = normalizePreferences(
      {
        ...currentPreferences,
        ...(isRecord(nextPreferences) ? nextPreferences : {}),
        updatedAt: new Date().toISOString(),
      },
      defaultUpdateChannel,
    );

    fs.mkdirSync(path.dirname(preferencesPath), { recursive: true });
    fs.writeFileSync(preferencesPath, JSON.stringify(normalized, null, 2), "utf8");
    return normalized;
  }

  function setUpdateChannel(updateChannel) {
    if (!isValidUpdateChannel(updateChannel)) {
      throw new Error(`Unsupported SurfaceOps update channel: ${updateChannel}`);
    }

    return updatePreferences((currentPreferences) => ({
      ...currentPreferences,
      updateChannel,
    }));
  }

  return {
    filePath: preferencesPath,
    getPreferences,
    getUpdateChannel,
    updatePreferences,
    setUpdateChannel,
  };
}

module.exports = {
  createSurfaceOpsDesktopPreferencesStore,
};
