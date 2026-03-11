#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { resolveCliTool } from "../lib/interfacectl-tooling.mjs";

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    i += 1;
  }
  return args;
}

function fail(message) {
  console.error(`[prototype:snapshot] ${message}`);
  process.exit(1);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf-8");
}

function copyFile(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

function makeSnapshotId(now = new Date()) {
  return now.toISOString().replace(/[-:]/g, "").replace(".", "").replace("Z", "Z");
}

function appendP0003Snapshot(root, selected, generatedReportPath) {
  const prototypeDir = path.join(
    root,
    "apps",
    "surfaceops-web",
    "prototypes",
    "governance",
    selected.id,
  );
  const snapshotsDir = path.join(prototypeDir, "snapshots");
  const indexPath = path.join(prototypeDir, "snapshot-index.json");

  fs.mkdirSync(snapshotsDir, { recursive: true });
  const index = fs.existsSync(indexPath)
    ? readJson(indexPath)
    : {
        schemaVersion: 1,
        prototypeId: selected.id,
        snapshotIds: [],
        entries: {},
        latestSnapshotId: null,
        baselineSnapshotId: null,
      };

  let snapshotId = makeSnapshotId(new Date());
  while (index.entries[snapshotId]) {
    snapshotId = makeSnapshotId(new Date(Date.now() + 1));
  }
  const createdAt = new Date().toISOString();
  const snapshotPath = path.join(snapshotsDir, `${snapshotId}.extraction.json`);
  fs.copyFileSync(generatedReportPath, snapshotPath);

  index.snapshotIds.push(snapshotId);
  index.entries[snapshotId] = {
    snapshotId,
    createdAt,
    filePath: path.relative(prototypeDir, snapshotPath).replaceAll(path.sep, "/"),
  };
  index.latestSnapshotId = snapshotId;
  if (!index.baselineSnapshotId) {
    index.baselineSnapshotId = snapshotId;
  }
  writeJson(indexPath, index);
  return { snapshotId, createdAt, indexPath };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const root = path.resolve(args.root || process.cwd());

  const manifestPath = path.join(
    root,
    "apps",
    "surfaceops-web",
    "prototypes",
    "governance",
    "manifest.json",
  );
  if (!fs.existsSync(manifestPath)) fail(`Manifest not found: ${manifestPath}`);
  const manifest = readJson(manifestPath);

  const requestedPrototype = args.prototype;
  const selected = manifest.prototypes.find((p) => p.id === (requestedPrototype || manifest.activePrototypeId));
  if (!selected) fail(`Prototype not found: ${requestedPrototype || manifest.activePrototypeId}`);

  const cliPath = resolveCliTool({ cwd: root }).path;

  const generatedContractPath = path.join(root, "contracts", "generated", "surfaces-web.contract.json");
  const generatedReportPath = path.join(root, "contracts", "generated", "surfaces-web.extraction.json");

  const generate = spawnSync(
    "node",
    [
      cliPath,
      "generate-contract",
      "--app-root",
      "apps/surfaces-web",
      "--surface",
      "surfaces-web",
      "--out",
      "contracts/generated/surfaces-web.contract.json",
      "--report-out",
      "contracts/generated/surfaces-web.extraction.json",
    ],
    { cwd: root, stdio: "inherit" },
  );
  if (generate.status !== 0) fail("generate-contract failed.");

  copyFile(generatedContractPath, path.join(root, selected.extractionPaths.contract));
  copyFile(generatedReportPath, path.join(root, selected.extractionPaths.report));

  const payload = {
    ok: true,
    prototypeId: selected.id,
    contractPath: selected.extractionPaths.contract,
    reportPath: selected.extractionPaths.report,
  };

  if (selected.id === "p0004") {
    const snapshot = appendP0003Snapshot(root, selected, generatedReportPath);
    payload.snapshotId = snapshot.snapshotId;
    payload.snapshotCreatedAt = snapshot.createdAt;
    payload.snapshotIndexPath = path.relative(root, snapshot.indexPath).replaceAll(path.sep, "/");
  }

  console.log(JSON.stringify(payload, null, 2));
}

main();
