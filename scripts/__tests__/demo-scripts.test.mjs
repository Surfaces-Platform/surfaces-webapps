import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const repoRoot = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), "../.."));

function writeExecutable(filePath, content) {
  fs.writeFileSync(filePath, content, "utf8");
  fs.chmodSync(filePath, 0o755);
}

function makeSandbox() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "surfaces-demo-scripts-"));

  const demoDir = path.join(dir, "scripts", "demos");
  fs.mkdirSync(demoDir, { recursive: true });
  for (const scriptName of [
    "demo-bootstrap-contract.sh",
    "demo-generation.sh",
    "demo-ci-surfaceops.sh",
    "demo-runtime-surfaceops.sh",
  ]) {
    const src = path.join(repoRoot, "scripts", "demos", scriptName);
    const dest = path.join(demoDir, scriptName);
    fs.copyFileSync(src, dest);
    fs.chmodSync(dest, 0o755);
  }
  const libDir = path.join(dir, "scripts", "lib");
  fs.mkdirSync(libDir, { recursive: true });
  fs.copyFileSync(
    path.join(repoRoot, "scripts", "lib", "contract-runs.mjs"),
    path.join(libDir, "contract-runs.mjs")
  );
  fs.chmodSync(path.join(libDir, "contract-runs.mjs"), 0o755);

  fs.mkdirSync(path.join(dir, "contracts", "generated"), { recursive: true });
  fs.writeFileSync(path.join(dir, "contracts", "surfaces.web.contract.json"), JSON.stringify({ ok: true }, null, 2));
  fs.writeFileSync(
    path.join(dir, "contracts", "generated", "surfaces-web.extraction.json"),
    JSON.stringify({ extracted: { authAware: true } }, null, 2)
  );

  fs.mkdirSync(path.join(dir, "tools", "interfacectl", "tools"), { recursive: true });
  fs.mkdirSync(path.join(dir, "tools", "interfacectl", "packages", "interfacectl-cli", "dist"), {
    recursive: true,
  });

  writeExecutable(
    path.join(dir, "tools", "interfacectl", "tools", "check-generation-boundaries.mjs"),
    `#!/usr/bin/env node
const args = process.argv.slice(2);
const idx = args.indexOf("--descriptor");
const descriptor = idx >= 0 ? args[idx + 1] : "";
if (descriptor.includes("descriptor.bad")) {
  console.error("shell-owned-primitive-emitted detected");
  process.exit(2);
}
console.log("guard pass");
`
  );

  writeExecutable(
    path.join(dir, "tools", "interfacectl", "packages", "interfacectl-cli", "dist", "index.js"),
    `#!/usr/bin/env node
const fs = require("fs");
const args = process.argv.slice(2);
const cmd = args[0];
function value(flag) { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : undefined; }
if (cmd === "validate") {
  const out = value("--out");
  if (out) fs.writeFileSync(out, JSON.stringify({ ok: true }, null, 2));
  console.log(JSON.stringify({ ok: true }));
  process.exit(0);
}
if (cmd === "generate-contract") {
  const out = value("--out");
  const reportOut = value("--report-out");
  const surface = value("--surface") || "surfaces-web";
  if (out) {
    fs.writeFileSync(
      out,
      JSON.stringify(
        {
          contractId: "surfaces.web",
          version: "0.1.0",
          sections: [{ id: "landing.hero" }, { id: "landing.guidance" }],
          surfaces: [{ id: surface }],
        },
        null,
        2
      )
    );
  }
  if (reportOut) {
    fs.writeFileSync(
      reportOut,
      JSON.stringify(
        {
          surfaceId: surface,
          extracted: {
            routes: ["/auth/login", "/auth/callback", "/auth/session", "/auth/logout"],
            designSystemComponents: ["Navigation"],
          },
        },
        null,
        2
      )
    );
  }
  process.exit(0);
}
if (cmd === "validate-extracted") {
  const extracted = value("--extracted") || "";
  if (extracted.includes(".bad.")) {
    console.log(JSON.stringify({ ok: false, findings: [{ code: "phase0.authPosture.mismatch" }] }));
    process.exit(30);
  }
  console.log(JSON.stringify({ ok: true, findings: [] }));
  process.exit(0);
}
console.log(JSON.stringify({ ok: true }));
`
  );

  const binDir = path.join(dir, "bin");
  fs.mkdirSync(binDir, { recursive: true });

  writeExecutable(
    path.join(binDir, "pnpm"),
    `#!/usr/bin/env bash
# mock pnpm: succeed for any command
exit 0
`
  );

  writeExecutable(
    path.join(binDir, "curl"),
    `#!/usr/bin/env node
const args = process.argv.slice(2);
const url = args[args.length - 1] || "";
const writeIdx = args.indexOf("-w");
if (writeIdx >= 0) {
  if (url.includes("/auth/session")) { process.stdout.write("200"); process.exit(0); }
  if (url.includes("localhost:3000")) { process.stdout.write("200"); process.exit(0); }
  process.stdout.write("000");
  process.exit(0);
}
const hIdx = args.indexOf("-H");
const header = hIdx >= 0 ? args[hIdx + 1] : "";
let code = 200;
let body = "Adaptive Test";
if (url.includes("/adaptive/test") && !url.includes("section=")) {
  code = 422;
  body = JSON.stringify({ violations: [{ rule: "sections.required" }] });
} else if (header.includes("rgba(")) {
  code = 422;
  body = JSON.stringify({ violations: [{ rule: "color.rawValues" }] });
}
const statusText = code === 200 ? "OK" : "Unprocessable Entity";
process.stdout.write("HTTP/1.1 " + code + " " + statusText + "\\r\\ncontent-type: application/json\\r\\n\\r\\n" + body);
`
  );

  return { dir, binDir };
}

function runScript(scriptPath, sandbox, env = {}) {
  return spawnSync(scriptPath, {
    cwd: sandbox.dir,
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${sandbox.binDir}:${process.env.PATH}`,
      ...env,
    },
  });
}

test("demo-generation script enforces fail then pass", () => {
  const sandbox = makeSandbox();
  const script = path.join(sandbox.dir, "scripts", "demos", "demo-generation.sh");
  const result = runScript(script, sandbox);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /shell-owned-primitive-emitted/);
  assert.match(result.stdout, /Demo complete: generation fail->pass proved/);
  const runs = JSON.parse(
    fs.readFileSync(path.join(sandbox.dir, "contracts", "generated", "contract-runs.json"), "utf8")
  );
  assert.equal(runs.runs.length, 2);
  assert.equal(runs.runs[0].source, "generation");
  assert.equal(runs.runs[0].status, "fail");
  assert.equal(runs.runs[1].status, "pass");
});

test("demo-bootstrap-contract script bootstraps and validates extraction", () => {
  const sandbox = makeSandbox();
  const script = path.join(sandbox.dir, "scripts", "demos", "demo-bootstrap-contract.sh");
  const result = runScript(script, sandbox, {
    SKIP_BUILD: "1",
    NODE_BIN: "node",
    PNPM_BIN: "pnpm",
    PROMOTE_BOOTSTRAP: "1",
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /Promote mode enabled/);
  assert.match(result.stdout, /Bootstrap extraction complies with canonical contract/);
  assert.match(result.stdout, /Demo complete: bootstrap proved/);
  const lineage = JSON.parse(
    fs.readFileSync(path.join(sandbox.dir, "contracts", "generated", "contract-lineage.json"), "utf8")
  );
  assert.equal(lineage.surfaces["surfaces-web"].lastSource, "bootstrap");
});

test("demo-ci-surfaceops script asserts CI failure code and recovers", () => {
  const sandbox = makeSandbox();
  const script = path.join(sandbox.dir, "scripts", "demos", "demo-ci-surfaceops.sh");
  const result = runScript(script, sandbox, {
    SKIP_BUILD: "1",
    NODE_BIN: "node",
    PNPM_BIN: "pnpm",
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /phase0.authPosture.mismatch/);
  assert.match(result.stdout, /Canonical extracted artifact passes/);
  assert.match(result.stdout, /Demo complete: CI\/CD fail->pass with SurfaceOps correlation proved/);
  const runs = JSON.parse(
    fs.readFileSync(path.join(sandbox.dir, "contracts", "generated", "contract-runs.json"), "utf8")
  );
  const ciRuns = runs.runs.filter((run) => run.source === "ci");
  assert.equal(ciRuns.length, 2);
  assert.equal(ciRuns[0].status, "fail");
  assert.equal(ciRuns[1].status, "pass");
});

test("demo-runtime-surfaceops script asserts runtime 422 and 200 paths", () => {
  const sandbox = makeSandbox();
  const script = path.join(sandbox.dir, "scripts", "demos", "demo-runtime-surfaceops.sh");
  const result = runScript(script, sandbox, {
    CURL_BIN: "curl",
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /Ensure apps are running: pnpm dev:surfaces and pnpm dev:surfaceops/);
  assert.match(result.stdout, /sections.required/);
  assert.match(result.stdout, /color.rawValues/);
  assert.match(result.stdout, /Demo complete: runtime gating with SurfaceOps correlation proved/);
  const runs = JSON.parse(
    fs.readFileSync(path.join(sandbox.dir, "contracts", "generated", "contract-runs.json"), "utf8")
  );
  const runtimeRuns = runs.runs.filter((run) => run.source === "runtime");
  assert.equal(runtimeRuns.length, 3);
  assert.equal(runtimeRuns[0].status, "fail");
  assert.equal(runtimeRuns[1].status, "fail");
  assert.equal(runtimeRuns[2].status, "pass");
});
