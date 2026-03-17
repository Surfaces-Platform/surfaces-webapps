export type SurfaceOpsUpdateChannel = "alpha" | "stable";
export type SurfaceOpsUpdatePhase =
  | "idle"
  | "checking"
  | "update-available"
  | "update-downloaded"
  | "error"
  | "disabled";
export type SurfaceOpsUpdateCheckReason = "startup" | "focus" | "interval" | "manual";

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

export interface SurfaceOpsDesktopUpdateBridge {
  getStatus(): Promise<SurfaceOpsUpdateStatus>;
  checkForUpdates(): Promise<SurfaceOpsUpdateStatus>;
  restartToUpdate(): Promise<boolean>;
  setChannel(channel: SurfaceOpsUpdateChannel): Promise<SurfaceOpsUpdateStatus>;
  onStatusChange(listener: (status: SurfaceOpsUpdateStatus) => void): () => void;
}

export interface SurfaceOpsDesktopBridge {
  platform: string;
  channel: SurfaceOpsUpdateChannel;
  isDesktopRuntime: boolean;
  updates: SurfaceOpsDesktopUpdateBridge;
}

export declare const UPDATE_CHANNELS: readonly SurfaceOpsUpdateChannel[];
export declare const UPDATE_PHASES: readonly SurfaceOpsUpdatePhase[];
export declare const UPDATE_CHECK_REASONS: readonly SurfaceOpsUpdateCheckReason[];
export declare const DEFAULT_UPDATE_CHANNEL: SurfaceOpsUpdateChannel;
export declare const DEFAULT_UPDATE_BASE_URL: string;
export declare function createDefaultUpdateStatus(
  overrides?: Partial<SurfaceOpsUpdateStatus>,
): SurfaceOpsUpdateStatus;
