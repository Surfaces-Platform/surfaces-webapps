import fs from "node:fs";
import path from "node:path";
import type {
  GovernanceApplyLog,
  GovernanceApplyRecord,
  GovernanceDecisionAction,
  GovernanceDecisionLog,
  GovernanceDecisionRecord,
  GovernanceInspectorBaselineLog,
  GovernanceInspectorBaselineRecord,
  GovernanceSnapshotIndex,
  SurfaceContract,
} from "./types";

type PrototypeEntry = {
  id: string;
  seedContractPath: string;
  extractionPaths: {
    report: string;
  };
};

type ExtractionSnapshot = {
  extracted?: {
    authAware?: boolean;
    hasShell?: boolean;
  };
};

type GovernancePaths = {
  prototypeDir: string;
  draftContractPath: string;
  seedContractPath: string;
  latestExtractionPath: string;
  generatedExtractionPath: string;
  snapshotsDir: string;
  snapshotIndexPath: string;
  decisionsPath: string;
  appliesPath: string;
  inspectorBaselinesPath: string;
};

const WRITABLE_PROTOTYPE_ID = "p0004";

export function normalizeActor(actor: unknown): string {
  if (typeof actor !== "string") return "local-user";
  const trimmed = actor.trim();
  return trimmed.length > 0 ? trimmed : "local-user";
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
}

function writeJsonAtomic(filePath: string, value: unknown): void {
  const payload = `${JSON.stringify(value, null, 2)}\n`;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temp = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(temp, payload, "utf-8");
  fs.renameSync(temp, filePath);
}

function makePaths(workspaceRoot: string, selected: PrototypeEntry): GovernancePaths {
  const prototypeDir = path.join(
    workspaceRoot,
    "apps",
    "surfaceops-web",
    "prototypes",
    "governance",
    selected.id,
  );
  return {
    prototypeDir,
    draftContractPath: path.join(prototypeDir, "contract.draft.json"),
    seedContractPath: path.join(workspaceRoot, selected.seedContractPath),
    latestExtractionPath: path.join(workspaceRoot, selected.extractionPaths.report),
    generatedExtractionPath: path.join(
      workspaceRoot,
      "contracts",
      "generated",
      "surfaces-web.extraction.json",
    ),
    snapshotsDir: path.join(prototypeDir, "snapshots"),
    snapshotIndexPath: path.join(prototypeDir, "snapshot-index.json"),
    decisionsPath: path.join(prototypeDir, "decisions.json"),
    appliesPath: path.join(prototypeDir, "applies.json"),
    inspectorBaselinesPath: path.join(prototypeDir, "inspector-baselines.json"),
  };
}

function timestampString(date: Date): string {
  const iso = date.toISOString();
  return iso.replace(/[-:]/g, "").replace(".", "").replace("Z", "Z");
}

export function assertWritablePrototype(prototypeId: string): void {
  if (prototypeId !== WRITABLE_PROTOTYPE_ID) {
    throw new Error("Writes are only supported for p0004.");
  }
}

function seedSnapshotFromLatestExtraction(
  paths: GovernancePaths,
  prototypeId: string,
): GovernanceSnapshotIndex {
  const snapshotId = timestampString(new Date());
  const snapshotPath = path.join(paths.snapshotsDir, `${snapshotId}.extraction.json`);
  fs.mkdirSync(paths.snapshotsDir, { recursive: true });
  fs.copyFileSync(paths.latestExtractionPath, snapshotPath);

  const index: GovernanceSnapshotIndex = {
    schemaVersion: 1,
    prototypeId,
    snapshotIds: [snapshotId],
    entries: {
      [snapshotId]: {
        snapshotId,
        createdAt: new Date().toISOString(),
        filePath: path.relative(paths.prototypeDir, snapshotPath).replaceAll(path.sep, "/"),
      },
    },
    latestSnapshotId: snapshotId,
    baselineSnapshotId: snapshotId,
  };
  writeJsonAtomic(paths.snapshotIndexPath, index);
  return index;
}

export function ensureGovernancePersistence(
  workspaceRoot: string,
  selected: PrototypeEntry,
): GovernancePaths {
  const paths = makePaths(workspaceRoot, selected);
  if (!fs.existsSync(paths.seedContractPath)) {
    throw new Error(`Seed contract missing: ${paths.seedContractPath}`);
  }
  if (!fs.existsSync(paths.latestExtractionPath)) {
    throw new Error(`Extraction report missing: ${paths.latestExtractionPath}`);
  }

  fs.mkdirSync(paths.snapshotsDir, { recursive: true });

  if (!fs.existsSync(paths.draftContractPath)) {
    fs.copyFileSync(paths.seedContractPath, paths.draftContractPath);
  }
  if (!fs.existsSync(paths.snapshotIndexPath)) {
    seedSnapshotFromLatestExtraction(paths, selected.id);
  }
  if (!fs.existsSync(paths.decisionsPath)) {
    const emptyDecisions: GovernanceDecisionLog = {
      schemaVersion: 1,
      prototypeId: selected.id,
      decisions: [],
    };
    writeJsonAtomic(paths.decisionsPath, emptyDecisions);
  }
  if (!fs.existsSync(paths.appliesPath)) {
    const emptyApplies: GovernanceApplyLog = {
      schemaVersion: 1,
      prototypeId: selected.id,
      applies: [],
    };
    writeJsonAtomic(paths.appliesPath, emptyApplies);
  }
  if (!fs.existsSync(paths.inspectorBaselinesPath)) {
    const emptyBaselines: GovernanceInspectorBaselineLog = {
      schemaVersion: 1,
      prototypeId: selected.id,
      baselines: [],
    };
    writeJsonAtomic(paths.inspectorBaselinesPath, emptyBaselines);
  }

  return paths;
}

export function readSnapshotIndex(snapshotIndexPath: string): GovernanceSnapshotIndex {
  const value = readJson<GovernanceSnapshotIndex>(snapshotIndexPath);
  if (value.schemaVersion !== 1) {
    throw new Error("Unsupported snapshot-index schemaVersion.");
  }
  return value;
}

export function readDecisionLog(decisionsPath: string): GovernanceDecisionLog {
  const value = readJson<GovernanceDecisionLog>(decisionsPath);
  if (value.schemaVersion !== 1) {
    throw new Error("Unsupported decisions schemaVersion.");
  }
  return value;
}

export function readApplyLog(appliesPath: string): GovernanceApplyLog {
  const value = readJson<GovernanceApplyLog>(appliesPath);
  if (value.schemaVersion !== 1) {
    throw new Error("Unsupported applies schemaVersion.");
  }
  return value;
}

export function readInspectorBaselineLog(
  inspectorBaselinesPath: string,
): GovernanceInspectorBaselineLog {
  const value = readJson<GovernanceInspectorBaselineLog>(inspectorBaselinesPath);
  if (value.schemaVersion !== 1) {
    throw new Error("Unsupported inspector baselines schemaVersion.");
  }
  return value;
}

function canonicalTargetUrl(value: string): string {
  const url = new URL(value.trim());
  url.search = "";
  url.hash = "";
  return url.toString();
}

export function getInspectorBaselineForTarget(
  workspaceRoot: string,
  selected: PrototypeEntry,
  targetUrl: string,
): GovernanceInspectorBaselineRecord | null {
  const paths = ensureGovernancePersistence(workspaceRoot, selected);
  const canonical = canonicalTargetUrl(targetUrl);
  const log = readInspectorBaselineLog(paths.inspectorBaselinesPath);
  return log.baselines.find((entry) => entry.targetUrl === canonical) ?? null;
}

export function upsertInspectorBaselineForTarget(
  workspaceRoot: string,
  selected: PrototypeEntry,
  payload: {
    targetUrl: string;
    contract: SurfaceContract;
    requiredSections: string[];
    sourceSnapshotCapturedAt: string;
  },
): GovernanceInspectorBaselineRecord {
  const paths = ensureGovernancePersistence(workspaceRoot, selected);
  const canonical = canonicalTargetUrl(payload.targetUrl);
  const log = readInspectorBaselineLog(paths.inspectorBaselinesPath);
  const now = new Date().toISOString();
  const nextRecord: GovernanceInspectorBaselineRecord = {
    targetUrl: canonical,
    contract: payload.contract,
    requiredSections: [...new Set(payload.requiredSections.filter((value) => value.trim().length > 0))],
    sourceSnapshotCapturedAt: payload.sourceSnapshotCapturedAt,
    createdAt: now,
    updatedAt: now,
  };
  const existingIndex = log.baselines.findIndex((entry) => entry.targetUrl === canonical);
  if (existingIndex >= 0) {
    nextRecord.createdAt = log.baselines[existingIndex].createdAt;
    log.baselines[existingIndex] = nextRecord;
  } else {
    log.baselines.push(nextRecord);
  }
  log.baselines.sort((a, b) => a.targetUrl.localeCompare(b.targetUrl));
  writeJsonAtomic(paths.inspectorBaselinesPath, log);
  return nextRecord;
}

export function readContractDraft(draftContractPath: string): SurfaceContract {
  return readJson<SurfaceContract>(draftContractPath);
}

export function readSnapshotExtraction(
  prototypeDir: string,
  index: GovernanceSnapshotIndex,
  snapshotId: string,
): ExtractionSnapshot {
  const entry = index.entries[snapshotId];
  if (!entry) {
    throw new Error(`Snapshot not found: ${snapshotId}`);
  }
  return readJson<ExtractionSnapshot>(path.join(prototypeDir, entry.filePath));
}

export function appendSnapshotFromLatestExtraction(
  workspaceRoot: string,
  selected: PrototypeEntry,
): { snapshotId: string; createdAt: string; index: GovernanceSnapshotIndex } {
  const paths = ensureGovernancePersistence(workspaceRoot, selected);
  if (!fs.existsSync(paths.generatedExtractionPath)) {
    throw new Error(`Generated extraction report missing: ${paths.generatedExtractionPath}`);
  }
  fs.copyFileSync(paths.generatedExtractionPath, paths.latestExtractionPath);
  const index = readSnapshotIndex(paths.snapshotIndexPath);
  const createdAt = new Date().toISOString();
  let snapshotId = timestampString(new Date());
  while (index.entries[snapshotId]) {
    snapshotId = timestampString(new Date(Date.now() + 1));
  }

  const snapshotPath = path.join(paths.snapshotsDir, `${snapshotId}.extraction.json`);
  fs.copyFileSync(paths.generatedExtractionPath, snapshotPath);
  const relativePath = path.relative(paths.prototypeDir, snapshotPath).replaceAll(path.sep, "/");
  index.snapshotIds.push(snapshotId);
  index.entries[snapshotId] = { snapshotId, createdAt, filePath: relativePath };
  index.latestSnapshotId = snapshotId;
  if (!index.baselineSnapshotId) {
    index.baselineSnapshotId = snapshotId;
  }

  writeJsonAtomic(paths.snapshotIndexPath, index);
  return { snapshotId, createdAt, index };
}

export function appendDecision(
  workspaceRoot: string,
  selected: PrototypeEntry,
  payload: {
    snapshotId: string;
    diffItemId: string;
    action: GovernanceDecisionAction;
    reason?: string | null;
    actor?: unknown;
  },
): GovernanceDecisionRecord {
  const paths = ensureGovernancePersistence(workspaceRoot, selected);
  const index = readSnapshotIndex(paths.snapshotIndexPath);
  if (!index.entries[payload.snapshotId]) {
    throw new Error(`Snapshot not found: ${payload.snapshotId}`);
  }
  const log = readDecisionLog(paths.decisionsPath);
  const createdAt = new Date().toISOString();
  const decision: GovernanceDecisionRecord = {
    decisionId: `decision-${createdAt.replace(/[:.]/g, "")}-${log.decisions.length + 1}`,
    snapshotId: payload.snapshotId,
    diffItemId: payload.diffItemId,
    action: payload.action,
    reason: payload.reason?.trim() ? payload.reason.trim() : null,
    actor: normalizeActor(payload.actor),
    createdAt,
  };
  log.decisions.push(decision);
  writeJsonAtomic(paths.decisionsPath, log);
  return decision;
}

function processedDiffItems(snapshotId: string, applies: GovernanceApplyRecord[]): Set<string> {
  const processed = new Set<string>();
  for (const apply of applies) {
    if (apply.snapshotId !== snapshotId) continue;
    for (const item of apply.items) {
      processed.add(item.diffItemId);
    }
  }
  return processed;
}

export function applyAcceptedDecisions(
  workspaceRoot: string,
  selected: PrototypeEntry,
  payload: { snapshotId: string; actor?: unknown },
): {
  applied: string[];
  skipped: Array<{ diffItemId: string; reason: string }>;
  draft: SurfaceContract;
} {
  const paths = ensureGovernancePersistence(workspaceRoot, selected);
  const index = readSnapshotIndex(paths.snapshotIndexPath);
  if (!index.entries[payload.snapshotId]) {
    throw new Error(`Snapshot not found: ${payload.snapshotId}`);
  }

  const decisions = readDecisionLog(paths.decisionsPath);
  const applies = readApplyLog(paths.appliesPath);
  const processed = processedDiffItems(payload.snapshotId, applies.applies);

  const latestPerDiff = new Map<string, GovernanceDecisionRecord>();
  for (const decision of decisions.decisions) {
    if (decision.snapshotId !== payload.snapshotId) continue;
    const current = latestPerDiff.get(decision.diffItemId);
    if (!current || decision.createdAt >= current.createdAt) {
      latestPerDiff.set(decision.diffItemId, decision);
    }
  }

  const acceptedDiffIds = [...latestPerDiff.values()]
    .filter((decision) => decision.action === "accept" && !processed.has(decision.diffItemId))
    .map((decision) => decision.diffItemId);

  const snapshot = readSnapshotExtraction(paths.prototypeDir, index, payload.snapshotId);
  const draft = readContractDraft(paths.draftContractPath);

  const applied: string[] = [];
  const skipped: Array<{ diffItemId: string; reason: string }> = [];

  for (const diffItemId of acceptedDiffIds) {
    if (diffItemId === "authaware-diff") {
      draft.generation.structuralChangesRequireReview = Boolean(snapshot.extracted?.authAware);
      applied.push(diffItemId);
      continue;
    }
    if (diffItemId === "hasshell-diff") {
      draft.layout.requireGlobalHeader = Boolean(snapshot.extracted?.hasShell);
      applied.push(diffItemId);
      continue;
    }
    skipped.push({ diffItemId, reason: "manual_evolve_required" });
  }

  writeJsonAtomic(paths.draftContractPath, draft);

  index.baselineSnapshotId = payload.snapshotId;
  writeJsonAtomic(paths.snapshotIndexPath, index);

  const applyRecord: GovernanceApplyRecord = {
    applyId: `apply-${new Date().toISOString().replace(/[:.]/g, "")}-${applies.applies.length + 1}`,
    snapshotId: payload.snapshotId,
    actor: normalizeActor(payload.actor),
    createdAt: new Date().toISOString(),
    items: [
      ...applied.map((diffItemId) => ({ diffItemId, status: "applied" as const })),
      ...skipped.map((item) => ({
        diffItemId: item.diffItemId,
        status: "skipped" as const,
        reason: item.reason,
      })),
    ],
  };
  applies.applies.push(applyRecord);
  writeJsonAtomic(paths.appliesPath, applies);

  return { applied, skipped, draft };
}
