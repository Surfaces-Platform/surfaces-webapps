import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { Pool } from "pg";
import {
  ensureGovernancePersistence,
  readApplyLog,
  readContractDraft,
  readDecisionLog,
  readInspectorBaselineLog,
  readSnapshotIndex,
} from "../app/contracts/governance/_lib/governance-persistence";
import { getDefaultWorkspaceId, normalizeWorkspaceId } from "../lib/workspace";
import { resolveAdminDatabaseUrl } from "./_lib/database-url";

type GovernancePrototypeEntry = {
  id: string;
  seedContractPath: string;
  extractionPaths: { report: string };
};

type GovernanceManifest = {
  schemaVersion: number;
  activePrototypeId: string;
  prototypes: GovernancePrototypeEntry[];
};

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const parsed: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      parsed[key] = true;
      continue;
    }
    parsed[key] = next;
    i += 1;
  }
  return parsed;
}

function hashValue(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function fail(message: string): never {
  throw new Error(`[verify-governance-store-parity] ${message}`);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const workspaceRoot =
    typeof args.root === "string"
      ? path.resolve(args.root)
      : path.resolve(process.cwd(), "..", "..");
  const workspaceId =
    typeof args["workspace-id"] === "string"
      ? normalizeWorkspaceId(args["workspace-id"])
      : getDefaultWorkspaceId();
  const database = resolveAdminDatabaseUrl();

  if (!database) {
    fail("DATABASE_URL_UNPOOLED or DATABASE_URL is not set");
  }

  const manifestPath = path.join(
    workspaceRoot,
    "apps",
    "surfaceops-web",
    "prototypes",
    "governance",
    "manifest.json",
  );
  if (!fs.existsSync(manifestPath)) {
    fail(`Manifest not found: ${manifestPath}`);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as GovernanceManifest;
  if (!Array.isArray(manifest.prototypes) || manifest.prototypes.length === 0) {
    fail("Manifest has no prototypes");
  }

  const pool = new Pool({ connectionString: database.connectionString });
  const mismatches: string[] = [];

  try {
    for (const prototype of manifest.prototypes) {
      const paths = ensureGovernancePersistence(workspaceRoot, prototype, workspaceId);

      const fsSnapshotIndex = readSnapshotIndex(paths.snapshotIndexPath);
      const fsDecisions = readDecisionLog(paths.decisionsPath).decisions;
      const fsApplies = readApplyLog(paths.appliesPath).applies;
      const fsBaselines = readInspectorBaselineLog(paths.inspectorBaselinesPath).baselines;
      const fsDraft = readContractDraft(paths.draftContractPath);

      const [dbSnapshotCount, dbDecisionCount, dbApplyCount, dbBaselineCount, dbDraftResult] = await Promise.all([
        pool.query(
          `SELECT COUNT(*)::int AS count
           FROM governance_snapshots
           WHERE workspace_id = $1 AND prototype_id = $2`,
          [workspaceId, prototype.id],
        ),
        pool.query(
          `SELECT COUNT(*)::int AS count
           FROM governance_decisions
           WHERE workspace_id = $1 AND prototype_id = $2`,
          [workspaceId, prototype.id],
        ),
        pool.query(
          `SELECT COUNT(*)::int AS count
           FROM governance_applies
           WHERE workspace_id = $1 AND prototype_id = $2`,
          [workspaceId, prototype.id],
        ),
        pool.query(
          `SELECT COUNT(*)::int AS count
           FROM governance_inspector_baselines
           WHERE workspace_id = $1 AND prototype_id = $2`,
          [workspaceId, prototype.id],
        ),
        pool.query(
          `SELECT contract_json
           FROM governance_contract_drafts
           WHERE workspace_id = $1 AND prototype_id = $2`,
          [workspaceId, prototype.id],
        ),
      ]);

      const snapshotCountFs = fsSnapshotIndex.snapshotIds.length;
      const snapshotCountDb = Number(dbSnapshotCount.rows[0]?.count ?? 0);
      if (snapshotCountFs !== snapshotCountDb) {
        mismatches.push(
          `${prototype.id}: snapshot count mismatch fs=${snapshotCountFs} db=${snapshotCountDb}`,
        );
      }

      const decisionCountFs = fsDecisions.length;
      const decisionCountDb = Number(dbDecisionCount.rows[0]?.count ?? 0);
      if (decisionCountFs !== decisionCountDb) {
        mismatches.push(
          `${prototype.id}: decision count mismatch fs=${decisionCountFs} db=${decisionCountDb}`,
        );
      }

      const applyCountFs = fsApplies.length;
      const applyCountDb = Number(dbApplyCount.rows[0]?.count ?? 0);
      if (applyCountFs !== applyCountDb) {
        mismatches.push(`${prototype.id}: apply count mismatch fs=${applyCountFs} db=${applyCountDb}`);
      }

      const baselineCountFs = fsBaselines.length;
      const baselineCountDb = Number(dbBaselineCount.rows[0]?.count ?? 0);
      if (baselineCountFs !== baselineCountDb) {
        mismatches.push(
          `${prototype.id}: baseline count mismatch fs=${baselineCountFs} db=${baselineCountDb}`,
        );
      }

      if (dbDraftResult.rows.length === 0) {
        mismatches.push(`${prototype.id}: missing DB draft`);
      } else {
        const fsDraftHash = hashValue(fsDraft);
        const dbDraftHash = hashValue(dbDraftResult.rows[0].contract_json);
        if (fsDraftHash !== dbDraftHash) {
          mismatches.push(`${prototype.id}: draft hash mismatch`);
        }
      }
    }
  } finally {
    await pool.end();
  }

  if (mismatches.length > 0) {
    console.error(
      `[verify-governance-store-parity] workspace=${workspaceId} mismatches=${mismatches.length} dbEnv=${database.source}`,
    );
    for (const mismatch of mismatches) {
      console.error(`- ${mismatch}`);
    }
    process.exit(1);
  }

  console.log(`[verify-governance-store-parity] workspace=${workspaceId} status=ok dbEnv=${database.source}`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
