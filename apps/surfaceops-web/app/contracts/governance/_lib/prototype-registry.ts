import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import type { SurfaceContract } from "./types";

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
  extractionContract: unknown;
  extractionReport: unknown;
  latestExtractionReport: unknown;
  latestExtractionUpdatedAt: string;
  requestedPrototypeId: string | null;
  usedFallback: boolean;
}

function readJson<T>(filePath: string): T {
  const raw = readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as T;
}

function resolveWorkspaceRoot(): string {
  const cwd = process.cwd();
  const candidates = [
    cwd,
    path.resolve(cwd, ".."),
    path.resolve(cwd, "..", ".."),
  ];
  for (const candidate of candidates) {
    const manifestPath = path.join(
      candidate,
      "apps",
      "surfaceops-web",
      "prototypes",
      "governance",
      "manifest.json",
    );
    if (existsSync(manifestPath)) {
      return candidate;
    }
  }
  throw new Error("Could not resolve workspace root for governance prototype registry.");
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

export function loadGovernancePrototypeSelection(
  requestedPrototypeId: string | null,
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
  const latestExtractionReport = hasLatestExtraction
    ? readJson<unknown>(latestExtractionPath)
    : selectedExtractionReport;
  const latestExtractionUpdatedAt = hasLatestExtraction
    ? statSync(latestExtractionPath).mtime.toISOString()
    : "snapshot-only";

  return {
    workspaceRoot,
    manifest,
    selected,
    requestedPrototypeId,
    usedFallback,
    seedContract: readJson<SurfaceContract>(seedContractPath),
    extractionContract: readJson<unknown>(extractionContractPath),
    extractionReport: selectedExtractionReport,
    latestExtractionReport,
    latestExtractionUpdatedAt,
  };
}
