import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const repoRoot = path.resolve(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "../..")
);

const cliPath = path.join(
  repoRoot,
  "tools/interfacectl/packages/interfacectl-cli/dist/index.js"
);
const guardPath = path.join(
  repoRoot,
  "tools/interfacectl/tools/check-generation-boundaries.mjs"
);

function runNode(args, cwd = repoRoot) {
  return spawnSync("node", args, {
    cwd,
    encoding: "utf8",
    env: process.env,
  });
}

function buildValidExtractedFixture(surfaceId) {
  return {
    surfaceId,
    appRoot: "/tmp",
    extracted: {
      authAware: true,
      hasShell: true,
      designSystemComponents: ["Button"],
      routes: ["/auth/login", "/auth/callback", "/auth/session", "/auth/logout"],
    },
  };
}

test("runtime edge smoke examples remain healthy", () => {
  const buildManifest = runNode(["docs/interfacectl/examples/edge/build-manifest.mjs"]);
  assert.equal(buildManifest.status, 0, buildManifest.stderr || buildManifest.stdout);

  const testEdge = runNode(["docs/interfacectl/examples/edge/test-edge.mjs"]);
  assert.equal(testEdge.status, 0, testEdge.stderr || testEdge.stdout);
  assert.match(testEdge.stdout, /edge tests passed/);
});

test("ci validation commands remain healthy", () => {
  assert.ok(fs.existsSync(cliPath), `CLI not found at ${cliPath}`);
  const artifactsDir = fs.mkdtempSync(path.join(os.tmpdir(), "surfaces-e2e-artifacts-"));
  const reportPath = path.join(artifactsDir, "interfacectl-report.e2e.json");
  const extractedPath = path.join(artifactsDir, "surfaces-web.extraction.json");

  const validate = runNode([
    cliPath,
    "validate",
    "--workspace-root",
    ".",
    "--contract",
    "./contracts/surfaces.web.contract.json",
    "--format",
    "json",
    "--out",
    reportPath,
  ]);
  assert.equal(validate.status, 0, validate.stderr || validate.stdout);
  assert.ok(fs.existsSync(reportPath), "Expected JSON validation artifact to be written.");

  const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  assert.equal(typeof report, "object");

  fs.writeFileSync(extractedPath, JSON.stringify(buildValidExtractedFixture("surfaces-web"), null, 2));

  const validateExtracted = runNode([
    cliPath,
    "validate-extracted",
    "--contract",
    "./contracts/surfaces.web.contract.json",
    "--extracted",
    extractedPath,
    "--surface",
    "surfaces-web",
    "--exit-codes",
    "v2",
  ]);
  assert.equal(validateExtracted.status, 0, validateExtracted.stderr || validateExtracted.stdout);
});

test("ci validation failure path emits non-zero exit and finding codes", async () => {
  assert.ok(fs.existsSync(cliPath), `CLI not found at ${cliPath}`);
  const tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), "surfaces-e2e-validate-extracted-"));
  const badExtractedPath = path.join(tmpDir, "surfaces-web.extraction.bad.json");
  const extracted = buildValidExtractedFixture("surfaces-web");
  // surfaces-web contract expects auth-aware in phase0; forcing false should trigger E2 mismatch.
  extracted.extracted = extracted.extracted || {};
  extracted.extracted.authAware = false;
  await fsp.writeFile(badExtractedPath, JSON.stringify(extracted, null, 2));

  const result = runNode([
    cliPath,
    "validate-extracted",
    "--contract",
    "./contracts/surfaces.web.contract.json",
    "--extracted",
    badExtractedPath,
    "--surface",
    "surfaces-web",
    "--format",
    "json",
    "--exit-codes",
    "v2",
  ]);

  assert.equal(result.status, 30, result.stderr || result.stdout);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, false);
  assert.ok(
    payload.findings.some((finding) => finding.code === "phase0.authPosture.mismatch"),
    `Expected phase0.authPosture.mismatch in findings. Got: ${JSON.stringify(payload.findings)}`
  );
});

test("generation guard blocks disallowed primitives and allows shell sources", async () => {
  const tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), "surfaces-gen-guard-"));
  const contractPath = path.join(tmpDir, "contract.json");
  const badDescriptorPath = path.join(tmpDir, "descriptor.bad.json");
  const goodDescriptorPath = path.join(tmpDir, "descriptor.good.json");

  const contract = {
    contractId: "demo",
    version: "1.0.0",
    sections: [],
    constraints: { motion: { allowedDurationsMs: [120], allowedTimingFunctions: ["linear"] } },
    surfaces: [
      {
        id: "surfaceops-web",
        displayName: "SurfaceOps",
        type: "web",
        requiredSections: [],
        allowedFonts: ["Inter"],
        layout: { maxContentWidth: 1120 },
        mustNotEmit: ["navigation"],
        shellOwnedPrimitiveAllowSources: ["apps/surfaceops-web/app/layout.tsx"],
      },
    ],
  };
  const badDescriptor = [
    {
      surfaceId: "surfaceops-web",
      primitives: [{ role: "navigation", count: 1, sources: ["apps/surfaceops-web/app/contracts/page.tsx"] }],
    },
  ];
  const goodDescriptor = [
    {
      surfaceId: "surfaceops-web",
      primitives: [{ role: "navigation", count: 1, sources: ["apps/surfaceops-web/app/layout.tsx"] }],
    },
  ];

  await fsp.writeFile(contractPath, JSON.stringify(contract, null, 2));
  await fsp.writeFile(badDescriptorPath, JSON.stringify(badDescriptor, null, 2));
  await fsp.writeFile(goodDescriptorPath, JSON.stringify(goodDescriptor, null, 2));

  const badRun = runNode([guardPath, "--contract", contractPath, "--descriptor", badDescriptorPath]);
  assert.equal(badRun.status, 2, badRun.stderr || badRun.stdout);
  assert.match(badRun.stderr, /shell-owned-primitive-emitted detected/);

  const goodRun = runNode([guardPath, "--contract", contractPath, "--descriptor", goodDescriptorPath]);
  assert.equal(goodRun.status, 0, goodRun.stderr || goodRun.stdout);
});
