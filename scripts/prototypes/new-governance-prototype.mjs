#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

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
  console.error(`[prototype:new] ${message}`);
  process.exit(1);
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf-8");
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function nextPrototypeId(existingIds) {
  const max = existingIds.reduce((acc, id) => {
    const n = Number(id.slice(1));
    return Number.isFinite(n) ? Math.max(acc, n) : acc;
  }, 0);
  return `p${String(max + 1).padStart(4, "0")}`;
}

function copyFile(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const root = path.resolve(args.root || process.cwd());
  const title = args.title;
  const summary = args.summary;
  const activate = args.activate !== "false";

  if (!title) fail("Missing --title");
  if (!summary) fail("Missing --summary");

  const baseDir = path.join(root, "apps", "surfaceops-web", "prototypes", "governance");
  const manifestPath = path.join(baseDir, "manifest.json");
  if (!fs.existsSync(manifestPath)) fail(`Manifest not found: ${manifestPath}`);

  const manifest = readJson(manifestPath);
  const id = nextPrototypeId(manifest.prototypes.map((p) => p.id));
  const sourceId = args.from && args.from !== "active" ? args.from : manifest.activePrototypeId;
  const source = manifest.prototypes.find((p) => p.id === sourceId);
  if (!source) fail(`Source prototype not found: ${sourceId}`);

  const prototypeDir = path.join(baseDir, id);
  fs.mkdirSync(path.join(prototypeDir, "extraction"), { recursive: true });

  const seedContractPath = path.join(root, source.seedContractPath);
  const sourceContractPath = path.join(root, source.extractionPaths.contract);
  const sourceReportPath = path.join(root, source.extractionPaths.report);

  copyFile(seedContractPath, path.join(prototypeDir, "contract.seed.json"));
  copyFile(sourceContractPath, path.join(prototypeDir, "extraction", "surfaces-web.contract.json"));
  copyFile(sourceReportPath, path.join(prototypeDir, "extraction", "surfaces-web.extraction.json"));

  fs.writeFileSync(
    path.join(prototypeDir, "README.md"),
    `# ${id} - ${title}\n\nDerived from ${source.id}.\n`,
    "utf-8",
  );

  fs.writeFileSync(
    path.join(prototypeDir, "notes.md"),
    `# ${id} Notes\n\n## Intent\n${summary}\n\n## Changes from ${source.id}\n- TODO\n`,
    "utf-8",
  );

  const entry = {
    id,
    title,
    createdAt: new Date().toISOString(),
    status: "experimental",
    summary,
    sourcePaths: ["apps/surfaceops-web/app/contracts/governance"],
    seedContractPath: `apps/surfaceops-web/prototypes/governance/${id}/contract.seed.json`,
    extractionPaths: {
      contract: `apps/surfaceops-web/prototypes/governance/${id}/extraction/surfaces-web.contract.json`,
      report: `apps/surfaceops-web/prototypes/governance/${id}/extraction/surfaces-web.extraction.json`,
    },
    notesPath: `apps/surfaceops-web/prototypes/governance/${id}/notes.md`,
  };

  manifest.prototypes.push(entry);
  if (activate) {
    manifest.prototypes = manifest.prototypes.map((p) =>
      p.id === id
        ? { ...p, status: "active" }
        : p.status === "active"
          ? { ...p, status: "archived" }
          : p,
    );
    manifest.activePrototypeId = id;
  }

  writeJson(manifestPath, manifest);
  console.log(JSON.stringify({ ok: true, id, activated: activate }, null, 2));
}

main();
