/**
 * Sync contracts/generated/contract-runs.json into apps/surfaceops-web contract_runs table.
 * Deterministic and idempotent: safe to rerun.
 */
import fs from "node:fs";
import path from "node:path";
import { Pool } from "pg";
import { getDefaultWorkspaceId, normalizeWorkspaceId } from "../lib/workspace";

type RunSource = "bootstrap" | "generation" | "ci" | "runtime";
type ValidationOutcome = "pass" | "warn" | "fail" | "unknown";

interface ContractRun {
  runId: string;
  workspaceId?: string;
  idempotencyKey?: string;
  ingestedAt?: string;
  createdAt: string;
  surfaceId: string;
  source: RunSource;
  contract: {
    id: string;
    version: string;
    sha256: string;
  };
  artifacts: {
    extractionPath?: string;
    reportPath?: string;
  };
  status: ValidationOutcome;
  findingCodes: string[];
  summary: {
    errorCount: number;
    warnCount: number;
  };
}

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
  throw new Error(`[sync-run-artifacts-to-db] ${message}`);
}

function normalizeRun(raw: unknown): ContractRun | null {
  if (!raw || typeof raw !== "object") return null;
  const run = raw as Record<string, unknown>;

  const runId = typeof run.runId === "string" ? run.runId.trim() : "";
  const createdAt = typeof run.createdAt === "string" ? run.createdAt : "";
  const surfaceId = typeof run.surfaceId === "string" ? run.surfaceId.trim() : "";
  const source = run.source;
  const status = run.status;

  if (!runId || !surfaceId || Number.isNaN(Date.parse(createdAt))) return null;
  if (source !== "bootstrap" && source !== "generation" && source !== "ci" && source !== "runtime") {
    return null;
  }
  if (status !== "pass" && status !== "warn" && status !== "fail" && status !== "unknown") {
    return null;
  }

  const contract =
    run.contract && typeof run.contract === "object"
      ? (run.contract as Record<string, unknown>)
      : {};
  const artifacts =
    run.artifacts && typeof run.artifacts === "object"
      ? (run.artifacts as Record<string, unknown>)
      : {};
  const summary =
    run.summary && typeof run.summary === "object"
      ? (run.summary as Record<string, unknown>)
      : {};

  return {
    runId,
    workspaceId:
      typeof run.workspaceId === "string" && run.workspaceId.trim().length > 0
        ? normalizeWorkspaceId(run.workspaceId)
        : undefined,
    idempotencyKey:
      typeof run.idempotencyKey === "string" && run.idempotencyKey.trim().length > 0
        ? run.idempotencyKey.trim()
        : undefined,
    ingestedAt:
      typeof run.ingestedAt === "string" && !Number.isNaN(Date.parse(run.ingestedAt))
        ? run.ingestedAt
        : undefined,
    createdAt,
    surfaceId,
    source,
    contract: {
      id: typeof contract.id === "string" && contract.id.length > 0 ? contract.id : "unknown",
      version:
        typeof contract.version === "string" && contract.version.length > 0
          ? contract.version
          : "unknown",
      sha256:
        typeof contract.sha256 === "string" && contract.sha256.length > 0
          ? contract.sha256
          : "unknown",
    },
    artifacts: {
      extractionPath:
        typeof artifacts.extractionPath === "string" ? artifacts.extractionPath : undefined,
      reportPath: typeof artifacts.reportPath === "string" ? artifacts.reportPath : undefined,
    },
    status,
    findingCodes: Array.isArray(run.findingCodes)
      ? run.findingCodes.filter((entry): entry is string => typeof entry === "string")
      : [],
    summary: {
      errorCount:
        typeof summary.errorCount === "number" && summary.errorCount >= 0
          ? summary.errorCount
          : 0,
      warnCount:
        typeof summary.warnCount === "number" && summary.warnCount >= 0
          ? summary.warnCount
          : 0,
    },
  };
}

function sortRunsAsc(runs: ContractRun[]): ContractRun[] {
  return [...runs].sort((a, b) => {
    const timeDiff = Date.parse(a.createdAt) - Date.parse(b.createdAt);
    if (timeDiff !== 0) return timeDiff;
    return a.runId.localeCompare(b.runId);
  });
}

function dedupeRuns(runs: ContractRun[]): ContractRun[] {
  const byRunId = new Set<string>();
  const byIdempotency = new Set<string>();
  const deduped: ContractRun[] = [];
  for (const run of sortRunsAsc(runs)) {
    const workspaceId = run.workspaceId ?? getDefaultWorkspaceId();
    const runKey = `${workspaceId}:${run.runId}`;
    const idempotencyKey = run.idempotencyKey ? `${workspaceId}:${run.idempotencyKey}` : null;
    if (byRunId.has(runKey)) continue;
    if (idempotencyKey && byIdempotency.has(idempotencyKey)) continue;
    byRunId.add(runKey);
    if (idempotencyKey) byIdempotency.add(idempotencyKey);
    deduped.push(run);
  }
  return deduped;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const repoRoot =
    typeof args.root === "string"
      ? path.resolve(args.root)
      : path.resolve(process.cwd(), "..", "..");
  const runsPath =
    typeof args.runs === "string"
      ? path.resolve(repoRoot, args.runs)
      : path.join(repoRoot, "contracts", "generated", "contract-runs.json");
  const defaultWorkspaceId =
    typeof args["workspace-id"] === "string"
      ? normalizeWorkspaceId(args["workspace-id"])
      : getDefaultWorkspaceId();

  if (!process.env.DATABASE_URL) {
    fail("DATABASE_URL is not set");
  }
  if (!fs.existsSync(runsPath)) {
    fail(`Run artifacts not found: ${path.relative(repoRoot, runsPath)}`);
  }

  const rawDoc = JSON.parse(fs.readFileSync(runsPath, "utf8")) as { runs?: unknown[] };
  const runs = dedupeRuns(
    Array.isArray(rawDoc.runs)
      ? rawDoc.runs
          .map((run) => normalizeRun(run))
          .filter((run): run is ContractRun => Boolean(run))
      : []
  );

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  let inserted = 0;
  let updated = 0;

  try {
    await client.query("BEGIN");

    for (const run of runs) {
      const result = await client.query(
        `INSERT INTO contract_runs (
            workspace_id,
            run_id,
            idempotency_key,
            ingested_at,
            created_at,
            surface_id,
            source,
            status,
            contract_id,
            contract_version,
            contract_sha256,
            artifacts_extraction_path,
            artifacts_report_path,
            finding_codes,
            error_count,
            warn_count
          ) VALUES (
            $1, $2, $3, COALESCE($4::timestamptz, now()), $5::timestamptz, $6, $7, $8,
            $9, $10, $11, $12, $13, $14::text[], $15, $16
          )
          ON CONFLICT (workspace_id, run_id) DO UPDATE SET
            idempotency_key = EXCLUDED.idempotency_key,
            ingested_at = EXCLUDED.ingested_at,
            created_at = EXCLUDED.created_at,
            surface_id = EXCLUDED.surface_id,
            source = EXCLUDED.source,
            status = EXCLUDED.status,
            contract_id = EXCLUDED.contract_id,
            contract_version = EXCLUDED.contract_version,
            contract_sha256 = EXCLUDED.contract_sha256,
            artifacts_extraction_path = EXCLUDED.artifacts_extraction_path,
            artifacts_report_path = EXCLUDED.artifacts_report_path,
            finding_codes = EXCLUDED.finding_codes,
            error_count = EXCLUDED.error_count,
            warn_count = EXCLUDED.warn_count
          RETURNING (xmax = 0) AS inserted`,
        [
          run.workspaceId ?? defaultWorkspaceId,
          run.runId,
          run.idempotencyKey ?? null,
          run.ingestedAt ?? null,
          run.createdAt,
          run.surfaceId,
          run.source,
          run.status,
          run.contract.id,
          run.contract.version,
          run.contract.sha256,
          run.artifacts.extractionPath ?? null,
          run.artifacts.reportPath ?? null,
          run.findingCodes,
          run.summary.errorCount,
          run.summary.warnCount,
        ]
      );

      if (result.rows[0]?.inserted) {
        inserted += 1;
      } else {
        updated += 1;
      }
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }

  const relativeRunsPath = path.relative(repoRoot, runsPath);
  console.log(
    `[sync-run-artifacts-to-db] synced=${runs.length} inserted=${inserted} updated=${updated} source=${relativeRunsPath}`
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
