#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

function fail(message) {
  console.error(`[verify-icon-strict-pilot] ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--reports-dir") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        fail("Missing value for --reports-dir");
      }
      args.reportsDir = value;
      index += 1;
      continue;
    }
    if (token === "--skip-run") {
      args.skipRun = true;
      continue;
    }
    if (token === "--help" || token === "-h") {
      args.help = true;
      continue;
    }
    fail(`Unknown argument: ${token}`);
  }
  return args;
}

function usage() {
  console.log(`Usage: node scripts/verify-icon-strict-pilot.mjs [--reports-dir <path>] [--skip-run]\n\nBy default this script runs scripts/demos/demo-ci-surfaceops.sh in ICON_PILOT_MODE=both,\nexports icon pilot reports, and verifies warn/strict behavior.`);
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    fail(`Failed to parse JSON ${filePath}: ${error.message}`);
  }
}

function assert(condition, message) {
  if (!condition) {
    fail(message);
  }
}

function assertIconFinding(payload, expectedSeverity, label) {
  const findings = Array.isArray(payload.findings) ? payload.findings : [];
  const finding = findings.find((entry) => entry.code === "icon.source-disallowed");
  assert(Boolean(finding), `${label}: missing icon.source-disallowed finding`);
  assert(
    finding.severity === expectedSeverity,
    `${label}: expected severity ${expectedSeverity}, found ${finding.severity}`
  );
}

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  usage();
  process.exit(0);
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const demoScriptPath = path.join(repoRoot, "scripts", "demos", "demo-ci-surfaceops.sh");

const reportsDir = args.reportsDir
  ? path.resolve(args.reportsDir)
  : fs.mkdtempSync(path.join(os.tmpdir(), "icon-strict-pilot-"));

if (!args.skipRun) {
  fs.mkdirSync(reportsDir, { recursive: true });
  const demoResult = spawnSync(demoScriptPath, {
    cwd: repoRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      ICON_PILOT_MODE: "both",
      ICON_PILOT_OUTPUT_DIR: reportsDir,
    },
  });

  if (demoResult.stdout) process.stdout.write(demoResult.stdout);
  if (demoResult.stderr) process.stderr.write(demoResult.stderr);

  assert(demoResult.status === 0, `demo-ci-surfaceops.sh exited with code ${demoResult.status}`);
} else {
  assert(fs.existsSync(reportsDir), `reports directory not found: ${reportsDir}`);
}

const warnReportPath = path.join(reportsDir, "icon.warn.report.json");
const strictReportPath = path.join(reportsDir, "icon.strict.report.json");
const warnMetaPath = path.join(reportsDir, "icon.warn.meta.json");
const strictMetaPath = path.join(reportsDir, "icon.strict.meta.json");

for (const filePath of [warnReportPath, strictReportPath, warnMetaPath, strictMetaPath]) {
  assert(fs.existsSync(filePath), `missing expected pilot artifact: ${filePath}`);
}

const warnReport = readJson(warnReportPath);
const strictReport = readJson(strictReportPath);
const warnMeta = readJson(warnMetaPath);
const strictMeta = readJson(strictMetaPath);

assertIconFinding(warnReport, "warning", "warn-mode report");
assertIconFinding(strictReport, "error", "strict-mode report");

assert(warnMeta.findingCode === "icon.source-disallowed", "warn meta finding code mismatch");
assert(strictMeta.findingCode === "icon.source-disallowed", "strict meta finding code mismatch");
assert(warnMeta.severity === "warning", "warn meta severity mismatch");
assert(strictMeta.severity === "error", "strict meta severity mismatch");
assert(warnMeta.exitCode === 0, `warn mode expected exit code 0, found ${warnMeta.exitCode}`);
assert(strictMeta.exitCode === 20, `strict mode expected exit code 20, found ${strictMeta.exitCode}`);

console.log(`[verify-icon-strict-pilot] PASS: warn and strict icon pilot checks verified (${reportsDir})`);
