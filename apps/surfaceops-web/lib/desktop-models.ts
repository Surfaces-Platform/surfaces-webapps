import fs from "node:fs";
import path from "node:path";
import {
  SURFACEOPS_DESKTOP_SETUP_PATH,
  SURFACEOPS_DESKTOP_WORKBENCH_PATH,
  createDefaultModelState,
  getSurfaceOpsModelCatalog,
  type SurfaceOpsModelCatalogEntry,
  type SurfaceOpsModelState,
} from "@surfaces/surfaceops-desktop-bridge";

function isDesktopRuntimeEnabled() {
  return process.env.SURFACEOPS_DESKTOP_RUNTIME === "1";
}

function parseJsonFile<T>(filePath: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch {
    return null;
  }
}

export function loadSurfaceOpsDesktopModelState(): SurfaceOpsModelState {
  const preferencesPath = process.env.SURFACEOPS_DESKTOP_PREFERENCES_PATH?.trim();
  if (!preferencesPath) {
    return createDefaultModelState();
  }

  const absolutePath = path.resolve(preferencesPath);
  if (!fs.existsSync(absolutePath)) {
    return createDefaultModelState();
  }

  const parsed = parseJsonFile<SurfaceOpsModelState>(absolutePath);
  if (!parsed) {
    return createDefaultModelState();
  }

  return {
    ...createDefaultModelState(),
    ...parsed,
    hardwareProfile: {
      ...createDefaultModelState().hardwareProfile,
      ...(parsed.hardwareProfile ?? {}),
    },
    installState: {
      ...createDefaultModelState().installState,
      ...(parsed.installState ?? {}),
    },
    runtimeStatus: {
      ...createDefaultModelState().runtimeStatus,
      ...(parsed.runtimeStatus ?? {}),
    },
  };
}

export function isSurfaceOpsDesktopSetupRequired(): boolean {
  if (!isDesktopRuntimeEnabled()) {
    return false;
  }

  const state = loadSurfaceOpsDesktopModelState();
  if (!state.hardwareProfile.supported) {
    return true;
  }
  if (!state.installedModel || !state.activeModelId) {
    return true;
  }
  return state.runtimeStatus.phase !== "ready" || !state.runtimeStatus.healthy;
}

export function resolveSurfaceOpsDesktopEntryPath(): string {
  if (!isDesktopRuntimeEnabled()) {
    return SURFACEOPS_DESKTOP_WORKBENCH_PATH;
  }
  return isSurfaceOpsDesktopSetupRequired()
    ? SURFACEOPS_DESKTOP_SETUP_PATH
    : SURFACEOPS_DESKTOP_WORKBENCH_PATH;
}

export function loadSurfaceOpsDesktopModelCatalog(): SurfaceOpsModelCatalogEntry[] {
  return getSurfaceOpsModelCatalog();
}
