const UPDATE_CHANNELS = Object.freeze(["alpha", "stable"]);
const UPDATE_PHASES = Object.freeze([
  "idle",
  "checking",
  "update-available",
  "update-downloaded",
  "error",
  "disabled",
]);
const UPDATE_CHECK_REASONS = Object.freeze(["startup", "focus", "interval", "manual"]);
const DEFAULT_UPDATE_CHANNEL = "alpha";
const DEFAULT_UPDATE_BASE_URL = "https://surfaceops.ai/api/desktop/updates";
const SURFACEOPS_MODEL_CATALOG_VERSION = "2026-03-18.v1";
const SURFACEOPS_DESKTOP_SETUP_PATH = "/desktop/setup";
const SURFACEOPS_DESKTOP_WORKBENCH_PATH = "/contracts/governance";
const SURFACEOPS_MODEL_BACKEND_FAMILIES = Object.freeze(["llama.cpp"]);
const SURFACEOPS_MODEL_INSTALL_PHASES = Object.freeze([
  "idle",
  "downloading",
  "verifying",
  "warming",
  "ready",
  "cancelled",
  "error",
]);
const SURFACEOPS_MODEL_RUNTIME_PHASES = Object.freeze([
  "unconfigured",
  "starting",
  "ready",
  "error",
]);
const SURFACEOPS_MODEL_CATALOG = Object.freeze([
  Object.freeze({
    id: "starter",
    label: "Qwen3 4B",
    summary: "Lowest memory footprint for first-run setup on 16 GB Apple Silicon Macs.",
    performanceTier: "Starter",
    quantization: "Q4_K_M",
    hfRepo: "ggml-org/Qwen3-4B-GGUF",
    hfRevision: "2f3b082b1356a6123f7ed71e65aea340da25d53c",
    filename: "Qwen3-4B-Q4_K_M.gguf",
    sha256: "ab27b9bfa375a178d6cba48f3ad892b94b7739659dcc7aae8058ce0ffed6b328",
    sizeBytes: 2497280640,
    minUnifiedMemoryGb: 16,
    recommendedRangeGb: Object.freeze({ min: 16, max: 23 }),
    backendFamily: "llama.cpp",
    licenseLabel: "Apache-2.0",
    licenseUrl: "https://huggingface.co/Qwen/Qwen3-4B",
    defaultContextTokens: 8192,
  }),
  Object.freeze({
    id: "balanced",
    label: "Qwen3 8B",
    summary: "Balanced local coding and contract-shaping model for 24 GB to 35 GB Apple Silicon Macs.",
    performanceTier: "Balanced",
    quantization: "Q4_K_M",
    hfRepo: "ggml-org/Qwen3-8B-GGUF",
    hfRevision: "2473489dc243ccaffb4ce569c55bf1df66b2088f",
    filename: "Qwen3-8B-Q4_K_M.gguf",
    sha256: "a67d87633b5f5f191a5bd11e6d37cab18b9ce3d4a6af6861561e8a767352080b",
    sizeBytes: 5027783872,
    minUnifiedMemoryGb: 24,
    recommendedRangeGb: Object.freeze({ min: 24, max: 35 }),
    backendFamily: "llama.cpp",
    licenseLabel: "Apache-2.0",
    licenseUrl: "https://huggingface.co/Qwen/Qwen3-8B",
    defaultContextTokens: 8192,
  }),
  Object.freeze({
    id: "quality",
    label: "gpt-oss 20B",
    summary: "Highest quality default for 36 GB and larger Apple Silicon Macs.",
    performanceTier: "Quality",
    quantization: "MXFP4",
    hfRepo: "ggml-org/gpt-oss-20b-GGUF",
    hfRevision: "e1dc459feff949ff451ce107337a2026daa80df8",
    filename: "gpt-oss-20b-mxfp4.gguf",
    sha256: "be37a636aca0fc1aae0d32325f82f6b4d21495f06823b5fbc1898ae0303e9935",
    sizeBytes: 12109566560,
    minUnifiedMemoryGb: 36,
    recommendedRangeGb: Object.freeze({ min: 36, max: null }),
    backendFamily: "llama.cpp",
    licenseLabel: "Apache-2.0",
    licenseUrl: "https://huggingface.co/openai/gpt-oss-20b",
    defaultContextTokens: 8192,
  }),
]);

function createDefaultUpdateStatus(overrides = {}) {
  return {
    currentVersion: "0.1.0",
    channel: DEFAULT_UPDATE_CHANNEL,
    phase: "idle",
    lastCheckedAt: null,
    lastCheckReason: null,
    availableVersion: null,
    downloadedVersion: null,
    releaseDate: null,
    releaseNotes: null,
    progressPercent: null,
    errorMessage: null,
    updateAvailable: false,
    updateDownloaded: false,
    ...overrides,
  };
}

function getSurfaceOpsModelCatalog() {
  return SURFACEOPS_MODEL_CATALOG.map((entry) => ({
    ...entry,
    recommendedRangeGb: { ...entry.recommendedRangeGb },
  }));
}

function getSurfaceOpsModelCatalogEntry(modelId) {
  return SURFACEOPS_MODEL_CATALOG.find((entry) => entry.id === modelId) ?? null;
}

function selectRecommendedSurfaceOpsModel(unifiedMemoryGb) {
  const memory = Number.parseInt(String(unifiedMemoryGb ?? ""), 10);
  if (!Number.isFinite(memory) || memory <= 0) {
    return SURFACEOPS_MODEL_CATALOG[0] ?? null;
  }

  for (const entry of SURFACEOPS_MODEL_CATALOG) {
    const { min, max } = entry.recommendedRangeGb;
    if (memory >= min && (max === null || memory <= max)) {
      return entry;
    }
  }

  return SURFACEOPS_MODEL_CATALOG.at(-1) ?? null;
}

function createDefaultModelInstallState(overrides = {}) {
  return {
    phase: "idle",
    modelId: null,
    progressPercent: null,
    bytesDownloaded: 0,
    totalBytes: null,
    errorMessage: null,
    resumable: false,
    updatedAt: null,
    ...overrides,
  };
}

function createDefaultRuntimeStatus(overrides = {}) {
  return {
    phase: "unconfigured",
    modelId: null,
    backendFamily: "llama.cpp",
    baseUrl: null,
    backendBaseUrl: null,
    healthy: false,
    errorMessage: null,
    updatedAt: null,
    ...overrides,
  };
}

function createDefaultModelState(overrides = {}) {
  return {
    catalogVersion: SURFACEOPS_MODEL_CATALOG_VERSION,
    hardwareProfile: {
      platform: "darwin-arm64",
      chip: "unknown",
      unifiedMemoryGb: 0,
      recommendedModelId: SURFACEOPS_MODEL_CATALOG[0]?.id ?? null,
      supported: false,
      reason: "Hardware profile not detected yet.",
      updatedAt: null,
    },
    activeModelId: null,
    installedModel: null,
    installState: createDefaultModelInstallState(),
    runtimeStatus: createDefaultRuntimeStatus(),
    lastBenchmarkSummary: null,
    ...overrides,
  };
}

module.exports = {
  UPDATE_CHANNELS,
  UPDATE_PHASES,
  UPDATE_CHECK_REASONS,
  DEFAULT_UPDATE_CHANNEL,
  DEFAULT_UPDATE_BASE_URL,
  createDefaultUpdateStatus,
  SURFACEOPS_MODEL_CATALOG_VERSION,
  SURFACEOPS_DESKTOP_SETUP_PATH,
  SURFACEOPS_DESKTOP_WORKBENCH_PATH,
  SURFACEOPS_MODEL_BACKEND_FAMILIES,
  SURFACEOPS_MODEL_INSTALL_PHASES,
  SURFACEOPS_MODEL_RUNTIME_PHASES,
  SURFACEOPS_MODEL_CATALOG,
  getSurfaceOpsModelCatalog,
  getSurfaceOpsModelCatalogEntry,
  selectRecommendedSurfaceOpsModel,
  createDefaultModelInstallState,
  createDefaultRuntimeStatus,
  createDefaultModelState,
};
