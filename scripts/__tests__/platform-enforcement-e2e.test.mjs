import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

import {
  resolveCliTool,
  resolveGenerationGuardTool,
} from "../lib/interfacectl-tooling.mjs";

const repoRoot = path.resolve(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "../..")
);

const cliPath = resolveCliTool({ cwd: repoRoot }).path;
const guardPath = resolveGenerationGuardTool({ cwd: repoRoot }).path;

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
  const buildManifest = runNode(["docs/demos/runtime-edge/build-manifest.mjs"]);
  assert.equal(buildManifest.status, 0, buildManifest.stderr || buildManifest.stdout);

  const testEdge = runNode(["docs/demos/runtime-edge/test-edge.mjs"]);
  assert.equal(testEdge.status, 0, testEdge.stderr || testEdge.stdout);
  assert.match(testEdge.stdout, /edge tests passed/);

  const validateEdgeModulePath = path.join(
    repoRoot,
    "docs",
    "demos",
    "runtime-edge",
    "validate-edge.js",
  );
  return import(`file://${validateEdgeModulePath}`).then(({ validateEdgeChange }) => {
    const mismatch = validateEdgeChange({
      surfaceId: "unexpected-surface",
      sectionId: "hero",
      proposedStyles: { background: "var(--background)" },
    });
    assert.equal(mismatch.allowed, false);
    assert.equal(mismatch.violations[0]?.rule, "surface.mismatch");

    const ok = validateEdgeChange({
      surfaceId: "surfaces-web",
      sectionId: "hero",
      proposedStyles: { background: "var(--background)" },
    });
    assert.ok(ok.contract?.id);
    assert.ok(ok.contract?.version);
    assert.equal(ok.contract?.surfaceId, "surfaces-web");
  });
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
    color: {
      sourceOfTruth: { type: "none" },
      rawValues: { policy: "off", allowlist: [], denylist: [] },
    },
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

test("generation guard enforces color policy severity", async () => {
  const tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), "surfaces-gen-guard-color-"));
  const strictContractPath = path.join(tmpDir, "contract.strict.json");
  const warnContractPath = path.join(tmpDir, "contract.warn.json");
  const rawDescriptorPath = path.join(tmpDir, "descriptor.raw.json");
  const tokenDescriptorPath = path.join(tmpDir, "descriptor.token.json");

  const baseContract = {
    contractId: "demo-color",
    version: "1.0.0",
    sections: [],
    constraints: { motion: { allowedDurationsMs: [120], allowedTimingFunctions: ["linear"] } },
    surfaces: [
      {
        id: "surfaces-web",
        displayName: "Surfaces",
        type: "web",
        requiredSections: [],
        allowedFonts: ["Inter"],
        layout: { maxContentWidth: 1120 },
      },
    ],
  };

  const strictContract = {
    ...baseContract,
    color: {
      sourceOfTruth: { type: "tokens", tokenNamespaces: ["--color-"] },
      rawValues: { policy: "strict", allowlist: [], denylist: [] },
    },
  };
  const warnContract = {
    ...baseContract,
    color: {
      sourceOfTruth: { type: "tokens", tokenNamespaces: ["--color-"] },
      rawValues: { policy: "warn", allowlist: [], denylist: [] },
    },
  };

  const rawDescriptor = [
    {
      surfaceId: "surfaces-web",
      colors: [{ value: "rgba(15, 23, 42, 0.3)", source: "apps/surfaces-web/app/page.tsx" }],
    },
  ];
  const tokenDescriptor = [
    {
      surfaceId: "surfaces-web",
      colors: [{ value: "var(--unexpected-token)", source: "apps/surfaces-web/app/page.tsx" }],
    },
  ];

  await fsp.writeFile(strictContractPath, JSON.stringify(strictContract, null, 2));
  await fsp.writeFile(warnContractPath, JSON.stringify(warnContract, null, 2));
  await fsp.writeFile(rawDescriptorPath, JSON.stringify(rawDescriptor, null, 2));
  await fsp.writeFile(tokenDescriptorPath, JSON.stringify(tokenDescriptor, null, 2));

  const strictRun = runNode([guardPath, "--contract", strictContractPath, "--descriptor", rawDescriptorPath]);
  assert.equal(strictRun.status, 2, strictRun.stderr || strictRun.stdout);
  assert.match(strictRun.stderr, /color-policy-blocking detected/);

  const warnRun = runNode([guardPath, "--contract", warnContractPath, "--descriptor", rawDescriptorPath]);
  assert.equal(warnRun.status, 0, warnRun.stderr || warnRun.stdout);
  assert.match(warnRun.stderr, /color-policy-warning detected/);

  const namespaceRun = runNode([guardPath, "--contract", warnContractPath, "--descriptor", tokenDescriptorPath]);
  assert.equal(namespaceRun.status, 0, namespaceRun.stderr || namespaceRun.stdout);
  assert.match(namespaceRun.stderr, /color-policy-warning detected/);
});
