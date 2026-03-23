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

function writeExecutable(filePath, content) {
  fs.writeFileSync(filePath, content, "utf8");
  fs.chmodSync(filePath, 0o755);
}

function makeSandbox() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "surfaces-demo-scripts-"));
  const interfacectlRoot = path.join(dir, "..", `${path.basename(dir)}-interfacectl`);

  const demoDir = path.join(dir, "scripts", "demos");
  fs.mkdirSync(demoDir, { recursive: true });
  fs.copyFileSync(
    path.join(repoRoot, "scripts", "interfacectl-tool.mjs"),
    path.join(dir, "scripts", "interfacectl-tool.mjs"),
  );
  fs.copyFileSync(
    path.join(repoRoot, "scripts", "validate-run-artifacts.mjs"),
    path.join(dir, "scripts", "validate-run-artifacts.mjs"),
  );
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
    path.join(repoRoot, "scripts", "lib", "interfacectl-tooling.mjs"),
    path.join(libDir, "interfacectl-tooling.mjs")
  );
  fs.chmodSync(path.join(dir, "scripts", "interfacectl-tool.mjs"), 0o755);
  fs.chmodSync(path.join(libDir, "interfacectl-tooling.mjs"), 0o755);

  fs.mkdirSync(path.join(dir, "contracts", "generated"), { recursive: true });
  fs.writeFileSync(path.join(dir, "contracts", "surfaces.web.contract.json"), JSON.stringify({ ok: true }, null, 2));
  fs.writeFileSync(
    path.join(dir, "contracts", "generated", "reference-target-web.contract.json"),
    JSON.stringify({ surfaces: [{ id: "reference-target-web" }] }, null, 2)
  );
  fs.writeFileSync(
    path.join(dir, "contracts", "generated", "reference-flow-web.contract.json"),
    JSON.stringify({ surfaces: [{ id: "reference-flow-web" }] }, null, 2)
  );
  fs.writeFileSync(
    path.join(dir, "contracts", "generated", "surfaces-web.extraction.json"),
    JSON.stringify({ extracted: { authAware: true } }, null, 2)
  );
  fs.writeFileSync(
    path.join(dir, "contracts", "generated", "reference-target-web.extraction.json"),
    JSON.stringify({ surfaceId: "reference-target-web", extracted: { authAware: false } }, null, 2)
  );

  fs.mkdirSync(path.join(interfacectlRoot, "tools"), { recursive: true });
  fs.mkdirSync(path.join(interfacectlRoot, "packages", "interfacectl-cli", "dist"), {
    recursive: true,
  });
  fs.mkdirSync(path.join(interfacectlRoot, "packages", "interfacectl-validator"), {
    recursive: true,
  });
  fs.mkdirSync(path.join(dir, "apps", "reference-target-web"), { recursive: true });
  fs.mkdirSync(path.join(dir, "apps", "reference-flow-web"), { recursive: true });

  fs.writeFileSync(
    path.join(interfacectlRoot, "packages", "interfacectl-cli", "package.json"),
    JSON.stringify({
      name: "@surfaces/interfacectl-cli",
      version: "0.1.0-test.1",
      main: "dist/index.js",
      bin: { interfacectl: "dist/index.js" },
    })
  );
  fs.writeFileSync(
    path.join(interfacectlRoot, "packages", "interfacectl-validator", "package.json"),
    JSON.stringify({
      name: "@surfaces/interfacectl-validator",
      version: "0.1.0-test.1",
    })
  );

  writeExecutable(
    path.join(interfacectlRoot, "tools", "check-generation-boundaries.mjs"),
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
    path.join(interfacectlRoot, "packages", "interfacectl-cli", "dist", "index.js"),
    `#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const args = process.argv.slice(2);
const cmd = args[0];
function value(flag) { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : undefined; }
if (cmd === "validate") {
  const out = value("--out");
  const contract = value("--contract") || "";
  const surface = value("--surface") || "";
  const remoteUrl = value("--remote-url") || "";
  let payload = { ok: true, findings: [] };
  let status = 0;

  const targetWarnings = [
    ["simulateUnobservableTargets=1", "target.unobservable"],
    ["simulateUndersizedActionTarget=1", "target.hit-area-too-small"],
    ["simulateTightActionGap=1", "target.gap-too-tight"],
    ["simulateEdgePinnedActionTarget=1", "target.edge-inset-too-small"],
    ["simulateCrowdedDestructiveAction=1", "target.destructive-too-close"],
  ];
  const flowWarnings = [
    ["simulateMissingReviewStep=1", "flow.steps.required"],
    ["simulateMissingConfirmTransition=1", "flow.transition.required"],
    ["simulateTerminalBackEdge=1", "flow.terminal.invalid"],
    ["simulateUnobservableFlow=1", "flow.unobservable"],
  ];

  if (contract.includes("icon.warn.contract.json")) {
    payload = {
      contractPath: contract,
      contractVersion: "0.1.0",
      summary: { errors: 0, warnings: 1 },
      findings: [
        {
          code: "icon.source-disallowed",
          severity: "warning",
          category: "E1",
          surface: "icon-demo-web",
          message: "Icon source \\"lucide-react\\" is not allowed.",
        },
      ],
    };
    status = 0;
  } else if (contract.includes("icon.strict.contract.json")) {
    payload = {
      contractPath: contract,
      contractVersion: "0.1.0",
      summary: { errors: 1, warnings: 0 },
      findings: [
        {
          code: "icon.source-disallowed",
          severity: "error",
          category: "E1",
          surface: "icon-demo-web",
          message: "Icon source \\"lucide-react\\" is not allowed.",
        },
      ],
    };
    status = 20;
  } else if (surface === "reference-target-web" && remoteUrl.length > 0) {
    const match = targetWarnings.find(([needle]) => remoteUrl.includes(needle));
    if (match) {
      payload = {
        contractPath: contract,
        contractVersion: "0.1.0",
        summary: { errors: 0, warnings: 1 },
        findings: [{ code: match[1], severity: "warning", category: "E2" }],
      };
      status = 30;
    } else {
      payload = {
        contractPath: contract,
        contractVersion: "0.1.0",
        summary: { errors: 0, warnings: 0 },
        findings: [],
      };
      status = 0;
    }
  } else if (surface === "reference-flow-web" && remoteUrl.length > 0) {
    const match = flowWarnings.find(([needle]) => remoteUrl.includes(needle));
    if (match) {
      payload = {
        contractPath: contract,
        contractVersion: "0.1.0",
        summary: { errors: 0, warnings: 1 },
        findings: [{ code: match[1], severity: "warning", category: "E2" }],
      };
      status = 30;
    } else {
      payload = {
        contractPath: contract,
        contractVersion: "0.1.0",
        summary: { errors: 0, warnings: 0 },
        findings: [],
      };
      status = 0;
    }
  }

  if (out) fs.writeFileSync(out, JSON.stringify(payload, null, 2));
  console.log(JSON.stringify(payload));
  process.exit(status);
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
    console.log(JSON.stringify({ ok: false, findings: [{ code: "phase0.load.extracted" }] }));
    process.exit(10);
  }
  console.log(JSON.stringify({ ok: true, findings: [] }));
  process.exit(0);
}
if (cmd === "emit-run-artifact") {
  const workspaceRoot = value("--workspace-root") || process.cwd();
  const surfaceId = value("--surface") || "surfaces-web";
  const source = value("--source") || "generation";
  const status = value("--status") || "unknown";
  const findingCodes = (value("--finding-codes") || "").split(",").map((entry) => entry.trim()).filter(Boolean);
  const extractionPath = value("--extraction-path");
  const reportPath = value("--report-path");
  const generatedDir = path.join(workspaceRoot, "contracts", "generated");
  const runsPath = path.join(generatedDir, "contract-runs.json");
  const lineagePath = path.join(generatedDir, "contract-lineage.json");
  fs.mkdirSync(generatedDir, { recursive: true });
  const runsDoc = fs.existsSync(runsPath)
    ? JSON.parse(fs.readFileSync(runsPath, "utf8"))
    : { schemaVersion: 2, runs: [] };
  const lineageDoc = fs.existsSync(lineagePath)
    ? JSON.parse(fs.readFileSync(lineagePath, "utf8"))
    : { schemaVersion: 1, surfaces: {} };
  const runId = "run-" + String(runsDoc.runs.length + 1);
  const createdAt = new Date("2026-03-12T00:00:00.000Z").toISOString();
  const record = {
    runId,
    workspaceId: "ws-local-default",
    ingestedAt: createdAt,
    createdAt,
    surfaceId,
    source,
    contract: {
      id: "surfaces.web",
      version: "0.1.0",
      sha256: "a".repeat(64),
    },
    artifacts: {
      ...(extractionPath ? { extractionPath } : {}),
      ...(reportPath ? { reportPath } : {}),
    },
    status,
    findingCodes,
    summary: {
      errorCount: status === "fail" ? Math.max(1, findingCodes.length) : 0,
      warnCount: status === "warn" ? Math.max(1, findingCodes.length) : 0,
    },
  };
  runsDoc.schemaVersion = 2;
  runsDoc.runs.push(record);
  lineageDoc.schemaVersion = 1;
  lineageDoc.surfaces[surfaceId] = {
    lastRunId: runId,
    lastRunAt: createdAt,
    lastSource: source,
    lastStatus: status,
    contract: record.contract,
    artifacts: record.artifacts,
    findingCodes,
  };
  fs.writeFileSync(runsPath, JSON.stringify(runsDoc, null, 2));
  fs.writeFileSync(lineagePath, JSON.stringify(lineageDoc, null, 2));
  console.log(JSON.stringify({ ok: true, deduped: false, runId, surfaceId }));
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
  if (url.includes("localhost:3000") || url.includes("localhost:3004")) { process.stdout.write("200"); process.exit(0); }
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
  body = JSON.stringify({ violations: [{ rule: "color.disallowed" }] });
}
const statusText = code === 200 ? "OK" : "Unprocessable Entity";
process.stdout.write("HTTP/1.1 " + code + " " + statusText + "\\r\\ncontent-type: application/json\\r\\n\\r\\n" + body);
`
  );

  return { dir, binDir, interfacectlRoot };
}

function runScript(scriptPath, sandbox, env = {}) {
  return spawnSync(scriptPath, {
    cwd: sandbox.dir,
    encoding: "utf8",
    env: createIsolatedResolverEnv({
      PATH: `${sandbox.binDir}:${process.env.PATH}`,
      SURFACES_INTERFACECTL_ROOT: sandbox.interfacectlRoot,
      ...env,
    }),
  });
}

test("demo-generation script enforces fail then pass", () => {
  const sandbox = makeSandbox();
  const script = path.join(sandbox.dir, "scripts", "demos", "demo-generation.sh");
  const result = runScript(script, sandbox);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /shell-owned-primitive-emitted/);
  assert.match(
    result.stdout,
    /Icon-source policy enforcement is deferred to CI\/CD time workspace validation/
  );
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
  assert.equal(lineage.surfaces["reference-target-web"].lastSource, "bootstrap");
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
  assert.match(result.stdout, /icon.source-disallowed/);
  assert.match(result.stdout, /phase0.load.extracted/);
  assert.match(result.stdout, /Canonical extracted artifact passes/);
  assert.match(result.stdout, /Demo complete: CI\/CD fail->pass with SurfaceOps correlation proved/);
  const runs = JSON.parse(
    fs.readFileSync(path.join(sandbox.dir, "contracts", "generated", "contract-runs.json"), "utf8")
  );
  const ciRuns = runs.runs.filter((run) => run.source === "ci");
  assert.equal(ciRuns.length, 4);
  assert.ok(
    ciRuns.some(
      (run) =>
        run.status === "warn" && run.findingCodes.includes("icon.source-disallowed")
    )
  );
  assert.ok(
    ciRuns.some(
      (run) =>
        run.status === "fail" && run.findingCodes.includes("icon.source-disallowed")
    )
  );
  assert.ok(
    ciRuns.some(
      (run) =>
        run.status === "fail" && run.findingCodes.includes("phase0.load.extracted")
    )
  );
  assert.ok(ciRuns.some((run) => run.status === "pass"));
});

test("demo-ci-surfaceops supports ICON_PILOT_MODE=warn", () => {
  const sandbox = makeSandbox();
  const script = path.join(sandbox.dir, "scripts", "demos", "demo-ci-surfaceops.sh");
  const result = runScript(script, sandbox, {
    SKIP_BUILD: "1",
    NODE_BIN: "node",
    PNPM_BIN: "pnpm",
    ICON_PILOT_MODE: "warn",
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /Icon warn finding confirmed/);
  assert.match(result.stdout, /Skipping icon strict pilot path/);
  assert.doesNotMatch(result.stdout, /Icon strict finding confirmed/);

  const runs = JSON.parse(
    fs.readFileSync(path.join(sandbox.dir, "contracts", "generated", "contract-runs.json"), "utf8")
  );
  const ciRuns = runs.runs.filter((run) => run.source === "ci");
  assert.equal(ciRuns.length, 3);
  assert.ok(
    ciRuns.some(
      (run) =>
        run.status === "warn" && run.findingCodes.includes("icon.source-disallowed")
    )
  );
  assert.ok(
    ciRuns.some(
      (run) =>
        run.status === "fail" && run.findingCodes.includes("phase0.load.extracted")
    )
  );
  assert.ok(ciRuns.some((run) => run.status === "pass"));
  assert.equal(
    ciRuns.some(
      (run) =>
        run.status === "fail" && run.findingCodes.includes("icon.source-disallowed")
    ),
    false
  );
});

test("demo-ci-surfaceops supports ICON_PILOT_MODE=strict", () => {
  const sandbox = makeSandbox();
  const script = path.join(sandbox.dir, "scripts", "demos", "demo-ci-surfaceops.sh");
  const result = runScript(script, sandbox, {
    SKIP_BUILD: "1",
    NODE_BIN: "node",
    PNPM_BIN: "pnpm",
    ICON_PILOT_MODE: "strict",
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /Icon strict finding confirmed/);
  assert.match(result.stdout, /Skipping icon warn pilot path/);
  assert.doesNotMatch(result.stdout, /Icon warn finding confirmed/);

  const runs = JSON.parse(
    fs.readFileSync(path.join(sandbox.dir, "contracts", "generated", "contract-runs.json"), "utf8")
  );
  const ciRuns = runs.runs.filter((run) => run.source === "ci");
  assert.equal(ciRuns.length, 3);
  assert.ok(
    ciRuns.some(
      (run) =>
        run.status === "fail" && run.findingCodes.includes("icon.source-disallowed")
    )
  );
  assert.ok(
    ciRuns.some(
      (run) =>
        run.status === "fail" && run.findingCodes.includes("phase0.load.extracted")
    )
  );
  assert.ok(ciRuns.some((run) => run.status === "pass"));
  assert.equal(
    ciRuns.some(
      (run) =>
        run.status === "warn" && run.findingCodes.includes("icon.source-disallowed")
    ),
    false
  );
});

test("demo-ci-surfaceops supports ICON_PILOT_FIXTURE_SURFACE_ID override", () => {
  const sandbox = makeSandbox();
  const script = path.join(sandbox.dir, "scripts", "demos", "demo-ci-surfaceops.sh");
  const result = runScript(script, sandbox, {
    SKIP_BUILD: "1",
    NODE_BIN: "node",
    PNPM_BIN: "pnpm",
    ICON_PILOT_MODE: "warn",
    ICON_PILOT_FIXTURE_SURFACE_ID: "custom-icon-web",
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /fixture surface: custom-icon-web/);
});

test("demo-runtime-surfaceops script supports the default reference-target profile", () => {
  const sandbox = makeSandbox();
  const script = path.join(sandbox.dir, "scripts", "demos", "demo-runtime-surfaceops.sh");
  const result = runScript(script, sandbox);

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /Ensure apps are running: pnpm dev:reference-target and pnpm dev:surfaceops/);
  assert.match(result.stdout, /Runtime demo profile: reference-target/);
  assert.match(result.stdout, /target\.unobservable/);
  assert.match(result.stdout, /target\.destructive-too-close/);
  assert.match(result.stdout, /\[validate-run-artifacts\] OK/);
  assert.match(result.stdout, /Open SurfaceOps runs detail: http:\/\/localhost:3001\/contracts\/runs\/reference-target-web/);
  assert.match(result.stdout, /Demo complete: runtime evidence with SurfaceOps correlation proved/);
  const runs = JSON.parse(
    fs.readFileSync(path.join(sandbox.dir, "contracts", "generated", "contract-runs.json"), "utf8")
  );
  const runtimeRuns = runs.runs.filter((run) => run.source === "runtime");
  assert.equal(runtimeRuns.length, 6);
  assert.equal(runtimeRuns.filter((run) => run.surfaceId === "reference-target-web").length, 6);
  assert.equal(runtimeRuns.filter((run) => run.status === "warn").length, 5);
  assert.equal(runtimeRuns.filter((run) => run.status === "pass").length, 1);
});

test("demo-runtime-surfaceops supports the reference-flow profile", () => {
  const sandbox = makeSandbox();
  const script = path.join(sandbox.dir, "scripts", "demos", "demo-runtime-surfaceops.sh");
  const result = runScript(script, sandbox, {
    RUNTIME_DEMO_PROFILE: "reference-flow",
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /Runtime demo profile: reference-flow/);
  assert.match(result.stdout, /Ensure apps are running: pnpm --filter reference-flow-web dev and pnpm dev:surfaceops/);
  assert.match(result.stdout, /flow\.steps\.required/);
  assert.match(result.stdout, /flow\.transition\.required/);
  assert.match(result.stdout, /flow\.terminal\.invalid/);
  assert.match(result.stdout, /flow\.unobservable/);
  assert.match(result.stdout, /\[validate-run-artifacts\] OK/);
  assert.match(result.stdout, /Open SurfaceOps runs detail: http:\/\/localhost:3001\/contracts\/runs\/reference-flow-web/);
  const runs = JSON.parse(
    fs.readFileSync(path.join(sandbox.dir, "contracts", "generated", "contract-runs.json"), "utf8")
  );
  const runtimeRuns = runs.runs.filter((run) => run.source === "runtime");
  assert.equal(runtimeRuns.length, 5);
  assert.equal(runtimeRuns.filter((run) => run.surfaceId === "reference-flow-web").length, 5);
  assert.equal(runtimeRuns.filter((run) => run.status === "warn").length, 4);
  assert.equal(runtimeRuns.filter((run) => run.status === "pass").length, 1);
  assert.deepEqual(
    runtimeRuns.flatMap((run) => run.findingCodes).filter(Boolean).sort(),
    [
      "flow.steps.required",
      "flow.terminal.invalid",
      "flow.transition.required",
      "flow.unobservable",
    ]
  );
});

test("demo-runtime-surfaceops fails fast for unsupported profiles", () => {
  const sandbox = makeSandbox();
  const script = path.join(sandbox.dir, "scripts", "demos", "demo-runtime-surfaceops.sh");
  const result = runScript(script, sandbox, {
    RUNTIME_DEMO_PROFILE: "not-a-profile",
  });

  assert.equal(result.status, 1, result.stderr || result.stdout);
  assert.match(result.stderr || result.stdout, /RUNTIME_DEMO_PROFILE must be one of: reference-target, reference-flow/);
});
