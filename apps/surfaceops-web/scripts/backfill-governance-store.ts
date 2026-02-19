import fs from "node:fs";
import path from "node:path";
import { Pool } from "pg";
import {
  ensureGovernancePersistence,
  readApplyLog,
  readContractDraft,
  readDecisionLog,
  readInspectorBaselineLog,
  readSnapshotExtraction,
  readSnapshotIndex,
} from "../app/contracts/governance/_lib/governance-persistence";
import { getDefaultWorkspaceId, normalizeWorkspaceId } from "../lib/workspace";

type GovernancePrototypeEntry = {
  id: string;
  seedContractPath: string;
  extractionPaths: {
    report: string;
  };
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

function fail(message: string): never {
  throw new Error(`[backfill-governance-store] ${message}`);
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

  if (!process.env.DATABASE_URL) {
    fail("DATABASE_URL is not set");
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

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  let prototypeCount = 0;
  let snapshotCount = 0;
  let decisionCount = 0;
  let applyCount = 0;
  let baselineCount = 0;

  try {
    await client.query("BEGIN");

    for (const prototype of manifest.prototypes) {
      const paths = ensureGovernancePersistence(workspaceRoot, prototype, workspaceId);
      const snapshotIndex = readSnapshotIndex(paths.snapshotIndexPath);
      const decisions = readDecisionLog(paths.decisionsPath).decisions;
      const applies = readApplyLog(paths.appliesPath).applies;
      const baselines = readInspectorBaselineLog(paths.inspectorBaselinesPath).baselines;
      const draft = readContractDraft(paths.draftContractPath);

      await client.query(
        `INSERT INTO governance_contract_drafts (workspace_id, prototype_id, contract_json, updated_at)
         VALUES ($1, $2, $3::jsonb, now())
         ON CONFLICT (workspace_id, prototype_id)
         DO UPDATE SET contract_json = EXCLUDED.contract_json, updated_at = EXCLUDED.updated_at`,
        [workspaceId, prototype.id, JSON.stringify(draft)],
      );

      for (const snapshotId of snapshotIndex.snapshotIds) {
        const entry = snapshotIndex.entries[snapshotId];
        if (!entry) continue;
        const report = readSnapshotExtraction(paths.prototypeDir, snapshotIndex, snapshotId);
        await client.query(
          `INSERT INTO governance_snapshots (workspace_id, prototype_id, snapshot_id, created_at, report_json)
           VALUES ($1, $2, $3, $4::timestamptz, $5::jsonb)
           ON CONFLICT (workspace_id, prototype_id, snapshot_id)
           DO UPDATE SET created_at = EXCLUDED.created_at, report_json = EXCLUDED.report_json`,
          [workspaceId, prototype.id, snapshotId, entry.createdAt, JSON.stringify(report)],
        );
        snapshotCount += 1;
      }

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
            $3,
            $4,
            now()
          )
          ON CONFLICT (workspace_id, prototype_id)
          DO UPDATE SET
            baseline_snapshot_id = EXCLUDED.baseline_snapshot_id,
            latest_snapshot_id = EXCLUDED.latest_snapshot_id,
            updated_at = EXCLUDED.updated_at`,
        [workspaceId, prototype.id, snapshotIndex.baselineSnapshotId, snapshotIndex.latestSnapshotId],
      );

      for (const decision of decisions) {
        await client.query(
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
            )
            ON CONFLICT (workspace_id, prototype_id, decision_id)
            DO UPDATE SET
              snapshot_id = EXCLUDED.snapshot_id,
              diff_item_id = EXCLUDED.diff_item_id,
              action = EXCLUDED.action,
              reason = EXCLUDED.reason,
              actor = EXCLUDED.actor,
              created_at = EXCLUDED.created_at`,
          [
            workspaceId,
            prototype.id,
            decision.decisionId,
            decision.snapshotId,
            decision.diffItemId,
            decision.action,
            decision.reason,
            decision.actor,
            decision.createdAt,
          ],
        );
        decisionCount += 1;
      }

      for (const apply of applies) {
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
            )
            ON CONFLICT (workspace_id, prototype_id, apply_id)
            DO UPDATE SET
              snapshot_id = EXCLUDED.snapshot_id,
              actor = EXCLUDED.actor,
              created_at = EXCLUDED.created_at,
              items_json = EXCLUDED.items_json`,
          [workspaceId, prototype.id, apply.applyId, apply.snapshotId, apply.actor, apply.createdAt, JSON.stringify(apply.items)],
        );
        applyCount += 1;
      }

      for (const baseline of baselines) {
        await client.query(
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
              updated_at = EXCLUDED.updated_at`,
          [
            workspaceId,
            prototype.id,
            baseline.targetUrl,
            JSON.stringify(baseline.contract),
            baseline.requiredSections,
            baseline.sourceSnapshotCapturedAt,
            baseline.createdAt,
            baseline.updatedAt,
          ],
        );
        baselineCount += 1;
      }

      prototypeCount += 1;
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }

  console.log(
    `[backfill-governance-store] workspace=${workspaceId} prototypes=${prototypeCount} snapshots=${snapshotCount} decisions=${decisionCount} applies=${applyCount} baselines=${baselineCount}`,
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
