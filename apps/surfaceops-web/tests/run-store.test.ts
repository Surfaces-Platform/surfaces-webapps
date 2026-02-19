import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { Pool } from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
const describeWithDb = DATABASE_URL ? describe : describe.skip;

const originalEnv = {
  SURFACEOPS_CONTRACTS_DIR: process.env.SURFACEOPS_CONTRACTS_DIR,
  SURFACEOPS_RUNSTORE_MODE: process.env.SURFACEOPS_RUNSTORE_MODE,
  SURFACEOPS_DEFAULT_WORKSPACE_ID: process.env.SURFACEOPS_DEFAULT_WORKSPACE_ID,
  DATABASE_URL: process.env.DATABASE_URL,
};
const WORKSPACE_ID = "ws-test";

function makeContractsSandbox() {
  const contractsDir = fs.mkdtempSync(path.join(os.tmpdir(), "surfaceops-contracts-"));
  const generatedDir = path.join(contractsDir, "generated");
  fs.mkdirSync(generatedDir, { recursive: true });

  fs.writeFileSync(
    path.join(contractsDir, "surfaces.web.contract.json"),
    JSON.stringify(
      {
        contractId: "surfaces.web",
        version: "0.1.0",
        surfaces: [{ id: "surfaces-web", displayName: "Surfaces Web", type: "web" }],
      },
      null,
      2
    )
  );

  fs.writeFileSync(
    path.join(generatedDir, "contract-runs.json"),
    JSON.stringify({ schemaVersion: 2, runs: [] }, null, 2)
  );
  fs.writeFileSync(
    path.join(generatedDir, "contract-lineage.json"),
    JSON.stringify({ schemaVersion: 1, surfaces: {} }, null, 2)
  );

  return { contractsDir, generatedDir };
}

async function importContractsModule() {
  const vitest = await import("vitest");
  vitest.vi.resetModules();
  return import("@/lib/contracts");
}

afterEach(() => {
  process.env.SURFACEOPS_CONTRACTS_DIR = originalEnv.SURFACEOPS_CONTRACTS_DIR;
  process.env.SURFACEOPS_RUNSTORE_MODE = originalEnv.SURFACEOPS_RUNSTORE_MODE;
  process.env.SURFACEOPS_DEFAULT_WORKSPACE_ID = originalEnv.SURFACEOPS_DEFAULT_WORKSPACE_ID;
  process.env.DATABASE_URL = originalEnv.DATABASE_URL;
});

describe("RunStore fallback", () => {
  it("uses JSON directly in auto mode when DATABASE_URL is unavailable", async () => {
    const sandbox = makeContractsSandbox();

    fs.writeFileSync(
      path.join(sandbox.generatedDir, "contract-runs.json"),
      JSON.stringify(
        {
          schemaVersion: 2,
          runs: [
            {
              runId: "run-json-1",
              workspaceId: WORKSPACE_ID,
              createdAt: "2026-02-19T00:00:00.000Z",
              surfaceId: "surfaces-web",
              source: "ci",
              contract: { id: "surfaces.web", version: "0.1.0", sha256: "a".repeat(64) },
              artifacts: {},
              status: "pass",
              findingCodes: [],
              summary: { errorCount: 0, warnCount: 0 },
            },
          ],
        },
        null,
        2
      )
    );

    delete process.env.DATABASE_URL;
    process.env.SURFACEOPS_CONTRACTS_DIR = sandbox.contractsDir;
    process.env.SURFACEOPS_RUNSTORE_MODE = "auto";
    process.env.SURFACEOPS_DEFAULT_WORKSPACE_ID = WORKSPACE_ID;

    const contracts = await importContractsModule();
    const docs = await contracts.loadRunDocumentsFromStore();

    expect(docs.mode).toBe("json");
    expect(docs.fallbackUsed).toBe(false);
    expect(docs.runs.runs).toHaveLength(1);
    expect(docs.runs.runs[0]?.runId).toBe("run-json-1");
  });
});

describeWithDb("RunStore DB mode", () => {
  let pool: Pool;

  beforeAll(async () => {
    pool = new Pool({ connectionString: DATABASE_URL });
    const migrationsDir = path.join(process.cwd(), "migrations");
    const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
      await pool.query(sql);
    }
  });

  afterAll(async () => {
    await pool?.end();
  });

  it("reads runs from contract_runs table when db mode is enabled", async () => {
    const sandbox = makeContractsSandbox();
    await pool.query("TRUNCATE TABLE contract_runs");

    await pool.query(
      `INSERT INTO contract_runs (
        workspace_id,
        run_id,
        idempotency_key,
        created_at,
        ingested_at,
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
        $2,
        'run-db-1',
        'idem-db-1',
        '2026-02-19T00:00:00.000Z',
        '2026-02-19T00:00:01.000Z',
        'surfaces-web',
        'runtime',
        'warn',
        'surfaces.web',
        '0.1.0',
        $1,
        'contracts/generated/surfaces-web.extraction.json',
        null,
        ARRAY['color.disallowed'],
        0,
        1
      )`,
      ["a".repeat(64), WORKSPACE_ID]
    );

    await pool.query(
      `INSERT INTO contract_runs (
        workspace_id,
        run_id,
        idempotency_key,
        created_at,
        ingested_at,
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
        $2,
        'run-db-other',
        'idem-db-other',
        '2026-02-19T00:00:00.000Z',
        '2026-02-19T00:00:01.000Z',
        'surfaces-web',
        'runtime',
        'warn',
        'surfaces.web',
        '0.1.0',
        $1,
        'contracts/generated/surfaces-web.extraction.json',
        null,
        ARRAY['color.disallowed'],
        0,
        1
      )`,
      ["b".repeat(64), "ws-other"]
    );

    process.env.SURFACEOPS_CONTRACTS_DIR = sandbox.contractsDir;
    process.env.SURFACEOPS_RUNSTORE_MODE = "db";
    process.env.SURFACEOPS_DEFAULT_WORKSPACE_ID = WORKSPACE_ID;
    process.env.DATABASE_URL = DATABASE_URL;

    const contracts = await importContractsModule();
    const docs = await contracts.loadRunDocumentsFromStore();

    expect(docs.mode).toBe("db");
    expect(docs.fallbackUsed).toBe(false);
    expect(docs.runs.runs).toHaveLength(1);
    expect(docs.runs.runs[0]?.runId).toBe("run-db-1");
    expect(docs.runs.runs[0]?.workspaceId).toBe(WORKSPACE_ID);
    expect(docs.runs.runs[0]?.idempotencyKey).toBe("idem-db-1");
    expect(docs.lineage.surfaces["surfaces-web"]?.lastRunId).toBe("run-db-1");
  });

  it("sync script is idempotent across repeated runs", async () => {
    const sandbox = makeContractsSandbox();
    const runsPath = path.join(sandbox.generatedDir, "contract-runs.json");

    fs.writeFileSync(
      runsPath,
      JSON.stringify(
        {
          schemaVersion: 2,
          runs: [
            {
              runId: "run-sync-1",
              workspaceId: WORKSPACE_ID,
              idempotencyKey: "idem-sync-1",
              ingestedAt: "2026-02-19T00:00:01.000Z",
              createdAt: "2026-02-19T00:00:00.000Z",
              surfaceId: "surfaces-web",
              source: "ci",
              contract: { id: "surfaces.web", version: "0.1.0", sha256: "a".repeat(64) },
              artifacts: { extractionPath: "contracts/generated/surfaces-web.extraction.json" },
              status: "warn",
              findingCodes: ["phase0.authRoutes.missing"],
              summary: { errorCount: 0, warnCount: 1 },
            },
          ],
        },
        null,
        2
      )
    );

    await pool.query("TRUNCATE TABLE contract_runs");

    const first = spawnSync(
      "pnpm",
      ["run", "sync:run-artifacts:db", "--", "--runs", runsPath],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          DATABASE_URL: DATABASE_URL!,
          SURFACEOPS_DEFAULT_WORKSPACE_ID: WORKSPACE_ID,
        },
        encoding: "utf8",
      }
    );
    expect(first.status).toBe(0);

    const second = spawnSync(
      "pnpm",
      ["run", "sync:run-artifacts:db", "--", "--runs", runsPath],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          DATABASE_URL: DATABASE_URL!,
          SURFACEOPS_DEFAULT_WORKSPACE_ID: WORKSPACE_ID,
        },
        encoding: "utf8",
      }
    );
    expect(second.status).toBe(0);

    const countResult = await pool.query(
      "SELECT COUNT(*)::int AS count FROM contract_runs WHERE workspace_id = $1 AND run_id = 'run-sync-1'",
      [WORKSPACE_ID]
    );
    expect(countResult.rows[0]?.count).toBe(1);
  });
});
