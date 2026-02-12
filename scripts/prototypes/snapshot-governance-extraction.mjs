#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

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

function copyFile(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
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

  const cliPath = path.join(root, "tools", "interfacectl", "packages", "interfacectl-cli", "dist", "index.js");
  if (!fs.existsSync(cliPath)) fail(`interfacectl CLI not built: ${cliPath}`);

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

  console.log(
    JSON.stringify(
      {
        ok: true,
        prototypeId: selected.id,
        contractPath: selected.extractionPaths.contract,
        reportPath: selected.extractionPaths.report,
      },
      null,
      2,
    ),
  );
}

main();
