import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import { findSiblingInterfacectlRepoRoot } from "../lib/interfacectl-tooling.mjs";

const repoRoot = path.resolve(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "../.."),
);
const packageJsonPath = path.join(repoRoot, "package.json");
const interfacectlRoot =
  findSiblingInterfacectlRepoRoot({ cwd: repoRoot }) ??
  path.resolve(repoRoot, "..", "interfacectl");

function runCommand(command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: options.cwd ?? repoRoot,
    env: {
      ...process.env,
      ...(options.env ?? {}),
    },
  });

  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => {
    stdout += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  return once(child, "exit").then(([exitCode]) => ({
    exitCode: Number(exitCode),
    stdout,
    stderr,
  }));
}

async function writeJson(filePath, value) {
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  await fsp.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function buildContract() {
  return {
    contractId: "consumer-smoke",
    version: "1.0.0",
    surfaces: [
      {
        id: "demo-surface",
        displayName: "Demo Surface",
        type: "web",
        requiredSections: ["main.hero"],
        allowedFonts: ["Demo Sans", "sans-serif", "var(--font-demo)"],
        layout: {
          maxContentWidth: 960,
        },
      },
    ],
    sections: [
      {
        id: "main.hero",
        intent: "primary-intro",
        description: "Demo hero section",
      },
    ],
    constraints: {
      motion: {
        allowedDurationsMs: [120],
        allowedTimingFunctions: ["linear"],
      },
    },
    color: {
      policy: "off",
      allowedValues: [],
    },
  };
}

function parseTrailingJson(output) {
  const lastObjectStart = output.lastIndexOf("\n{");
  const startIndex = lastObjectStart >= 0 ? lastObjectStart + 1 : output.indexOf("{");
  if (startIndex === -1) {
    throw new Error(`JSON payload not found in output:\n${output}`);
  }
  return JSON.parse(output.slice(startIndex));
}

test("consumer scripts are resolver-backed and local adapter implementation is removed", async () => {
  const packageJson = JSON.parse(await fsp.readFile(packageJsonPath, "utf8"));

  assert.equal(packageJson.scripts["generation:prepare"], undefined);
  assert.equal(packageJson.scripts["adapter:validate-generation"], undefined);
  assert.equal(packageJson.scripts["adapter:serve-generation"], undefined);
  assert.equal(packageJson.scripts["generation:pilot:init"], undefined);
  assert.equal(packageJson.scripts["generation:pilot:attempt"], undefined);
  assert.equal(packageJson.scripts["generation:pilot:summary"], undefined);
  assert.ok(
    !fs.existsSync(path.join(repoRoot, "scripts", "adapter", "generation-adapter-core.mjs")),
  );
  assert.ok(
    !fs.existsSync(path.join(repoRoot, "scripts", "adapter", "validate-generation.mjs")),
  );
  assert.ok(
    !fs.existsSync(path.join(repoRoot, "scripts", "adapter", "serve-generation-adapter.mjs")),
  );
  assert.ok(!fs.existsSync(path.join(repoRoot, "scripts", "generation-pilot.mjs")));
  assert.ok(!fs.existsSync(path.join(repoRoot, "scripts", "generation-pilot.config.json")));
  assert.ok(!fs.existsSync(path.join(repoRoot, "scripts", "lib", "contract-runs.mjs")));
});

test("consumer smoke: compile, prepare, init session, and validate via direct upstream commands", async () => {
  assert.ok(
    fs.existsSync(interfacectlRoot),
    `Standalone interfacectl repo not found at ${interfacectlRoot}.`,
  );
  const tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), "surfaces-generation-consumer-"));
  const contractPath = path.join(tempDir, "contract.json");
  const descriptorPath = path.join(tempDir, "descriptor.json");
  const bundleRoot = path.join(
    repoRoot,
      "artifacts",
      "generation-bundles",
      `consumer-smoke-${Date.now()}`,
  );
  const generationInputPath = path.join(
    repoRoot,
    "artifacts",
    "generation-inputs",
    `consumer-smoke-${Date.now()}.json`,
  );
  const sessionId = `consumer-smoke-${Date.now()}`;
  const sessionDir = path.join(
    repoRoot,
    "artifacts",
    "generation-sessions",
    "demo-surface",
    sessionId,
  );

  try {
    await writeJson(contractPath, buildContract());
    await writeJson(descriptorPath, [
      {
        surfaceId: "demo-surface",
        primitives: [],
        colors: [],
      },
    ]);

    const compileResult = await runCommand(
      "node",
      [
        "scripts/interfacectl-tool.mjs",
        "run",
        "cli",
        "compile",
        "--contract",
        contractPath,
        "--out",
        bundleRoot,
      ],
      {
        cwd: repoRoot,
        env: {
          SURFACES_INTERFACECTL_ROOT: interfacectlRoot,
        },
      },
    );
    assert.equal(compileResult.exitCode, 0, compileResult.stderr);
    assert.ok(fs.existsSync(path.join(bundleRoot, "manifest.json")));

    const prepareResult = await runCommand(
      "node",
      [
        "scripts/interfacectl-tool.mjs",
        "run",
        "cli",
        "prepare-generation",
        "--bundle-root",
        bundleRoot,
        "--surface",
        "demo-surface",
        "--out",
        generationInputPath,
      ],
      {
        cwd: repoRoot,
        env: {
          SURFACES_INTERFACECTL_ROOT: interfacectlRoot,
        },
      },
    );

    assert.equal(prepareResult.exitCode, 0, prepareResult.stderr);
    assert.doesNotMatch(prepareResult.stdout, /"surfaceId"\s*:/);
    const generationInput = JSON.parse(await fsp.readFile(generationInputPath, "utf8"));
    assert.equal(generationInput.bundle.version, "2.0");
    assert.equal(generationInput.contract.id, "consumer-smoke");
    assert.equal(generationInput.surface.surfaceId, "demo-surface");

    const initSessionResult = await runCommand(
      "node",
      [
        "scripts/interfacectl-tool.mjs",
        "run",
        "cli",
        "init-generation-session",
        "--bundle-root",
        bundleRoot,
        "--surface",
        "demo-surface",
        "--workspace-root",
        repoRoot,
        "--session",
        sessionId,
      ],
      {
        cwd: repoRoot,
        env: {
          SURFACES_INTERFACECTL_ROOT: interfacectlRoot,
        },
      },
    );
    assert.equal(initSessionResult.exitCode, 0, initSessionResult.stderr);
    assert.ok(fs.existsSync(path.join(sessionDir, "session.json")));

    const validateResult = await runCommand(
      "node",
      [
        "scripts/interfacectl-tool.mjs",
        "run",
        "cli",
        "validate-generation",
        "--tool",
        "codex",
        "--surface",
        "demo-surface",
        "--mode",
        "descriptor",
        "--bundle-root",
        bundleRoot,
        "--descriptor-path",
        descriptorPath,
      ],
      {
        cwd: repoRoot,
        env: {
          SURFACES_INTERFACECTL_ROOT: interfacectlRoot,
        },
      },
    );

    assert.equal(validateResult.exitCode, 0, validateResult.stderr);
    const payload = parseTrailingJson(validateResult.stdout);
    assert.equal(payload.status, "pass");
    assert.equal(payload.bundle.version, "2.0");
    assert.equal(payload.contract.id, "consumer-smoke");
  } finally {
    await fsp.rm(tempDir, { recursive: true, force: true });
    await fsp.rm(bundleRoot, { recursive: true, force: true });
    await fsp.rm(generationInputPath, { force: true });
    await fsp.rm(sessionDir, { recursive: true, force: true });
  }
});
