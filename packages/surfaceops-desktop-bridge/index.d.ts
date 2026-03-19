export type SurfaceOpsUpdateChannel = "alpha" | "stable";
export type SurfaceOpsUpdatePhase =
  | "idle"
  | "checking"
  | "update-available"
  | "update-downloaded"
  | "error"
  | "disabled";
export type SurfaceOpsUpdateCheckReason = "startup" | "focus" | "interval" | "manual";
export type SurfaceOpsModelBackendFamily = "llama.cpp";
export type SurfaceOpsModelInstallPhase =
  | "idle"
  | "downloading"
  | "verifying"
  | "warming"
  | "ready"
  | "cancelled"
  | "error";
export type SurfaceOpsRuntimePhase = "unconfigured" | "starting" | "ready" | "error";

export interface SurfaceOpsUpdateStatus {
  currentVersion: string;
  channel: SurfaceOpsUpdateChannel;
  phase: SurfaceOpsUpdatePhase;
  lastCheckedAt: string | null;
  lastCheckReason: SurfaceOpsUpdateCheckReason | null;
  availableVersion: string | null;
  downloadedVersion: string | null;
  releaseDate: string | null;
  releaseNotes: string | null;
  progressPercent: number | null;
  errorMessage: string | null;
  updateAvailable: boolean;
  updateDownloaded: boolean;
}

export interface SurfaceOpsHardwareProfile {
  platform: "darwin-arm64";
  chip: string;
  unifiedMemoryGb: number;
  recommendedModelId: string | null;
  supported: boolean;
  reason: string | null;
  updatedAt: string | null;
}

export interface SurfaceOpsModelCatalogEntry {
  id: string;
  label: string;
  summary: string;
  performanceTier: string;
  quantization: string;
  hfRepo: string;
  hfRevision: string;
  filename: string;
  sha256: string;
  sizeBytes: number;
  minUnifiedMemoryGb: number;
  recommendedRangeGb: {
    min: number;
    max: number | null;
  };
  backendFamily: SurfaceOpsModelBackendFamily;
  licenseLabel: string;
  licenseUrl: string;
  defaultContextTokens: number;
}

export interface SurfaceOpsInstalledModel {
  modelId: string;
  path: string;
  sha256: string;
  sizeBytes: number;
  installedAt: string;
}

export interface SurfaceOpsModelInstallState {
  phase: SurfaceOpsModelInstallPhase;
  modelId: string | null;
  progressPercent: number | null;
  bytesDownloaded: number;
  totalBytes: number | null;
  errorMessage: string | null;
  resumable: boolean;
  updatedAt: string | null;
}

export interface SurfaceOpsRuntimeStatus {
  phase: SurfaceOpsRuntimePhase;
  modelId: string | null;
  backendFamily: SurfaceOpsModelBackendFamily;
  baseUrl: string | null;
  backendBaseUrl: string | null;
  healthy: boolean;
  errorMessage: string | null;
  updatedAt: string | null;
}

export interface SurfaceOpsBenchmarkSummary {
  benchmarkId: string;
  createdAt: string;
  modelId: string;
  label: string;
  durationMs: number;
  outputTokensPerSecond: number | null;
  promptTokens: number | null;
  completionTokens: number | null;
  artifactPath: string;
}

export interface SurfaceOpsModelState {
  catalogVersion: string;
  hardwareProfile: SurfaceOpsHardwareProfile;
  activeModelId: string | null;
  installedModel: SurfaceOpsInstalledModel | null;
  installState: SurfaceOpsModelInstallState;
  runtimeStatus: SurfaceOpsRuntimeStatus;
  lastBenchmarkSummary: SurfaceOpsBenchmarkSummary | null;
}

export interface SurfaceOpsModelCatalog {
  version: string;
  entries: SurfaceOpsModelCatalogEntry[];
}

export interface SurfaceOpsDesktopUpdateBridge {
  getStatus(): Promise<SurfaceOpsUpdateStatus>;
  checkForUpdates(): Promise<SurfaceOpsUpdateStatus>;
  restartToUpdate(): Promise<boolean>;
  setChannel(channel: SurfaceOpsUpdateChannel): Promise<SurfaceOpsUpdateStatus>;
  onStatusChange(listener: (status: SurfaceOpsUpdateStatus) => void): () => void;
}

export interface SurfaceOpsDesktopModelsBridge {
  getState(): Promise<SurfaceOpsModelState>;
  getCatalog(): Promise<SurfaceOpsModelCatalog>;
  install(modelId: string): Promise<SurfaceOpsModelState>;
  cancelInstall(): Promise<SurfaceOpsModelState>;
  replaceModel(modelId: string): Promise<SurfaceOpsModelState>;
  runBenchmark(): Promise<SurfaceOpsBenchmarkSummary>;
  exportBenchmark(): Promise<string | null>;
  onStateChange(listener: (state: SurfaceOpsModelState) => void): () => void;
}

export interface SurfaceOpsDesktopBridge {
  platform: string;
  channel: SurfaceOpsUpdateChannel;
  isDesktopRuntime: boolean;
  updates: SurfaceOpsDesktopUpdateBridge;
  models: SurfaceOpsDesktopModelsBridge;
}

export declare const UPDATE_CHANNELS: readonly SurfaceOpsUpdateChannel[];
export declare const UPDATE_PHASES: readonly SurfaceOpsUpdatePhase[];
export declare const UPDATE_CHECK_REASONS: readonly SurfaceOpsUpdateCheckReason[];
export declare const DEFAULT_UPDATE_CHANNEL: SurfaceOpsUpdateChannel;
export declare const DEFAULT_UPDATE_BASE_URL: string;
export declare const SURFACEOPS_MODEL_CATALOG_VERSION: string;
export declare const SURFACEOPS_DESKTOP_SETUP_PATH: string;
export declare const SURFACEOPS_DESKTOP_WORKBENCH_PATH: string;
export declare const SURFACEOPS_MODEL_BACKEND_FAMILIES: readonly SurfaceOpsModelBackendFamily[];
export declare const SURFACEOPS_MODEL_INSTALL_PHASES: readonly SurfaceOpsModelInstallPhase[];
export declare const SURFACEOPS_MODEL_RUNTIME_PHASES: readonly SurfaceOpsRuntimePhase[];
export declare const SURFACEOPS_MODEL_CATALOG: readonly SurfaceOpsModelCatalogEntry[];
export declare function createDefaultUpdateStatus(
  overrides?: Partial<SurfaceOpsUpdateStatus>,
): SurfaceOpsUpdateStatus;
export declare function getSurfaceOpsModelCatalog(): SurfaceOpsModelCatalogEntry[];
export declare function getSurfaceOpsModelCatalogEntry(modelId: string): SurfaceOpsModelCatalogEntry | null;
export declare function selectRecommendedSurfaceOpsModel(unifiedMemoryGb: number): SurfaceOpsModelCatalogEntry | null;
export declare function createDefaultModelInstallState(
  overrides?: Partial<SurfaceOpsModelInstallState>,
): SurfaceOpsModelInstallState;
export declare function createDefaultRuntimeStatus(
  overrides?: Partial<SurfaceOpsRuntimeStatus>,
): SurfaceOpsRuntimeStatus;
export declare function createDefaultModelState(
  overrides?: Partial<SurfaceOpsModelState>,
): SurfaceOpsModelState;
