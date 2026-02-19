import fs from "node:fs";
import path from "node:path";
import { getPool } from "@/lib/db";
import {
  getDefaultWorkspaceId,
  normalizeWorkspaceId,
  sanitizeWorkspaceIdSegment,
} from "@/lib/workspace";
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
  workspaceId: string;
  workspaceSegment: string;
  prototypeDir: string;
  workspaceDir: string;
  draftContractPath: string;
  seedContractPath: string;
  latestExtractionPath: string;
  generatedExtractionPath: string;
  snapshotsDir: string;
  snapshotIndexPath: string;
  decisionsPath: string;
  appliesPath: string;
  inspectorBaselinesPath: string;
  legacyDraftContractPath: string;
  legacySnapshotsDir: string;
  legacySnapshotIndexPath: string;
  legacyDecisionsPath: string;
  legacyAppliesPath: string;
  legacyInspectorBaselinesPath: string;
};

export type GovernanceStoreMode = "auto" | "fs" | "db";

type EffectiveGovernanceStoreMode = "fs" | "db";

export interface GovernanceStoreMetadata {
  configuredMode: GovernanceStoreMode;
  mode: EffectiveGovernanceStoreMode;
  workspaceId: string;
  fallbackUsed: boolean;
  dualWriteEnabled: boolean;
  warning?: string;
}

export interface GovernancePersistenceSelection {
  snapshotIndex: GovernanceSnapshotIndex;
  decisions: GovernanceDecisionRecord[];
  applies: GovernanceApplyRecord[];
  draftContract: SurfaceContract;
  selectedSnapshotId: string;
  selectedSnapshotCreatedAt: string;
  selectedSnapshotReport: ExtractionSnapshot;
  baselineSnapshotId: string;
  baselineSnapshotReport: ExtractionSnapshot;
  snapshotTimeline: Array<{ snapshotId: string; createdAt: string }>;
  storeMeta: GovernanceStoreMetadata;
}

const WRITABLE_PROTOTYPE_ID = "p0004";

export function normalizeActor(actor: unknown): string {
  if (typeof actor !== "string") return "local-user";
  const trimmed = actor.trim();
  return trimmed.length > 0 ? trimmed : "local-user";
}

function getConfiguredGovernanceStoreMode(): GovernanceStoreMode {
  const raw = process.env.SURFACEOPS_GOVERNANCE_STORE_MODE;
  if (raw === "fs" || raw === "db" || raw === "auto") return raw;
  return "auto";
}

function isGovernanceDualWriteEnabled(): boolean {
  return process.env.SURFACEOPS_GOVERNANCE_DUAL_WRITE !== "0";
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

function makePaths(
  workspaceRoot: string,
  selected: PrototypeEntry,
  workspaceId: string,
): GovernancePaths {
  const normalizedWorkspaceId = normalizeWorkspaceId(workspaceId);
  const workspaceSegment = sanitizeWorkspaceIdSegment(normalizedWorkspaceId);
  const prototypeDir = path.join(
    workspaceRoot,
    "apps",
    "surfaceops-web",
    "prototypes",
    "governance",
    selected.id,
  );
  const workspaceDir = path.join(prototypeDir, "workspaces", workspaceSegment);
  return {
    workspaceId: normalizedWorkspaceId,
    workspaceSegment,
    prototypeDir,
    workspaceDir,
    draftContractPath: path.join(workspaceDir, "contract.draft.json"),
    seedContractPath: path.join(workspaceRoot, selected.seedContractPath),
    latestExtractionPath: path.join(workspaceRoot, selected.extractionPaths.report),
    generatedExtractionPath: path.join(
      workspaceRoot,
      "contracts",
      "generated",
      "surfaces-web.extraction.json",
    ),
    snapshotsDir: path.join(workspaceDir, "snapshots"),
    snapshotIndexPath: path.join(workspaceDir, "snapshot-index.json"),
    decisionsPath: path.join(workspaceDir, "decisions.json"),
    appliesPath: path.join(workspaceDir, "applies.json"),
    inspectorBaselinesPath: path.join(workspaceDir, "inspector-baselines.json"),
    legacyDraftContractPath: path.join(prototypeDir, "contract.draft.json"),
    legacySnapshotsDir: path.join(prototypeDir, "snapshots"),
    legacySnapshotIndexPath: path.join(prototypeDir, "snapshot-index.json"),
    legacyDecisionsPath: path.join(prototypeDir, "decisions.json"),
    legacyAppliesPath: path.join(prototypeDir, "applies.json"),
    legacyInspectorBaselinesPath: path.join(prototypeDir, "inspector-baselines.json"),
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

function canonicalTargetUrl(value: string): string {
  const url = new URL(value.trim());
  url.search = "";
  url.hash = "";
  return url.toString();
}

function asIsoString(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function migrateLegacyFiles(paths: GovernancePaths, prototypeId: string): void {
  const hasWorkspaceFiles =
    fs.existsSync(paths.snapshotIndexPath) ||
    fs.existsSync(paths.decisionsPath) ||
    fs.existsSync(paths.appliesPath) ||
    fs.existsSync(paths.inspectorBaselinesPath) ||
    fs.existsSync(paths.draftContractPath);
  if (hasWorkspaceFiles) return;

  const hasLegacyFiles =
    fs.existsSync(paths.legacySnapshotIndexPath) ||
    fs.existsSync(paths.legacyDecisionsPath) ||
    fs.existsSync(paths.legacyAppliesPath) ||
    fs.existsSync(paths.legacyInspectorBaselinesPath) ||
    fs.existsSync(paths.legacyDraftContractPath);

  if (!hasLegacyFiles) return;

  fs.mkdirSync(paths.workspaceDir, { recursive: true });

  if (fs.existsSync(paths.legacySnapshotsDir)) {
    fs.cpSync(paths.legacySnapshotsDir, paths.snapshotsDir, { recursive: true });
  }

  if (fs.existsSync(paths.legacyDraftContractPath) && !fs.existsSync(paths.draftContractPath)) {
    fs.copyFileSync(paths.legacyDraftContractPath, paths.draftContractPath);
  }

  if (fs.existsSync(paths.legacySnapshotIndexPath) && !fs.existsSync(paths.snapshotIndexPath)) {
    const legacyIndex = readJson<GovernanceSnapshotIndex>(paths.legacySnapshotIndexPath);
    const rewrittenEntries: GovernanceSnapshotIndex["entries"] = {};
    for (const [snapshotId, entry] of Object.entries(legacyIndex.entries)) {
      const fileName = path.basename(entry.filePath);
      rewrittenEntries[snapshotId] = {
        snapshotId,
        createdAt: entry.createdAt,
        filePath: path
          .join("workspaces", paths.workspaceSegment, "snapshots", fileName)
          .replaceAll(path.sep, "/"),
      };
    }
    writeJsonAtomic(paths.snapshotIndexPath, {
      schemaVersion: 1,
      prototypeId,
      snapshotIds: legacyIndex.snapshotIds,
      entries: rewrittenEntries,
      latestSnapshotId: legacyIndex.latestSnapshotId,
      baselineSnapshotId: legacyIndex.baselineSnapshotId,
    });
  }

  if (fs.existsSync(paths.legacyDecisionsPath) && !fs.existsSync(paths.decisionsPath)) {
    fs.copyFileSync(paths.legacyDecisionsPath, paths.decisionsPath);
  }

  if (fs.existsSync(paths.legacyAppliesPath) && !fs.existsSync(paths.appliesPath)) {
    fs.copyFileSync(paths.legacyAppliesPath, paths.appliesPath);
  }

  if (
    fs.existsSync(paths.legacyInspectorBaselinesPath) &&
    !fs.existsSync(paths.inspectorBaselinesPath)
  ) {
    fs.copyFileSync(paths.legacyInspectorBaselinesPath, paths.inspectorBaselinesPath);
  }
}

function seedSnapshotFromLatestExtractionFs(
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

function ensureGovernancePersistenceFs(
  workspaceRoot: string,
  selected: PrototypeEntry,
  workspaceId: string,
): GovernancePaths {
  const paths = makePaths(workspaceRoot, selected, workspaceId);
  if (!fs.existsSync(paths.seedContractPath)) {
    throw new Error(`Seed contract missing: ${paths.seedContractPath}`);
  }
  if (!fs.existsSync(paths.latestExtractionPath)) {
    throw new Error(`Extraction report missing: ${paths.latestExtractionPath}`);
  }

  migrateLegacyFiles(paths, selected.id);

  fs.mkdirSync(paths.snapshotsDir, { recursive: true });

  if (!fs.existsSync(paths.draftContractPath)) {
    fs.copyFileSync(paths.seedContractPath, paths.draftContractPath);
  }
  if (!fs.existsSync(paths.snapshotIndexPath)) {
    seedSnapshotFromLatestExtractionFs(paths, selected.id);
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

function readSnapshotIndexFs(snapshotIndexPath: string): GovernanceSnapshotIndex {
  const value = readJson<GovernanceSnapshotIndex>(snapshotIndexPath);
  if (value.schemaVersion !== 1) {
    throw new Error("Unsupported snapshot-index schemaVersion.");
  }
  return value;
}

function readDecisionLogFs(decisionsPath: string): GovernanceDecisionLog {
  const value = readJson<GovernanceDecisionLog>(decisionsPath);
  if (value.schemaVersion !== 1) {
    throw new Error("Unsupported decisions schemaVersion.");
  }
  return value;
}

function readApplyLogFs(appliesPath: string): GovernanceApplyLog {
  const value = readJson<GovernanceApplyLog>(appliesPath);
  if (value.schemaVersion !== 1) {
    throw new Error("Unsupported applies schemaVersion.");
  }
  return value;
}

function readInspectorBaselineLogFs(
  inspectorBaselinesPath: string,
): GovernanceInspectorBaselineLog {
  const value = readJson<GovernanceInspectorBaselineLog>(inspectorBaselinesPath);
  if (value.schemaVersion !== 1) {
    throw new Error("Unsupported inspector baselines schemaVersion.");
  }
  return value;
}

function readContractDraftFs(draftContractPath: string): SurfaceContract {
  return readJson<SurfaceContract>(draftContractPath);
}

function readSnapshotExtractionFs(
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

function loadGovernancePersistenceSelectionFs(
  workspaceRoot: string,
  selected: PrototypeEntry,
  requestedSnapshotId: string | null,
  workspaceId: string,
): Omit<GovernancePersistenceSelection, "storeMeta"> {
  const paths = ensureGovernancePersistenceFs(workspaceRoot, selected, workspaceId);
  const snapshotIndex = readSnapshotIndexFs(paths.snapshotIndexPath);
  const decisions = readDecisionLogFs(paths.decisionsPath).decisions;
  const applies = readApplyLogFs(paths.appliesPath).applies;
  const draftContract = readContractDraftFs(paths.draftContractPath);

  const defaultSelectedSnapshotId = snapshotIndex.latestSnapshotId ?? snapshotIndex.baselineSnapshotId;
  if (!defaultSelectedSnapshotId) {
    throw new Error("No snapshots available for writable prototype.");
  }

  const selectedSnapshotId =
    requestedSnapshotId && snapshotIndex.entries[requestedSnapshotId]
      ? requestedSnapshotId
      : defaultSelectedSnapshotId;
  const baselineSnapshotId = snapshotIndex.baselineSnapshotId ?? selectedSnapshotId;
  const selectedEntry = snapshotIndex.entries[selectedSnapshotId];
  if (!selectedEntry) {
    throw new Error(`Snapshot not found: ${selectedSnapshotId}`);
  }

  const selectedSnapshotReport = readSnapshotExtractionFs(
    paths.prototypeDir,
    snapshotIndex,
    selectedSnapshotId,
  );
  const baselineSnapshotReport = readSnapshotExtractionFs(
    paths.prototypeDir,
    snapshotIndex,
    baselineSnapshotId,
  );

  return {
    snapshotIndex,
    decisions,
    applies,
    draftContract,
    selectedSnapshotId,
    selectedSnapshotCreatedAt: selectedEntry.createdAt,
    selectedSnapshotReport,
    baselineSnapshotId,
    baselineSnapshotReport,
    snapshotTimeline: [...snapshotIndex.snapshotIds]
      .reverse()
      .map((snapshotId) => ({
        snapshotId,
        createdAt: snapshotIndex.entries[snapshotId]?.createdAt ?? "",
      }))
      .filter((entry) => Boolean(entry.createdAt)),
  };
}

async function ensureGovernancePersistenceDb(
  workspaceRoot: string,
  selected: PrototypeEntry,
  workspaceId: string,
): Promise<void> {
  const normalizedWorkspaceId = normalizeWorkspaceId(workspaceId);
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const draftResult = await client.query(
      `SELECT 1
       FROM governance_contract_drafts
       WHERE workspace_id = $1 AND prototype_id = $2
       LIMIT 1`,
      [normalizedWorkspaceId, selected.id],
    );

    if (draftResult.rows.length === 0) {
      const seedPath = path.join(workspaceRoot, selected.seedContractPath);
      const seedContract = readJson<SurfaceContract>(seedPath);
      await client.query(
        `INSERT INTO governance_contract_drafts (workspace_id, prototype_id, contract_json, updated_at)
         VALUES ($1, $2, $3::jsonb, now())
         ON CONFLICT (workspace_id, prototype_id)
         DO UPDATE SET contract_json = EXCLUDED.contract_json, updated_at = EXCLUDED.updated_at`,
        [normalizedWorkspaceId, selected.id, JSON.stringify(seedContract)],
      );
    }

    const snapshotCountResult = await client.query(
      `SELECT COUNT(*)::int AS count
       FROM governance_snapshots
       WHERE workspace_id = $1 AND prototype_id = $2`,
      [normalizedWorkspaceId, selected.id],
    );
    const snapshotCount = Number(snapshotCountResult.rows[0]?.count ?? 0);

    if (snapshotCount === 0) {
      const latestExtractionPath = path.join(workspaceRoot, selected.extractionPaths.report);
      const extraction = readJson<ExtractionSnapshot>(latestExtractionPath);
      const createdAt = new Date().toISOString();
      const snapshotId = timestampString(new Date());

      await client.query(
        `INSERT INTO governance_snapshots (workspace_id, prototype_id, snapshot_id, created_at, report_json)
         VALUES ($1, $2, $3, $4::timestamptz, $5::jsonb)`,
        [normalizedWorkspaceId, selected.id, snapshotId, createdAt, JSON.stringify(extraction)],
      );

      await client.query(
        `INSERT INTO governance_snapshot_heads (
            workspace_id,
            prototype_id,
            baseline_snapshot_id,
            latest_snapshot_id,
            updated_at
          ) VALUES (
            $1, $2, $3, $4, now()
          )
          ON CONFLICT (workspace_id, prototype_id)
          DO UPDATE SET
            baseline_snapshot_id = EXCLUDED.baseline_snapshot_id,
            latest_snapshot_id = EXCLUDED.latest_snapshot_id,
            updated_at = EXCLUDED.updated_at`,
        [normalizedWorkspaceId, selected.id, snapshotId, snapshotId],
      );
    } else {
      await client.query(
        `INSERT INTO governance_snapshot_heads (
            workspace_id,
            prototype_id,
            baseline_snapshot_id,
            latest_snapshot_id,
            updated_at
          )
          SELECT
            $1,
            $2,
            (SELECT snapshot_id
             FROM governance_snapshots
             WHERE workspace_id = $1 AND prototype_id = $2
             ORDER BY created_at ASC, snapshot_id ASC
             LIMIT 1),
            (SELECT snapshot_id
             FROM governance_snapshots
             WHERE workspace_id = $1 AND prototype_id = $2
             ORDER BY created_at DESC, snapshot_id DESC
             LIMIT 1),
            now()
          ON CONFLICT (workspace_id, prototype_id)
          DO NOTHING`,
        [normalizedWorkspaceId, selected.id],
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function loadGovernancePersistenceSelectionDb(
  workspaceRoot: string,
  selected: PrototypeEntry,
  requestedSnapshotId: string | null,
  workspaceId: string,
): Promise<Omit<GovernancePersistenceSelection, "storeMeta">> {
  const normalizedWorkspaceId = normalizeWorkspaceId(workspaceId);
  await ensureGovernancePersistenceDb(workspaceRoot, selected, normalizedWorkspaceId);

  const pool = getPool();
  const [draftResult, snapshotsResult, headsResult, decisionsResult, appliesResult] =
    await Promise.all([
      pool.query(
        `SELECT contract_json, updated_at
         FROM governance_contract_drafts
         WHERE workspace_id = $1 AND prototype_id = $2`,
        [normalizedWorkspaceId, selected.id],
      ),
      pool.query(
        `SELECT snapshot_id, created_at, report_json
         FROM governance_snapshots
         WHERE workspace_id = $1 AND prototype_id = $2
         ORDER BY created_at ASC, snapshot_id ASC`,
        [normalizedWorkspaceId, selected.id],
      ),
      pool.query(
        `SELECT baseline_snapshot_id, latest_snapshot_id
         FROM governance_snapshot_heads
         WHERE workspace_id = $1 AND prototype_id = $2`,
        [normalizedWorkspaceId, selected.id],
      ),
      pool.query(
        `SELECT decision_id, snapshot_id, diff_item_id, action, reason, actor, created_at
         FROM governance_decisions
         WHERE workspace_id = $1 AND prototype_id = $2
         ORDER BY created_at ASC, decision_id ASC`,
        [normalizedWorkspaceId, selected.id],
      ),
      pool.query(
        `SELECT apply_id, snapshot_id, actor, created_at, items_json
         FROM governance_applies
         WHERE workspace_id = $1 AND prototype_id = $2
         ORDER BY created_at ASC, apply_id ASC`,
        [normalizedWorkspaceId, selected.id],
      ),
    ]);

  if (draftResult.rows.length === 0) {
    throw new Error("Governance draft not found.");
  }

  const snapshotRows = snapshotsResult.rows as Array<{
    snapshot_id: string;
    created_at: Date | string;
    report_json: ExtractionSnapshot;
  }>;

  if (snapshotRows.length === 0) {
    throw new Error("No snapshots available for writable prototype.");
  }

  const snapshotIds = snapshotRows.map((row) => String(row.snapshot_id));
  const entries: GovernanceSnapshotIndex["entries"] = {};
  const reportsById = new Map<string, ExtractionSnapshot>();
  for (const row of snapshotRows) {
    const snapshotId = String(row.snapshot_id);
    const createdAt = asIsoString(row.created_at);
    entries[snapshotId] = {
      snapshotId,
      createdAt,
      filePath: `db://snapshots/${snapshotId}`,
    };
    reportsById.set(snapshotId, row.report_json);
  }

  const requestedBaselineSnapshotId =
    typeof headsResult.rows[0]?.baseline_snapshot_id === "string"
      ? headsResult.rows[0].baseline_snapshot_id
      : null;
  const requestedLatestSnapshotId =
    typeof headsResult.rows[0]?.latest_snapshot_id === "string"
      ? headsResult.rows[0].latest_snapshot_id
      : null;

  const latestSnapshotId =
    requestedLatestSnapshotId && entries[requestedLatestSnapshotId]
      ? requestedLatestSnapshotId
      : snapshotIds[snapshotIds.length - 1];

  const defaultSelectedSnapshotId = latestSnapshotId;
  const selectedSnapshotId =
    requestedSnapshotId && entries[requestedSnapshotId]
      ? requestedSnapshotId
      : defaultSelectedSnapshotId;
  const baselineSnapshotId =
    requestedBaselineSnapshotId && entries[requestedBaselineSnapshotId]
      ? requestedBaselineSnapshotId
      : selectedSnapshotId;

  const selectedSnapshotReport = reportsById.get(selectedSnapshotId);
  if (!selectedSnapshotReport) {
    throw new Error(`Snapshot not found: ${selectedSnapshotId}`);
  }
  const baselineSnapshotReport = reportsById.get(baselineSnapshotId);
  if (!baselineSnapshotReport) {
    throw new Error(`Snapshot not found: ${baselineSnapshotId}`);
  }

  const snapshotIndex: GovernanceSnapshotIndex = {
    schemaVersion: 1,
    prototypeId: selected.id,
    snapshotIds,
    entries,
    latestSnapshotId,
    baselineSnapshotId,
  };

  const decisions = (decisionsResult.rows as Array<Record<string, unknown>>).map((row) => ({
    decisionId: String(row.decision_id),
    snapshotId: String(row.snapshot_id),
    diffItemId: String(row.diff_item_id),
    action: String(row.action) as GovernanceDecisionAction,
    reason: typeof row.reason === "string" && row.reason.trim().length > 0 ? row.reason : null,
    actor: String(row.actor),
    createdAt: asIsoString(row.created_at),
  }));

  const applies = (appliesResult.rows as Array<Record<string, unknown>>).map((row) => {
    const rawItems = Array.isArray(row.items_json) ? row.items_json : [];
    const items: GovernanceApplyRecord["items"] = [];
    for (const item of rawItems) {
      if (!item || typeof item !== "object") continue;
      const entry = item as Record<string, unknown>;
      const diffItemId = typeof entry.diffItemId === "string" ? entry.diffItemId : "";
      const status = entry.status;
      if (!diffItemId || (status !== "applied" && status !== "skipped")) continue;
      items.push({
        diffItemId,
        status,
        reason:
          status === "skipped" && typeof entry.reason === "string" ? entry.reason : undefined,
      });
    }
    return {
      applyId: String(row.apply_id),
      snapshotId: String(row.snapshot_id),
      actor: String(row.actor),
      createdAt: asIsoString(row.created_at),
      items,
    } satisfies GovernanceApplyRecord;
  });

  return {
    snapshotIndex,
    decisions,
    applies,
    draftContract: draftResult.rows[0].contract_json as SurfaceContract,
    selectedSnapshotId,
    selectedSnapshotCreatedAt: entries[selectedSnapshotId]?.createdAt ?? new Date().toISOString(),
    selectedSnapshotReport,
    baselineSnapshotId,
    baselineSnapshotReport,
    snapshotTimeline: [...snapshotIds]
      .reverse()
      .map((snapshotId) => ({ snapshotId, createdAt: entries[snapshotId]?.createdAt ?? "" }))
      .filter((entry) => Boolean(entry.createdAt)),
  };
}

function buildStoreMetadata(
  configuredMode: GovernanceStoreMode,
  mode: EffectiveGovernanceStoreMode,
  workspaceId: string,
  fallbackUsed: boolean,
  warning?: string,
): GovernanceStoreMetadata {
  return {
    configuredMode,
    mode,
    workspaceId: normalizeWorkspaceId(workspaceId),
    fallbackUsed,
    dualWriteEnabled: isGovernanceDualWriteEnabled(),
    warning,
  };
}

async function loadFromFsStore(
  workspaceRoot: string,
  selected: PrototypeEntry,
  requestedSnapshotId: string | null,
  workspaceId: string,
  configuredMode: GovernanceStoreMode,
  fallbackUsed: boolean,
  warning?: string,
): Promise<GovernancePersistenceSelection> {
  const state = loadGovernancePersistenceSelectionFs(
    workspaceRoot,
    selected,
    requestedSnapshotId,
    workspaceId,
  );
  return {
    ...state,
    storeMeta: buildStoreMetadata(
      configuredMode,
      "fs",
      workspaceId,
      fallbackUsed,
      warning,
    ),
  };
}

async function loadFromDbStore(
  workspaceRoot: string,
  selected: PrototypeEntry,
  requestedSnapshotId: string | null,
  workspaceId: string,
  configuredMode: GovernanceStoreMode,
): Promise<GovernancePersistenceSelection> {
  const state = await loadGovernancePersistenceSelectionDb(
    workspaceRoot,
    selected,
    requestedSnapshotId,
    workspaceId,
  );
  return {
    ...state,
    storeMeta: buildStoreMetadata(configuredMode, "db", workspaceId, false),
  };
}

export async function loadGovernancePersistenceSelection(
  workspaceRoot: string,
  selected: PrototypeEntry,
  requestedSnapshotId: string | null,
  workspaceId: string,
): Promise<GovernancePersistenceSelection> {
  const configuredMode = getConfiguredGovernanceStoreMode();
  const hasDbConfig = Boolean(process.env.DATABASE_URL);

  if (configuredMode === "fs") {
    return loadFromFsStore(workspaceRoot, selected, requestedSnapshotId, workspaceId, configuredMode, false);
  }

  if (!hasDbConfig) {
    if (configuredMode === "db") {
      return loadFromFsStore(
        workspaceRoot,
        selected,
        requestedSnapshotId,
        workspaceId,
        configuredMode,
        true,
        "DB mode requested but DATABASE_URL is not configured",
      );
    }
    return loadFromFsStore(workspaceRoot, selected, requestedSnapshotId, workspaceId, configuredMode, false);
  }

  try {
    return await loadFromDbStore(
      workspaceRoot,
      selected,
      requestedSnapshotId,
      workspaceId,
      configuredMode,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown governance DB failure";
    if (configuredMode === "db") {
      return loadFromFsStore(
        workspaceRoot,
        selected,
        requestedSnapshotId,
        workspaceId,
        configuredMode,
        true,
        `DB mode requested but unavailable: ${message}`,
      );
    }
    return loadFromFsStore(
      workspaceRoot,
      selected,
      requestedSnapshotId,
      workspaceId,
      configuredMode,
      true,
      `Auto mode fell back to FS governance store: ${message}`,
    );
  }
}

export interface GovernanceWriteResult<T> {
  value: T;
  storeMeta: GovernanceStoreMetadata;
}

async function executeGovernanceWrite<T>(
  workspaceRoot: string,
  selected: PrototypeEntry,
  workspaceId: string,
  dbWrite: () => Promise<T>,
  fsWrite: () => T,
  compare?: (dbValue: T, fsValue: T) => boolean,
): Promise<GovernanceWriteResult<T>> {
  const configuredMode = getConfiguredGovernanceStoreMode();
  const hasDbConfig = Boolean(process.env.DATABASE_URL);
  const dualWrite = isGovernanceDualWriteEnabled();

  if (configuredMode === "fs") {
    const value = fsWrite();
    return {
      value,
      storeMeta: buildStoreMetadata(configuredMode, "fs", workspaceId, false),
    };
  }

  if (!hasDbConfig) {
    if (configuredMode === "db") {
      throw new Error("DB mode requested but DATABASE_URL is not configured");
    }
    const value = fsWrite();
    return {
      value,
      storeMeta: buildStoreMetadata(configuredMode, "fs", workspaceId, false),
    };
  }

  try {
    const dbValue = await dbWrite();

    if (dualWrite) {
      try {
        const fsValue = fsWrite();
        if (compare && !compare(dbValue, fsValue)) {
          console.warn(
            `[governance-store] dual-write parity mismatch workspace=${normalizeWorkspaceId(
              workspaceId,
            )} prototype=${selected.id}`,
          );
        }
      } catch (error) {
        console.warn(
          `[governance-store] fs dual-write failed workspace=${normalizeWorkspaceId(
            workspaceId,
          )} prototype=${selected.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    return {
      value: dbValue,
      storeMeta: buildStoreMetadata(configuredMode, "db", workspaceId, false),
    };
  } catch (error) {
    if (configuredMode === "db") {
      throw error;
    }
    const message = error instanceof Error ? error.message : "Unknown governance DB failure";
    const value = fsWrite();
    return {
      value,
      storeMeta: buildStoreMetadata(configuredMode, "fs", workspaceId, true, `Auto mode fell back to FS governance store: ${message}`),
    };
  }
}

function getInspectorBaselineForTargetFs(
  workspaceRoot: string,
  selected: PrototypeEntry,
  targetUrl: string,
  workspaceId: string,
): GovernanceInspectorBaselineRecord | null {
  const paths = ensureGovernancePersistenceFs(workspaceRoot, selected, workspaceId);
  const canonical = canonicalTargetUrl(targetUrl);
  const log = readInspectorBaselineLogFs(paths.inspectorBaselinesPath);
  return log.baselines.find((entry) => entry.targetUrl === canonical) ?? null;
}

async function getInspectorBaselineForTargetDb(
  selected: PrototypeEntry,
  targetUrl: string,
  workspaceId: string,
): Promise<GovernanceInspectorBaselineRecord | null> {
  const canonical = canonicalTargetUrl(targetUrl);
  const pool = getPool();
  const result = await pool.query(
    `SELECT
       contract_json,
       required_sections,
       source_snapshot_captured_at,
       created_at,
       updated_at
     FROM governance_inspector_baselines
     WHERE workspace_id = $1 AND prototype_id = $2 AND target_url = $3`,
    [normalizeWorkspaceId(workspaceId), selected.id, canonical],
  );

  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    targetUrl: canonical,
    contract: row.contract_json as SurfaceContract,
    requiredSections: Array.isArray(row.required_sections)
      ? row.required_sections.filter((value: unknown): value is string => typeof value === "string")
      : [],
    sourceSnapshotCapturedAt: asIsoString(row.source_snapshot_captured_at),
    createdAt: asIsoString(row.created_at),
    updatedAt: asIsoString(row.updated_at),
  };
}

export async function getInspectorBaselineForTarget(
  workspaceRoot: string,
  selected: PrototypeEntry,
  targetUrl: string,
  workspaceId: string,
): Promise<GovernanceWriteResult<GovernanceInspectorBaselineRecord | null>> {
  return executeGovernanceWrite(
    workspaceRoot,
    selected,
    workspaceId,
    async () => getInspectorBaselineForTargetDb(selected, targetUrl, workspaceId),
    () => getInspectorBaselineForTargetFs(workspaceRoot, selected, targetUrl, workspaceId),
  );
}

function upsertInspectorBaselineForTargetFs(
  workspaceRoot: string,
  selected: PrototypeEntry,
  payload: {
    targetUrl: string;
    contract: SurfaceContract;
    requiredSections: string[];
    sourceSnapshotCapturedAt: string;
  },
  workspaceId: string,
): GovernanceInspectorBaselineRecord {
  const paths = ensureGovernancePersistenceFs(workspaceRoot, selected, workspaceId);
  const canonical = canonicalTargetUrl(payload.targetUrl);
  const log = readInspectorBaselineLogFs(paths.inspectorBaselinesPath);
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

async function upsertInspectorBaselineForTargetDb(
  selected: PrototypeEntry,
  payload: {
    targetUrl: string;
    contract: SurfaceContract;
    requiredSections: string[];
    sourceSnapshotCapturedAt: string;
  },
  workspaceId: string,
): Promise<GovernanceInspectorBaselineRecord> {
  const canonical = canonicalTargetUrl(payload.targetUrl);
  const pool = getPool();
  const now = new Date().toISOString();

  const result = await pool.query(
    `INSERT INTO governance_inspector_baselines (
        workspace_id,
        prototype_id,
        target_url,
        contract_json,
        required_sections,
        source_snapshot_captured_at,
        created_at,
        updated_at
      ) VALUES (
        $1,
        $2,
        $3,
        $4::jsonb,
        $5::text[],
        $6::timestamptz,
        $7::timestamptz,
        $8::timestamptz
      )
      ON CONFLICT (workspace_id, prototype_id, target_url)
      DO UPDATE SET
        contract_json = EXCLUDED.contract_json,
        required_sections = EXCLUDED.required_sections,
        source_snapshot_captured_at = EXCLUDED.source_snapshot_captured_at,
        updated_at = EXCLUDED.updated_at
      RETURNING created_at, updated_at`,
    [
      normalizeWorkspaceId(workspaceId),
      selected.id,
      canonical,
      JSON.stringify(payload.contract),
      [...new Set(payload.requiredSections.filter((value) => value.trim().length > 0))],
      payload.sourceSnapshotCapturedAt,
      now,
      now,
    ],
  );

  return {
    targetUrl: canonical,
    contract: payload.contract,
    requiredSections: [...new Set(payload.requiredSections.filter((value) => value.trim().length > 0))],
    sourceSnapshotCapturedAt: payload.sourceSnapshotCapturedAt,
    createdAt: asIsoString(result.rows[0].created_at),
    updatedAt: asIsoString(result.rows[0].updated_at),
  };
}

export async function upsertInspectorBaselineForTarget(
  workspaceRoot: string,
  selected: PrototypeEntry,
  payload: {
    targetUrl: string;
    contract: SurfaceContract;
    requiredSections: string[];
    sourceSnapshotCapturedAt: string;
  },
  workspaceId: string,
): Promise<GovernanceWriteResult<GovernanceInspectorBaselineRecord>> {
  return executeGovernanceWrite(
    workspaceRoot,
    selected,
    workspaceId,
    async () => upsertInspectorBaselineForTargetDb(selected, payload, workspaceId),
    () => upsertInspectorBaselineForTargetFs(workspaceRoot, selected, payload, workspaceId),
    (dbValue, fsValue) => dbValue.targetUrl === fsValue.targetUrl,
  );
}

function appendSnapshotFromLatestExtractionFs(
  workspaceRoot: string,
  selected: PrototypeEntry,
  workspaceId: string,
): { snapshotId: string; createdAt: string; index: GovernanceSnapshotIndex } {
  const paths = ensureGovernancePersistenceFs(workspaceRoot, selected, workspaceId);
  if (!fs.existsSync(paths.generatedExtractionPath)) {
    throw new Error(`Generated extraction report missing: ${paths.generatedExtractionPath}`);
  }
  fs.copyFileSync(paths.generatedExtractionPath, paths.latestExtractionPath);
  const index = readSnapshotIndexFs(paths.snapshotIndexPath);
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

async function appendSnapshotFromLatestExtractionDb(
  workspaceRoot: string,
  selected: PrototypeEntry,
  workspaceId: string,
): Promise<{ snapshotId: string; createdAt: string; index: GovernanceSnapshotIndex }> {
  const latestExtractionPath = path.join(workspaceRoot, selected.extractionPaths.report);
  const generatedExtractionPath = path.join(
    workspaceRoot,
    "contracts",
    "generated",
    "surfaces-web.extraction.json",
  );
  if (!fs.existsSync(generatedExtractionPath)) {
    throw new Error(`Generated extraction report missing: ${generatedExtractionPath}`);
  }
  fs.copyFileSync(generatedExtractionPath, latestExtractionPath);

  const report = readJson<ExtractionSnapshot>(generatedExtractionPath);
  const pool = getPool();
  const client = await pool.connect();
  const normalizedWorkspaceId = normalizeWorkspaceId(workspaceId);
  let createdAt = new Date().toISOString();
  const snapshotId = timestampString(new Date());

  try {
    await client.query("BEGIN");

    await client.query(
      `INSERT INTO governance_snapshots (
          workspace_id,
          prototype_id,
          snapshot_id,
          created_at,
          report_json
        ) VALUES (
          $1,
          $2,
          $3,
          $4::timestamptz,
          $5::jsonb
        )`,
      [normalizedWorkspaceId, selected.id, snapshotId, createdAt, JSON.stringify(report)],
    );

    await client.query(
      `INSERT INTO governance_snapshot_heads (
          workspace_id,
          prototype_id,
          baseline_snapshot_id,
          latest_snapshot_id,
          updated_at
        ) VALUES (
          $1,
          $2,
          COALESCE(
            (SELECT baseline_snapshot_id
             FROM governance_snapshot_heads
             WHERE workspace_id = $1 AND prototype_id = $2),
            $3
          ),
          $3,
          now()
        )
        ON CONFLICT (workspace_id, prototype_id)
        DO UPDATE SET
          latest_snapshot_id = EXCLUDED.latest_snapshot_id,
          baseline_snapshot_id = COALESCE(governance_snapshot_heads.baseline_snapshot_id, EXCLUDED.baseline_snapshot_id),
          updated_at = EXCLUDED.updated_at`,
      [normalizedWorkspaceId, selected.id, snapshotId],
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  const loaded = await loadGovernancePersistenceSelectionDb(
    workspaceRoot,
    selected,
    snapshotId,
    normalizedWorkspaceId,
  );

  createdAt = loaded.selectedSnapshotCreatedAt;
  return {
    snapshotId,
    createdAt,
    index: loaded.snapshotIndex,
  };
}

export async function appendSnapshotFromLatestExtraction(
  workspaceRoot: string,
  selected: PrototypeEntry,
  workspaceId: string,
): Promise<
  GovernanceWriteResult<{ snapshotId: string; createdAt: string; index: GovernanceSnapshotIndex }>
> {
  return executeGovernanceWrite(
    workspaceRoot,
    selected,
    workspaceId,
    async () => appendSnapshotFromLatestExtractionDb(workspaceRoot, selected, workspaceId),
    () => appendSnapshotFromLatestExtractionFs(workspaceRoot, selected, workspaceId),
    (dbValue, fsValue) => dbValue.snapshotId === fsValue.snapshotId,
  );
}

function appendDecisionFs(
  workspaceRoot: string,
  selected: PrototypeEntry,
  payload: {
    snapshotId: string;
    diffItemId: string;
    action: GovernanceDecisionAction;
    reason?: string | null;
    actor?: unknown;
  },
  workspaceId: string,
): GovernanceDecisionRecord {
  const paths = ensureGovernancePersistenceFs(workspaceRoot, selected, workspaceId);
  const index = readSnapshotIndexFs(paths.snapshotIndexPath);
  if (!index.entries[payload.snapshotId]) {
    throw new Error(`Snapshot not found: ${payload.snapshotId}`);
  }
  const log = readDecisionLogFs(paths.decisionsPath);
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

async function appendDecisionDb(
  selected: PrototypeEntry,
  payload: {
    snapshotId: string;
    diffItemId: string;
    action: GovernanceDecisionAction;
    reason?: string | null;
    actor?: unknown;
  },
  workspaceId: string,
): Promise<GovernanceDecisionRecord> {
  const normalizedWorkspaceId = normalizeWorkspaceId(workspaceId);
  const pool = getPool();

  const snapshotResult = await pool.query(
    `SELECT 1
     FROM governance_snapshots
     WHERE workspace_id = $1 AND prototype_id = $2 AND snapshot_id = $3
     LIMIT 1`,
    [normalizedWorkspaceId, selected.id, payload.snapshotId],
  );
  if (snapshotResult.rows.length === 0) {
    throw new Error(`Snapshot not found: ${payload.snapshotId}`);
  }

  const createdAt = new Date().toISOString();
  const decisionId = `decision-${createdAt.replace(/[:.]/g, "")}-${Math.random().toString(36).slice(2, 8)}`;
  await pool.query(
    `INSERT INTO governance_decisions (
        workspace_id,
        prototype_id,
        decision_id,
        snapshot_id,
        diff_item_id,
        action,
        reason,
        actor,
        created_at
      ) VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9::timestamptz
      )`,
    [
      normalizedWorkspaceId,
      selected.id,
      decisionId,
      payload.snapshotId,
      payload.diffItemId,
      payload.action,
      payload.reason?.trim() ? payload.reason.trim() : null,
      normalizeActor(payload.actor),
      createdAt,
    ],
  );

  return {
    decisionId,
    snapshotId: payload.snapshotId,
    diffItemId: payload.diffItemId,
    action: payload.action,
    reason: payload.reason?.trim() ? payload.reason.trim() : null,
    actor: normalizeActor(payload.actor),
    createdAt,
  };
}

export async function appendDecision(
  workspaceRoot: string,
  selected: PrototypeEntry,
  payload: {
    snapshotId: string;
    diffItemId: string;
    action: GovernanceDecisionAction;
    reason?: string | null;
    actor?: unknown;
  },
  workspaceId: string,
): Promise<GovernanceWriteResult<GovernanceDecisionRecord>> {
  return executeGovernanceWrite(
    workspaceRoot,
    selected,
    workspaceId,
    async () => appendDecisionDb(selected, payload, workspaceId),
    () => appendDecisionFs(workspaceRoot, selected, payload, workspaceId),
    (dbValue, fsValue) =>
      dbValue.snapshotId === fsValue.snapshotId &&
      dbValue.diffItemId === fsValue.diffItemId &&
      dbValue.action === fsValue.action,
  );
}

function applyAcceptedDecisionsFs(
  workspaceRoot: string,
  selected: PrototypeEntry,
  payload: { snapshotId: string; actor?: unknown },
  workspaceId: string,
): {
  applied: string[];
  skipped: Array<{ diffItemId: string; reason: string }>;
  draft: SurfaceContract;
} {
  const paths = ensureGovernancePersistenceFs(workspaceRoot, selected, workspaceId);
  const index = readSnapshotIndexFs(paths.snapshotIndexPath);
  if (!index.entries[payload.snapshotId]) {
    throw new Error(`Snapshot not found: ${payload.snapshotId}`);
  }

  const decisions = readDecisionLogFs(paths.decisionsPath);
  const applies = readApplyLogFs(paths.appliesPath);
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

  const snapshot = readSnapshotExtractionFs(paths.prototypeDir, index, payload.snapshotId);
  const draft = readContractDraftFs(paths.draftContractPath);

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

async function applyAcceptedDecisionsDb(
  workspaceRoot: string,
  selected: PrototypeEntry,
  payload: { snapshotId: string; actor?: unknown },
  workspaceId: string,
): Promise<{
  applied: string[];
  skipped: Array<{ diffItemId: string; reason: string }>;
  draft: SurfaceContract;
}> {
  const normalizedWorkspaceId = normalizeWorkspaceId(workspaceId);
  const state = await loadGovernancePersistenceSelectionDb(
    workspaceRoot,
    selected,
    payload.snapshotId,
    normalizedWorkspaceId,
  );

  if (!state.snapshotIndex.entries[payload.snapshotId]) {
    throw new Error(`Snapshot not found: ${payload.snapshotId}`);
  }

  const processed = processedDiffItems(payload.snapshotId, state.applies);
  const latestPerDiff = new Map<string, GovernanceDecisionRecord>();
  for (const decision of state.decisions) {
    if (decision.snapshotId !== payload.snapshotId) continue;
    const current = latestPerDiff.get(decision.diffItemId);
    if (!current || decision.createdAt >= current.createdAt) {
      latestPerDiff.set(decision.diffItemId, decision);
    }
  }

  const acceptedDiffIds = [...latestPerDiff.values()]
    .filter((decision) => decision.action === "accept" && !processed.has(decision.diffItemId))
    .map((decision) => decision.diffItemId);

  const draft = structuredClone(state.draftContract);
  const snapshot = state.selectedSnapshotReport;

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

  const applyRecord: GovernanceApplyRecord = {
    applyId: `apply-${new Date().toISOString().replace(/[:.]/g, "")}-${Math.random().toString(36).slice(2, 8)}`,
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

  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      `UPDATE governance_contract_drafts
       SET contract_json = $3::jsonb, updated_at = now()
       WHERE workspace_id = $1 AND prototype_id = $2`,
      [normalizedWorkspaceId, selected.id, JSON.stringify(draft)],
    );

    await client.query(
      `UPDATE governance_snapshot_heads
       SET baseline_snapshot_id = $3, updated_at = now()
       WHERE workspace_id = $1 AND prototype_id = $2`,
      [normalizedWorkspaceId, selected.id, payload.snapshotId],
    );

    await client.query(
      `INSERT INTO governance_applies (
          workspace_id,
          prototype_id,
          apply_id,
          snapshot_id,
          actor,
          created_at,
          items_json
        ) VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6::timestamptz,
          $7::jsonb
        )`,
      [
        normalizedWorkspaceId,
        selected.id,
        applyRecord.applyId,
        payload.snapshotId,
        applyRecord.actor,
        applyRecord.createdAt,
        JSON.stringify(applyRecord.items),
      ],
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  return { applied, skipped, draft };
}

export async function applyAcceptedDecisions(
  workspaceRoot: string,
  selected: PrototypeEntry,
  payload: { snapshotId: string; actor?: unknown },
  workspaceId: string,
): Promise<
  GovernanceWriteResult<{
    applied: string[];
    skipped: Array<{ diffItemId: string; reason: string }>;
    draft: SurfaceContract;
  }>
> {
  return executeGovernanceWrite(
    workspaceRoot,
    selected,
    workspaceId,
    async () => applyAcceptedDecisionsDb(workspaceRoot, selected, payload, workspaceId),
    () => applyAcceptedDecisionsFs(workspaceRoot, selected, payload, workspaceId),
    (dbValue, fsValue) =>
      dbValue.applied.join(",") === fsValue.applied.join(",") &&
      dbValue.skipped.length === fsValue.skipped.length,
  );
}

// Backward-compatible exports for fs-only callsites.
export function ensureGovernancePersistence(
  workspaceRoot: string,
  selected: PrototypeEntry,
  workspaceId: string = getDefaultWorkspaceId(),
): GovernancePaths {
  return ensureGovernancePersistenceFs(workspaceRoot, selected, workspaceId);
}

export function readSnapshotIndex(snapshotIndexPath: string): GovernanceSnapshotIndex {
  return readSnapshotIndexFs(snapshotIndexPath);
}

export function readDecisionLog(decisionsPath: string): GovernanceDecisionLog {
  return readDecisionLogFs(decisionsPath);
}

export function readApplyLog(appliesPath: string): GovernanceApplyLog {
  return readApplyLogFs(appliesPath);
}

export function readInspectorBaselineLog(
  inspectorBaselinesPath: string,
): GovernanceInspectorBaselineLog {
  return readInspectorBaselineLogFs(inspectorBaselinesPath);
}

export function readContractDraft(draftContractPath: string): SurfaceContract {
  return readContractDraftFs(draftContractPath);
}

export function readSnapshotExtraction(
  prototypeDir: string,
  index: GovernanceSnapshotIndex,
  snapshotId: string,
): ExtractionSnapshot {
  return readSnapshotExtractionFs(prototypeDir, index, snapshotId);
}
