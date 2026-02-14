import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import {
  ensureGovernancePersistence,
  readApplyLog,
  readContractDraft,
  readDecisionLog,
  readSnapshotExtraction,
  readSnapshotIndex,
} from "./governance-persistence";
import type {
  GovernanceApplyRecord,
  GovernanceDecisionRecord,
  GovernanceSnapshotIndex,
  SurfaceContract,
} from "./types";
import { resolveWorkspaceRoot } from "./workspace-root";

export type PrototypeStatus = "active" | "archived" | "experimental";

export interface GovernancePrototypeEntry {
  id: string;
  title: string;
  createdAt: string;
  status: PrototypeStatus;
  summary: string;
  sourcePaths: string[];
  seedContractPath: string;
  extractionPaths: {
    contract: string;
    report: string;
  };
  notesPath: string;
}

export interface GovernancePrototypeManifest {
  schemaVersion: 1;
  activePrototypeId: string;
  prototypes: GovernancePrototypeEntry[];
}

export interface GovernancePrototypeSelection {
  workspaceRoot: string;
  manifest: GovernancePrototypeManifest;
  selected: GovernancePrototypeEntry;
  seedContract: SurfaceContract;
  draftContract: SurfaceContract;
  extractionContract: unknown;
  extractionReport: unknown;
  selectedSnapshotId: string;
  selectedSnapshotCreatedAt: string;
  selectedSnapshotReport: unknown;
  baselineSnapshotId: string;
  baselineSnapshotReport: unknown;
  snapshotTimeline: Array<{ snapshotId: string; createdAt: string }>;
  snapshotIndex: GovernanceSnapshotIndex | null;
  decisions: GovernanceDecisionRecord[];
  applies: GovernanceApplyRecord[];
  latestExtractionUpdatedAt: string;
  requestedPrototypeId: string | null;
  requestedSnapshotId: string | null;
  usedFallback: boolean;
  canWrite: boolean;
}

type ExtractionShape = {
  extracted?: {
    routes?: unknown[];
    designSystemComponents?: unknown[];
    authAware?: boolean;
  };
};

function readJson<T>(filePath: string): T {
  const raw = readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as T;
}

function validateManifest(manifest: GovernancePrototypeManifest): void {
  if (manifest.schemaVersion !== 1) {
    throw new Error("Unsupported governance prototype manifest schemaVersion.");
  }
  if (!Array.isArray(manifest.prototypes) || manifest.prototypes.length === 0) {
    throw new Error("Governance prototype manifest must include at least one prototype.");
  }
  const ids = new Set<string>();
  for (const prototype of manifest.prototypes) {
    if (!/^p\d{4}$/.test(prototype.id)) {
      throw new Error(`Invalid prototype id: ${prototype.id}`);
    }
    if (ids.has(prototype.id)) {
      throw new Error(`Duplicate prototype id: ${prototype.id}`);
    }
    ids.add(prototype.id);
  }
  if (!ids.has(manifest.activePrototypeId)) {
    throw new Error("activePrototypeId must reference an existing prototype.");
  }
}

function fallbackSelection(
  selectedExtractionReport: unknown,
): {
  selectedSnapshotId: string;
  selectedSnapshotCreatedAt: string;
  selectedSnapshotReport: unknown;
  baselineSnapshotId: string;
  baselineSnapshotReport: unknown;
  snapshotTimeline: Array<{ snapshotId: string; createdAt: string }>;
} {
  const now = new Date().toISOString();
  return {
    selectedSnapshotId: "seed-snapshot",
    selectedSnapshotCreatedAt: now,
    selectedSnapshotReport: selectedExtractionReport,
    baselineSnapshotId: "seed-snapshot",
    baselineSnapshotReport: selectedExtractionReport,
    snapshotTimeline: [{ snapshotId: "seed-snapshot", createdAt: now }],
  };
}

export function loadGovernancePrototypeSelection(
  requestedPrototypeId: string | null,
  requestedSnapshotId: string | null,
): GovernancePrototypeSelection {
  const workspaceRoot = resolveWorkspaceRoot();
  const manifestPath = path.join(
    workspaceRoot,
    "apps",
    "surfaceops-web",
    "prototypes",
    "governance",
    "manifest.json",
  );
  const manifest = readJson<GovernancePrototypeManifest>(manifestPath);
  validateManifest(manifest);

  const selected =
    (requestedPrototypeId
      ? manifest.prototypes.find((entry) => entry.id === requestedPrototypeId)
      : undefined) ??
    manifest.prototypes.find((entry) => entry.id === manifest.activePrototypeId)!;

  const usedFallback = requestedPrototypeId !== null && selected.id !== requestedPrototypeId;

  const seedContractPath = path.join(workspaceRoot, selected.seedContractPath);
  const extractionContractPath = path.join(workspaceRoot, selected.extractionPaths.contract);
  const extractionReportPath = path.join(workspaceRoot, selected.extractionPaths.report);
  const selectedExtractionReport = readJson<unknown>(extractionReportPath);
  const latestExtractionPath = path.join(
    workspaceRoot,
    "contracts",
    "generated",
    "surfaces-web.extraction.json",
  );
  const hasLatestExtraction = existsSync(latestExtractionPath);
  const latestExtractionUpdatedAt = hasLatestExtraction
    ? statSync(latestExtractionPath).mtime.toISOString()
    : "snapshot-only";

  const canWrite = selected.id === "p0004";
  let snapshotIndex: GovernanceSnapshotIndex | null = null;
  let decisions: GovernanceDecisionRecord[] = [];
  let applies: GovernanceApplyRecord[] = [];
  let draftContract = readJson<SurfaceContract>(seedContractPath);
  let selectedSnapshotId: string;
  let selectedSnapshotCreatedAt: string;
  let selectedSnapshotReport: unknown;
  let baselineSnapshotId: string;
  let baselineSnapshotReport: unknown;
  let snapshotTimeline: Array<{ snapshotId: string; createdAt: string }>;

  if (canWrite) {
    const paths = ensureGovernancePersistence(workspaceRoot, selected);
    snapshotIndex = readSnapshotIndex(paths.snapshotIndexPath);
    decisions = readDecisionLog(paths.decisionsPath).decisions;
    applies = readApplyLog(paths.appliesPath).applies;
    draftContract = readContractDraft(paths.draftContractPath);

    const defaultSelectedSnapshotId = snapshotIndex.latestSnapshotId ?? snapshotIndex.baselineSnapshotId;
    if (!defaultSelectedSnapshotId) {
      throw new Error("No snapshots available for p0004.");
    }
    const selectedId =
      requestedSnapshotId && snapshotIndex.entries[requestedSnapshotId]
        ? requestedSnapshotId
        : defaultSelectedSnapshotId;
    const baselineId = snapshotIndex.baselineSnapshotId ?? selectedId;
    const selectedEntry = snapshotIndex.entries[selectedId];
    if (!selectedEntry) {
      throw new Error(`Snapshot not found: ${selectedId}`);
    }
    selectedSnapshotId = selectedId;
    selectedSnapshotCreatedAt = selectedEntry.createdAt;
    selectedSnapshotReport = readSnapshotExtraction(paths.prototypeDir, snapshotIndex, selectedId);
    baselineSnapshotId = baselineId;
    baselineSnapshotReport = readSnapshotExtraction(paths.prototypeDir, snapshotIndex, baselineId);
    snapshotTimeline = [...snapshotIndex.snapshotIds]
      .reverse()
      .map((snapshotId) => ({
        snapshotId,
        createdAt: snapshotIndex!.entries[snapshotId]?.createdAt ?? "",
      }))
      .filter((entry) => Boolean(entry.createdAt));
  } else {
    const fallback = fallbackSelection(selectedExtractionReport);
    selectedSnapshotId = fallback.selectedSnapshotId;
    selectedSnapshotCreatedAt = fallback.selectedSnapshotCreatedAt;
    selectedSnapshotReport = fallback.selectedSnapshotReport;
    baselineSnapshotId = fallback.baselineSnapshotId;
    baselineSnapshotReport = fallback.baselineSnapshotReport;
    snapshotTimeline = fallback.snapshotTimeline;
  }

  return {
    workspaceRoot,
    manifest,
    selected,
    requestedPrototypeId,
    requestedSnapshotId,
    usedFallback,
    seedContract: readJson<SurfaceContract>(seedContractPath),
    draftContract,
    extractionContract: readJson<unknown>(extractionContractPath),
    extractionReport: selectedExtractionReport as ExtractionShape,
    selectedSnapshotId,
    selectedSnapshotCreatedAt,
    selectedSnapshotReport,
    baselineSnapshotId,
    baselineSnapshotReport,
    snapshotTimeline,
    snapshotIndex,
    decisions,
    applies,
    latestExtractionUpdatedAt,
    canWrite,
  };
}
