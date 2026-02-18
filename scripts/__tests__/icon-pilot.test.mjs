import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const repoRoot = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), "../.."));

function writePilotArtifact(dirPath, name, payload) {
  fs.writeFileSync(path.join(dirPath, name), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function runVerifier(reportsDir) {
  return spawnSync("node", ["./scripts/verify-icon-strict-pilot.mjs", "--reports-dir", reportsDir, "--skip-run"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
}

function makeReportsDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "icon-pilot-test-"));

  writePilotArtifact(dir, "icon.warn.report.json", {
    findings: [{ code: "icon.source-disallowed", severity: "warning" }],
  });
  writePilotArtifact(dir, "icon.strict.report.json", {
    findings: [{ code: "icon.source-disallowed", severity: "error" }],
  });
  writePilotArtifact(dir, "icon.warn.meta.json", {
    mode: "warn",
    exitCode: 0,
    findingCode: "icon.source-disallowed",
    severity: "warning",
  });
  writePilotArtifact(dir, "icon.strict.meta.json", {
    mode: "strict",
    exitCode: 20,
    findingCode: "icon.source-disallowed",
    severity: "error",
  });

  return dir;
}

test("verify-icon-strict-pilot validates exported warn/strict artifacts", () => {
  const reportsDir = makeReportsDir();
  const result = runVerifier(reportsDir);

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /PASS: warn and strict icon pilot checks verified/);
});

test("verify-icon-strict-pilot fails when strict exit code is not blocking", () => {
  const reportsDir = makeReportsDir();
  writePilotArtifact(reportsDir, "icon.strict.meta.json", {
    mode: "strict",
    exitCode: 0,
    findingCode: "icon.source-disallowed",
    severity: "error",
  });

  const result = runVerifier(reportsDir);

  assert.equal(result.status, 1, "expected strict mismatch to fail verifier");
  assert.match(result.stderr, /strict mode expected exit code 20/);
});
