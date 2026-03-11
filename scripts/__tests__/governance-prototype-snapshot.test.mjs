import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const repoRoot = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), "../.."));

function createIsolatedResolverEnv(extraEnv = {}) {
  const env = { ...process.env };
  delete env.SURFACES_INTERFACECTL_ROOT;
  delete env.SURFACES_INTERFACECTL_CLI;
  delete env.SURFACES_INTERFACECTL_GENERATION_GUARD;
  return { ...env, ...extraEnv };
}

function makeSandbox() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "governance-snapshot-"));
  const interfacectlRoot = path.join(dir, "..", `${path.basename(dir)}-interfacectl`);

  fs.mkdirSync(path.join(dir, "scripts", "prototypes"), { recursive: true });
  fs.mkdirSync(path.join(dir, "scripts", "lib"), { recursive: true });
  fs.copyFileSync(
    path.join(repoRoot, "scripts", "prototypes", "snapshot-governance-extraction.mjs"),
    path.join(dir, "scripts", "prototypes", "snapshot-governance-extraction.mjs"),
  );
  fs.copyFileSync(
    path.join(repoRoot, "scripts", "lib", "interfacectl-tooling.mjs"),
    path.join(dir, "scripts", "lib", "interfacectl-tooling.mjs"),
  );
  fs.mkdirSync(
    path.join(dir, "apps", "surfaceops-web", "prototypes", "governance", "p0004", "extraction"),
    { recursive: true },
  );
  fs.mkdirSync(path.join(dir, "contracts", "generated"), { recursive: true });
  fs.mkdirSync(path.join(interfacectlRoot, "packages", "interfacectl-cli", "dist"), {
    recursive: true,
  });
  fs.mkdirSync(path.join(interfacectlRoot, "packages", "interfacectl-validator"), {
    recursive: true,
  });

  fs.writeFileSync(
    path.join(dir, "apps", "surfaceops-web", "prototypes", "governance", "manifest.json"),
    JSON.stringify(
      {
        schemaVersion: 1,
        activePrototypeId: "p0004",
        prototypes: [
          {
            id: "p0004",
            title: "Task-First Governance UX",
            createdAt: "2026-02-13T00:00:00.000Z",
            status: "active",
            summary: "Editor-first workflow with progressive disclosure",
            sourcePaths: ["apps/surfaceops-web/app/contracts/governance"],
            seedContractPath: "apps/surfaceops-web/prototypes/governance/p0004/contract.seed.json",
            extractionPaths: {
              contract: "apps/surfaceops-web/prototypes/governance/p0004/extraction/surfaces-web.contract.json",
              report: "apps/surfaceops-web/prototypes/governance/p0004/extraction/surfaces-web.extraction.json",
            },
            notesPath: "apps/surfaceops-web/prototypes/governance/p0004/notes.md",
          },
        ],
      },
      null,
      2,
    ),
  );

  fs.writeFileSync(
    path.join(
      dir,
      "apps",
      "surfaceops-web",
      "prototypes",
      "governance",
      "p0004",
      "extraction",
      "surfaces-web.extraction.json",
    ),
    JSON.stringify({ extracted: { routes: ["/"], authAware: true, hasShell: true } }, null, 2),
  );
  fs.writeFileSync(
    path.join(
      dir,
      "apps",
      "surfaceops-web",
      "prototypes",
      "governance",
      "p0004",
      "extraction",
      "surfaces-web.contract.json",
    ),
    JSON.stringify({ contractId: "surfaces.web" }, null, 2),
  );

  fs.writeFileSync(
    path.join(interfacectlRoot, "packages", "interfacectl-cli", "package.json"),
    JSON.stringify({
      name: "@surfaces/interfacectl-cli",
      version: "0.1.0-test.1",
      main: "dist/index.js",
      bin: { interfacectl: "dist/index.js" },
    }),
  );
  fs.writeFileSync(
    path.join(interfacectlRoot, "packages", "interfacectl-validator", "package.json"),
    JSON.stringify({
      name: "@surfaces/interfacectl-validator",
      version: "0.1.0-test.1",
    }),
  );
  fs.writeFileSync(
    path.join(interfacectlRoot, "packages", "interfacectl-cli", "dist", "index.js"),
    `#!/usr/bin/env node
const fs = require("fs");
const args = process.argv.slice(2);
function value(flag) { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : undefined; }
if (args[0] === "generate-contract") {
  const out = value("--out");
  const reportOut = value("--report-out");
  if (out) fs.writeFileSync(out, JSON.stringify({ contractId: "surfaces.web" }, null, 2));
  if (reportOut) fs.writeFileSync(reportOut, JSON.stringify({ extracted: { routes: ["/", "/next"], authAware: false, hasShell: false } }, null, 2));
  process.exit(0);
}
process.exit(0);
`,
  );
  fs.chmodSync(
    path.join(interfacectlRoot, "packages", "interfacectl-cli", "dist", "index.js"),
    0o755,
  );
  fs.chmodSync(path.join(dir, "scripts", "lib", "interfacectl-tooling.mjs"), 0o755);

  return { dir, interfacectlRoot };
}

test("snapshot-governance-extraction appends p0004 snapshot and updates index", () => {
  const sandbox = makeSandbox();
  const result = spawnSync("node", ["scripts/prototypes/snapshot-governance-extraction.mjs"], {
    cwd: sandbox.dir,
    encoding: "utf8",
    env: createIsolatedResolverEnv({
      SURFACES_INTERFACECTL_ROOT: sandbox.interfacectlRoot,
    }),
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const indexPath = path.join(
    sandbox.dir,
    "apps",
    "surfaceops-web",
    "prototypes",
    "governance",
    "p0004",
    "snapshot-index.json",
  );
  assert.equal(fs.existsSync(indexPath), true);
  const index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
  assert.equal(index.schemaVersion, 1);
  assert.equal(index.snapshotIds.length, 1);
  assert.equal(index.latestSnapshotId, index.snapshotIds[0]);
  assert.equal(index.baselineSnapshotId, index.snapshotIds[0]);
  const reportPath = path.join(
    sandbox.dir,
    "apps",
    "surfaceops-web",
    "prototypes",
    "governance",
    "p0004",
    "extraction",
    "surfaces-web.extraction.json",
  );
  const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  assert.deepEqual(report.extracted.routes, ["/", "/next"]);
});
