import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import net from "node:net";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  buildCoverage,
  computeStatusFromFindings,
  runGenerationAdapter,
} from "../adapter/generation-adapter-core.mjs";

const repoRoot = path.resolve(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "../.."),
);

const cliWrapperPath = path.join(
  repoRoot,
  "scripts",
  "adapter",
  "validate-generation.mjs",
);

const httpWrapperPath = path.join(
  repoRoot,
  "scripts",
  "adapter",
  "serve-generation-adapter.mjs",
);

const guardSourcePath = path.join(
  repoRoot,
  "tools",
  "interfacectl",
  "tools",
  "check-generation-boundaries.mjs",
);

function writeFile(filePath, contents) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents);
}

function buildMockCliScript() {
  return `#!/usr/bin/env node
const fs = require("node:fs");

function argValue(args, flag) {
  const index = args.indexOf(flag);
  if (index === -1) return undefined;
  return args[index + 1];
}

const args = process.argv.slice(2);
const command = args[0];

const describePayloads = {
  "pass-web": [{ surfaceId: "pass-web", primitives: [], colors: [{ value: "var(--background)", source: "apps/pass-web/app/page.tsx" }] }],
  "warn-web": [{ surfaceId: "warn-web", primitives: [], colors: [{ value: "var(--surface)", source: "apps/warn-web/app/page.tsx" }] }],
  "block-web": [{ surfaceId: "block-web", primitives: [{ role: "navigation", count: 1, sources: ["apps/block-web/app/page.tsx"] }], colors: [{ value: "rgba(1, 2, 3, 0.5)", source: "apps/block-web/app/page.tsx" }] }],
  "reference-target-web": [{ surfaceId: "reference-target-web", primitives: [], colors: [{ value: "var(--background)", source: "apps/reference-target-web/app/page.tsx" }] }],
};

if (command === "describe") {
  const surfaceId = argValue(args, "--surface");
  const outPath = argValue(args, "--out");
  if (!surfaceId || !outPath) {
    process.stderr.write("describe requires --surface and --out\\n");
    process.exit(1);
  }

  const payload = describePayloads[surfaceId];
  if (!payload) {
    process.stderr.write("unknown surface\\n");
    process.exit(1);
  }

  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2) + "\\n");
  process.exit(0);
}

if (command === "validate") {
  const surfaceId = argValue(args, "--surface");

  const responses = {
    "pass-web": {
      status: 0,
      payload: {
        contractPath: "contracts/surfaces.web.contract.json",
        contractVersion: "0.1.0",
        summary: { errors: 0, warnings: 0 },
        findings: [],
      },
    },
    "warn-web": {
      status: 0,
      payload: {
        contractPath: "contracts/surfaces.web.contract.json",
        contractVersion: "0.1.0",
        summary: { errors: 0, warnings: 1 },
        findings: [
          {
            code: "color.token.namespace.violation",
            severity: "warning",
            category: "E1",
            surface: "warn-web",
            message: "Color token --surface does not use an allowed namespace.",
            location: "apps/warn-web/app/globals.css",
            expected: ["--color-", "--background", "--foreground"],
            found: "--surface",
          },
        ],
      },
    },
    "block-web": {
      status: 30,
      payload: {
        contractPath: "contracts/surfaces.web.contract.json",
        contractVersion: "0.1.0",
        summary: { errors: 1, warnings: 0 },
        findings: [
          {
            code: "shell.primitive.disallowed",
            severity: "error",
            category: "E2",
            surface: "block-web",
            message: "Shell-owned primitive emitted.",
            location: "apps/block-web/app/page.tsx",
          },
        ],
      },
    },
    "reference-target-web": {
      status: 0,
      payload: {
        contractPath: "contracts/surfaces.web.contract.json",
        contractVersion: "0.1.0",
        summary: { errors: 0, warnings: 0 },
        findings: [],
      },
    },
  };

  const result = responses[surfaceId];
  if (!result) {
    process.stderr.write("unknown surface\\n");
    process.exit(1);
  }

  process.stdout.write(JSON.stringify(result.payload, null, 2) + "\\n");
  process.exit(result.status);
}

process.stderr.write("Unknown command\\n");
process.exit(1);
`;
}

function makeAdapterSandbox() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "adapter-sandbox-"));
  const contractPath = path.join(dir, "contracts", "surfaces.web.contract.json");
  const parityContractPath = path.join(dir, "contracts", "parity.contract.json");
  const cliPath = path.join(
    dir,
    "tools",
    "interfacectl",
    "packages",
    "interfacectl-cli",
    "dist",
    "index.js",
  );
  const guardPath = path.join(dir, "tools", "interfacectl", "tools", "check-generation-boundaries.mjs");

  const contract = {
    contractId: "surfaces.web",
    version: "0.1.0",
    sections: [],
    constraints: {
      motion: {
        allowedDurationsMs: [120],
        allowedTimingFunctions: ["linear"],
      },
    },
    surfaces: [
      {
        id: "pass-web",
        displayName: "Pass",
        type: "web",
        requiredSections: [],
        allowedFonts: ["Inter"],
        layout: { maxContentWidth: 1120 },
      },
      {
        id: "warn-web",
        displayName: "Warn",
        type: "web",
        requiredSections: [],
        allowedFonts: ["Inter"],
        layout: { maxContentWidth: 1120 },
      },
      {
        id: "block-web",
        displayName: "Block",
        type: "web",
        requiredSections: [],
        allowedFonts: ["Inter"],
        layout: { maxContentWidth: 1120 },
        mustNotEmit: ["navigation"],
      },
      {
        id: "reference-target-web",
        displayName: "Reference Target",
        type: "web",
        requiredSections: [],
        allowedFonts: ["Inter"],
        layout: { maxContentWidth: 1120 },
      },
    ],
    color: {
      sourceOfTruth: {
        type: "tokens",
        tokenNamespaces: ["--color-", "--background", "--foreground"],
      },
      rawValues: {
        policy: "strict",
        allowlist: [],
        denylist: [],
      },
    },
  };

  writeFile(contractPath, `${JSON.stringify(contract, null, 2)}\n`);
  writeFile(
    parityContractPath,
    `${JSON.stringify(
      {
        contractId: "parity.contract",
        version: "0.1.0",
        sections: [],
        constraints: {
          motion: {
            allowedDurationsMs: [120],
            allowedTimingFunctions: ["linear"],
          },
        },
        surfaces: [
          {
            id: "reference-target-web",
            displayName: "Reference Target",
            type: "web",
            requiredSections: [],
            allowedFonts: ["Inter"],
            layout: { maxContentWidth: 1120 },
            icons: {
              policy: "strict",
              allowedSources: ["@heroicons/react/24/outline"],
            },
          },
          {
            id: "warn-icon-web",
            displayName: "Warn Icon",
            type: "web",
            requiredSections: [],
            allowedFonts: ["Inter"],
            layout: { maxContentWidth: 1120 },
            icons: {
              policy: "warn",
              allowedSources: ["@heroicons/react/24/outline"],
            },
          },
          {
            id: "surfaces-web",
            displayName: "Surfaces",
            type: "web",
            requiredSections: [],
            allowedFonts: ["Inter"],
            layout: { maxContentWidth: 1120 },
            icons: {
              policy: "strict",
              allowedSources: ["@heroicons/react/24/outline"],
            },
          },
        ],
        color: {
          policy: "strict",
          allowedValues: ["var(--background)"],
        },
      },
      null,
      2,
    )}\n`,
  );
  writeFile(cliPath, buildMockCliScript());
  fs.chmodSync(cliPath, 0o755);
  writeFile(guardPath, fs.readFileSync(guardSourcePath, "utf8"));
  fs.chmodSync(guardPath, 0o755);

  const descriptorsDir = path.join(dir, "descriptors");
  fs.mkdirSync(descriptorsDir, { recursive: true });

  const descriptorPaths = {
    pass: path.join(descriptorsDir, "pass.json"),
    warn: path.join(descriptorsDir, "warn.json"),
    blockRaw: path.join(descriptorsDir, "block-raw.json"),
    blockPrimitive: path.join(descriptorsDir, "block-primitive.json"),
    reference: path.join(descriptorsDir, "reference-target.json"),
    parityColorBlock: path.join(descriptorsDir, "parity-color-block.json"),
    parityIconBlock: path.join(descriptorsDir, "parity-icon-block.json"),
    parityWarnIcon: path.join(descriptorsDir, "parity-warn-icon.json"),
    parityMissingIcons: path.join(descriptorsDir, "parity-missing-icons.json"),
    parityLegacySurface: path.join(descriptorsDir, "parity-legacy-surface.json"),
  };

  writeFile(
    descriptorPaths.pass,
    `${JSON.stringify(
      [
        {
          surfaceId: "pass-web",
          primitives: [],
          colors: [{ value: "var(--background)", source: "apps/pass-web/app/page.tsx" }],
        },
      ],
      null,
      2,
    )}\n`,
  );

  writeFile(
    descriptorPaths.warn,
    `${JSON.stringify(
      [
        {
          surfaceId: "warn-web",
          primitives: [],
          colors: [{ value: "var(--surface)", source: "apps/warn-web/app/page.tsx" }],
        },
      ],
      null,
      2,
    )}\n`,
  );

  writeFile(
    descriptorPaths.blockRaw,
    `${JSON.stringify(
      [
        {
          surfaceId: "block-web",
          primitives: [],
          colors: [{ value: "rgba(15, 23, 42, 0.3)", source: "apps/block-web/app/page.tsx" }],
        },
      ],
      null,
      2,
    )}\n`,
  );

  writeFile(
    descriptorPaths.blockPrimitive,
    `${JSON.stringify(
      [
        {
          surfaceId: "block-web",
          primitives: [{ role: "navigation", count: 1, sources: ["apps/block-web/app/page.tsx"] }],
          colors: [{ value: "var(--background)", source: "apps/block-web/app/page.tsx" }],
        },
      ],
      null,
      2,
    )}\n`,
  );

  writeFile(
    descriptorPaths.reference,
    `${JSON.stringify(
      [
        {
          surfaceId: "reference-target-web",
          primitives: [],
          colors: [{ value: "var(--background)", source: "apps/reference-target-web/app/page.tsx" }],
          icons: [{ value: "@heroicons/react/24/outline", source: "apps/reference-target-web/app/page.tsx" }],
        },
      ],
      null,
      2,
    )}\n`,
  );

  writeFile(
    descriptorPaths.parityColorBlock,
    `${JSON.stringify(
      [
        {
          surfaceId: "reference-target-web",
          primitives: [],
          colors: [{ value: "rgba(15, 23, 42, 0.3)", source: "generated.css" }],
          icons: [{ value: "@heroicons/react/24/outline", source: "generated.tsx" }],
        },
      ],
      null,
      2,
    )}\n`,
  );

  writeFile(
    descriptorPaths.parityIconBlock,
    `${JSON.stringify(
      [
        {
          surfaceId: "reference-target-web",
          primitives: [],
          colors: [{ value: "var(--background)", source: "generated.css" }],
          icons: [{ value: "lucide-react", source: "generated.tsx" }],
        },
      ],
      null,
      2,
    )}\n`,
  );

  writeFile(
    descriptorPaths.parityWarnIcon,
    `${JSON.stringify(
      [
        {
          surfaceId: "warn-icon-web",
          primitives: [],
          colors: [{ value: "var(--background)", source: "generated.css" }],
          icons: [{ value: "lucide-react", source: "generated.tsx" }],
        },
      ],
      null,
      2,
    )}\n`,
  );

  writeFile(
    descriptorPaths.parityMissingIcons,
    `${JSON.stringify(
      [
        {
          surfaceId: "reference-target-web",
          primitives: [],
          colors: [{ value: "var(--background)", source: "generated.css" }],
        },
      ],
      null,
      2,
    )}\n`,
  );

  writeFile(
    descriptorPaths.parityLegacySurface,
    `${JSON.stringify(
      [
        {
          surfaceId: "surfaces-web",
          primitives: [],
          colors: [{ value: "rgba(15, 23, 42, 0.3)", source: "generated.css" }],
          icons: [{ value: "lucide-react", source: "generated.tsx" }],
        },
      ],
      null,
      2,
    )}\n`,
  );

  return {
    dir,
    contractPath,
    parityContractPath,
    cliPath,
    guardPath,
    descriptorPaths,
  };
}

function runCli(args, sandbox, env = {}) {
  const result = spawnSync("node", [cliWrapperPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      SURFACES_ADAPTER_INTERFACECTL_CLI: sandbox.cliPath,
      SURFACES_ADAPTER_GENERATION_GUARD: sandbox.guardPath,
      ...env,
    },
  });

  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

function parseResponse(stdout, stderr) {
  const content = stdout.trim() || stderr.trim();
  if (!content) return null;
  return JSON.parse(content);
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(port);
      });
    });
    server.on("error", reject);
  });
}

async function waitForServerReady(child, timeoutMs = 8_000) {
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Adapter server did not start in time."));
    }, timeoutMs);

    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      if (String(chunk).includes("Generation adapter listening")) {
        clearTimeout(timeout);
        resolve();
      }
    });

    child.on("exit", (code) => {
      clearTimeout(timeout);
      reject(new Error(`Adapter server exited before ready (code ${code}).`));
    });
  });
}

async function shutdownServer(child) {
  await new Promise((resolve) => {
    child.once("exit", () => resolve());
    child.kill("SIGTERM");
    setTimeout(() => resolve(), 2_000);
  });
}

test("core status mapping follows strict/warn/pass rules", () => {
  assert.equal(computeStatusFromFindings([]), "pass");
  assert.equal(
    computeStatusFromFindings([
      { code: "color.token.namespace", severity: "warning", policy: "warn" },
    ]),
    "warn",
  );
  assert.equal(
    computeStatusFromFindings([
      { code: "color.rawValues", severity: "error", policy: "strict" },
    ]),
    "block",
  );
});

test("coverage flags map by adapter mode", () => {
  assert.deepEqual(buildCoverage("workspace"), {
    generationGuard: true,
    fullValidate: true,
  });
  assert.deepEqual(buildCoverage("descriptor"), {
    generationGuard: true,
    fullValidate: false,
  });
});

test("CLI wrapper: workspace mode emits pass, warn, block with expected exit codes", () => {
  const sandbox = makeAdapterSandbox();

  const pass = runCli(
    [
      "--tool",
      "codex",
      "--surface",
      "pass-web",
      "--mode",
      "workspace",
      "--workspace-root",
      sandbox.dir,
      "--contract",
      sandbox.contractPath,
    ],
    sandbox,
  );
  assert.equal(pass.status, 0, pass.stderr || pass.stdout);
  const passPayload = parseResponse(pass.stdout, pass.stderr);
  assert.equal(passPayload.status, "pass");
  assert.equal(passPayload.coverage.fullValidate, true);

  const warn = runCli(
    [
      "--tool",
      "cursor",
      "--surface",
      "warn-web",
      "--mode",
      "workspace",
      "--workspace-root",
      sandbox.dir,
      "--contract",
      sandbox.contractPath,
    ],
    sandbox,
  );
  assert.equal(warn.status, 0, warn.stderr || warn.stdout);
  const warnPayload = parseResponse(warn.stdout, warn.stderr);
  assert.equal(warnPayload.status, "warn");

  const block = runCli(
    [
      "--tool",
      "codex",
      "--surface",
      "block-web",
      "--mode",
      "workspace",
      "--workspace-root",
      sandbox.dir,
      "--contract",
      sandbox.contractPath,
    ],
    sandbox,
  );
  assert.equal(block.status, 30, block.stderr || block.stdout);
  const blockPayload = parseResponse(block.stdout, block.stderr);
  assert.equal(blockPayload.status, "block");
});

test("CLI wrapper: descriptor mode emits pass, warn, block with expected exit codes", () => {
  const sandbox = makeAdapterSandbox();

  const pass = runCli(
    [
      "--tool",
      "lovable",
      "--surface",
      "pass-web",
      "--mode",
      "descriptor",
      "--descriptor-path",
      sandbox.descriptorPaths.pass,
      "--contract",
      sandbox.contractPath,
    ],
    sandbox,
  );
  assert.equal(pass.status, 0, pass.stderr || pass.stdout);
  const passPayload = parseResponse(pass.stdout, pass.stderr);
  assert.equal(passPayload.status, "pass");
  assert.equal(passPayload.coverage.fullValidate, false);

  const warn = runCli(
    [
      "--tool",
      "figma-make",
      "--surface",
      "warn-web",
      "--mode",
      "descriptor",
      "--descriptor-path",
      sandbox.descriptorPaths.warn,
      "--contract",
      sandbox.contractPath,
    ],
    sandbox,
  );
  assert.equal(warn.status, 0, warn.stderr || warn.stdout);
  const warnPayload = parseResponse(warn.stdout, warn.stderr);
  assert.equal(warnPayload.status, "warn");

  const block = runCli(
    [
      "--tool",
      "codex",
      "--surface",
      "block-web",
      "--mode",
      "descriptor",
      "--descriptor-path",
      sandbox.descriptorPaths.blockRaw,
      "--contract",
      sandbox.contractPath,
    ],
    sandbox,
  );
  assert.equal(block.status, 30, block.stderr || block.stdout);
  const blockPayload = parseResponse(block.stdout, block.stderr);
  assert.equal(blockPayload.status, "block");
});

test("CLI wrapper: descriptor parity is enforced for reference-target and not for non-enforced surfaces", () => {
  const sandbox = makeAdapterSandbox();

  const strictColor = runCli(
    [
      "--tool",
      "codex",
      "--surface",
      "reference-target-web",
      "--mode",
      "descriptor",
      "--descriptor-path",
      sandbox.descriptorPaths.parityColorBlock,
      "--contract",
      sandbox.parityContractPath,
    ],
    sandbox,
  );
  assert.equal(strictColor.status, 30, strictColor.stderr || strictColor.stdout);
  const strictColorPayload = parseResponse(strictColor.stdout, strictColor.stderr);
  assert.equal(strictColorPayload.status, "block");
  assert.ok(
    strictColorPayload.findings.some((finding) => finding.code === "color.disallowed"),
  );
  assert.equal(strictColorPayload.coverage.colorPolicyEvaluated, true);

  const strictIcon = runCli(
    [
      "--tool",
      "codex",
      "--surface",
      "reference-target-web",
      "--mode",
      "descriptor",
      "--descriptor-path",
      sandbox.descriptorPaths.parityIconBlock,
      "--contract",
      sandbox.parityContractPath,
    ],
    sandbox,
  );
  assert.equal(strictIcon.status, 30, strictIcon.stderr || strictIcon.stdout);
  const strictIconPayload = parseResponse(strictIcon.stdout, strictIcon.stderr);
  assert.equal(strictIconPayload.status, "block");
  assert.ok(
    strictIconPayload.findings.some((finding) => finding.code === "icon.source-disallowed"),
  );
  assert.equal(strictIconPayload.coverage.iconPolicyEvaluated, true);

  const warnIcon = runCli(
    [
      "--tool",
      "codex",
      "--surface",
      "warn-icon-web",
      "--mode",
      "descriptor",
      "--descriptor-path",
      sandbox.descriptorPaths.parityWarnIcon,
      "--contract",
      sandbox.parityContractPath,
    ],
    sandbox,
    {
      SURFACES_ADAPTER_DESCRIPTOR_PARITY_SURFACES:
        "reference-target-web,warn-icon-web",
    },
  );
  assert.equal(warnIcon.status, 0, warnIcon.stderr || warnIcon.stdout);
  const warnIconPayload = parseResponse(warnIcon.stdout, warnIcon.stderr);
  assert.equal(warnIconPayload.status, "warn");
  assert.ok(
    warnIconPayload.findings.some((finding) => finding.code === "icon.source-disallowed"),
  );

  const missingIcons = runCli(
    [
      "--tool",
      "codex",
      "--surface",
      "reference-target-web",
      "--mode",
      "descriptor",
      "--descriptor-path",
      sandbox.descriptorPaths.parityMissingIcons,
      "--contract",
      sandbox.parityContractPath,
    ],
    sandbox,
  );
  assert.equal(missingIcons.status, 30, missingIcons.stderr || missingIcons.stdout);
  const missingIconsPayload = parseResponse(missingIcons.stdout, missingIcons.stderr);
  assert.ok(
    missingIconsPayload.findings.some((finding) => finding.code === "descriptor.icons.missing"),
  );

  const nonEnforcedSurface = runCli(
    [
      "--tool",
      "codex",
      "--surface",
      "surfaces-web",
      "--mode",
      "descriptor",
      "--descriptor-path",
      sandbox.descriptorPaths.parityLegacySurface,
      "--contract",
      sandbox.parityContractPath,
    ],
    sandbox,
  );
  assert.equal(nonEnforcedSurface.status, 0, nonEnforcedSurface.stderr || nonEnforcedSurface.stdout);
  const nonEnforcedPayload = parseResponse(nonEnforcedSurface.stdout, nonEnforcedSurface.stderr);
  assert.equal(nonEnforcedPayload.status, "pass");
  assert.equal(
    nonEnforcedPayload.findings.some(
      (finding) =>
        finding.code === "color.disallowed" ||
        finding.code === "icon.source-disallowed" ||
        finding.code === "descriptor.icons.missing",
    ),
    false,
  );
  assert.equal(nonEnforcedPayload.coverage.colorPolicyEvaluated, false);
  assert.equal(nonEnforcedPayload.coverage.iconPolicyEvaluated, false);
});

test("HTTP wrapper: 200 for pass/warn, 422 for block, 400 for invalid request", async () => {
  const sandbox = makeAdapterSandbox();
  const port = await getFreePort();

  const child = spawn(
    "node",
    [
      httpWrapperPath,
      "--host",
      "127.0.0.1",
      "--port",
      String(port),
      "--contract",
      sandbox.contractPath,
    ],
    {
      cwd: repoRoot,
      env: {
        ...process.env,
        SURFACES_ADAPTER_INTERFACECTL_CLI: sandbox.cliPath,
        SURFACES_ADAPTER_GENERATION_GUARD: sandbox.guardPath,
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  await waitForServerReady(child);

  try {
    const passResponse = await fetch(
      `http://127.0.0.1:${port}/surfaces.validateGeneration`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          requestId: "req-pass",
          tool: "codex",
          surfaceId: "pass-web",
          mode: "descriptor",
          descriptor: JSON.parse(
            await fsp.readFile(sandbox.descriptorPaths.pass, "utf8"),
          ),
        }),
      },
    );

    assert.equal(passResponse.status, 200);
    const passPayload = await passResponse.json();
    assert.equal(passPayload.status, "pass");

    const blockResponse = await fetch(
      `http://127.0.0.1:${port}/surfaces.validateGeneration`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          requestId: "req-block",
          tool: "codex",
          surfaceId: "block-web",
          mode: "descriptor",
          descriptor: JSON.parse(
            await fsp.readFile(sandbox.descriptorPaths.blockRaw, "utf8"),
          ),
        }),
      },
    );

    assert.equal(blockResponse.status, 422);
    const blockPayload = await blockResponse.json();
    assert.equal(blockPayload.status, "block");

    const invalidResponse = await fetch(
      `http://127.0.0.1:${port}/surfaces.validateGeneration`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ requestId: "req-invalid" }),
      },
    );

    assert.equal(invalidResponse.status, 400);
    const invalidPayload = await invalidResponse.json();
    assert.match(invalidPayload.error, /Invalid tool|surfaceId is required/);
  } finally {
    await shutdownServer(child);
  }
});

test("policy scenarios: raw strict blocks, namespace mismatch warns, shell primitive blocks", async () => {
  const sandbox = makeAdapterSandbox();

  const rawStrict = await runGenerationAdapter(
    {
      requestId: "raw-strict",
      tool: "codex",
      surfaceId: "block-web",
      mode: "descriptor",
      descriptor: JSON.parse(await fsp.readFile(sandbox.descriptorPaths.blockRaw, "utf8")),
      contractPath: sandbox.contractPath,
    },
    {
      generationGuardPath: sandbox.guardPath,
      interfacectlCliPath: sandbox.cliPath,
    },
  );
  assert.equal(rawStrict.status, "block");
  assert.ok(rawStrict.findings.some((finding) => finding.code === "color.rawValues"));

  const namespaceWarn = await runGenerationAdapter(
    {
      requestId: "namespace-warn",
      tool: "codex",
      surfaceId: "warn-web",
      mode: "descriptor",
      descriptor: JSON.parse(await fsp.readFile(sandbox.descriptorPaths.warn, "utf8")),
      contractPath: sandbox.contractPath,
    },
    {
      generationGuardPath: sandbox.guardPath,
      interfacectlCliPath: sandbox.cliPath,
    },
  );
  assert.equal(namespaceWarn.status, "warn");
  assert.ok(
    namespaceWarn.findings.some((finding) => finding.code === "color.token.namespace"),
  );

  const shellPrimitive = await runGenerationAdapter(
    {
      requestId: "primitive-block",
      tool: "codex",
      surfaceId: "block-web",
      mode: "descriptor",
      descriptor: JSON.parse(
        await fsp.readFile(sandbox.descriptorPaths.blockPrimitive, "utf8"),
      ),
      contractPath: sandbox.contractPath,
    },
    {
      generationGuardPath: sandbox.guardPath,
      interfacectlCliPath: sandbox.cliPath,
    },
  );
  assert.equal(shellPrimitive.status, "block");
  assert.ok(
    shellPrimitive.findings.some(
      (finding) => finding.code === "shell-owned-primitive-emitted",
    ),
  );
});

test("reference-target descriptor verdict is deterministic", async () => {
  const sandbox = makeAdapterSandbox();
  const descriptor = JSON.parse(
    await fsp.readFile(sandbox.descriptorPaths.reference, "utf8"),
  );

  const first = await runGenerationAdapter(
    {
      requestId: "reference-1",
      tool: "codex",
      surfaceId: "reference-target-web",
      mode: "descriptor",
      descriptor,
      contractPath: sandbox.contractPath,
    },
    {
      generationGuardPath: sandbox.guardPath,
      interfacectlCliPath: sandbox.cliPath,
    },
  );

  const second = await runGenerationAdapter(
    {
      requestId: "reference-2",
      tool: "codex",
      surfaceId: "reference-target-web",
      mode: "descriptor",
      descriptor,
      contractPath: sandbox.contractPath,
    },
    {
      generationGuardPath: sandbox.guardPath,
      interfacectlCliPath: sandbox.cliPath,
    },
  );

  assert.equal(first.status, "pass");
  assert.equal(second.status, "pass");
  assert.deepEqual(
    first.findings.map((finding) => finding.code),
    second.findings.map((finding) => finding.code),
  );
});
