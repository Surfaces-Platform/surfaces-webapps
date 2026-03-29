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
  process.env.SURFACES_INTERFACECTL_ROOT ??
  findSiblingInterfacectlRepoRoot({ cwd: repoRoot }) ??
  path.resolve(repoRoot, "..", "interfacectl");
const benchmarkAsyncDataContractPath = path.join(
  repoRoot,
  "contracts",
  "generated",
  "benchmark-async-data-web.contract.json",
);
const benchmarkAsyncDataAstPath = path.join(
  repoRoot,
  "contracts",
  "generated",
  "benchmark-async-data-web.ui.surface.ast.json",
);
const referenceTargetAstPath = path.join(
  repoRoot,
  "contracts",
  "generated",
  "reference-target-web.ui.surface.ast.json",
);

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

function assertAstFirstBundleConventions(payload, expected) {
  assert.equal(payload.bundle.version, "3.0");
  assert.equal(payload.ast.id, expected.astId);
  assert.equal(payload.surface.surfaceId, expected.surfaceId);
  assert.match(payload.bundle.sourcePaths.contract, /derived\/contract\.normalized\.json$/);
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
    assert.equal(generationInput.bundle.version, "3.0");
    assert.equal(generationInput.contract.id, "consumer-smoke");
    assert.equal(generationInput.ast.id, "consumer-smoke");
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
    assert.equal(payload.bundle.version, "3.0");
    assert.equal(payload.contract.id, "consumer-smoke");
  } finally {
    await fsp.rm(tempDir, { recursive: true, force: true });
    await fsp.rm(bundleRoot, { recursive: true, force: true });
    await fsp.rm(generationInputPath, { force: true });
    await fsp.rm(sessionDir, { recursive: true, force: true });
  }
});

test("consumer smoke: benchmark async data AST stays fresh and drives bundle preparation", async () => {
  assert.ok(
    fs.existsSync(interfacectlRoot),
    `Standalone interfacectl repo not found at ${interfacectlRoot}.`,
  );
  assert.ok(
    fs.existsSync(benchmarkAsyncDataContractPath),
    `Benchmark contract fixture missing at ${benchmarkAsyncDataContractPath}.`,
  );
  assert.ok(
    fs.existsSync(benchmarkAsyncDataAstPath),
    `Benchmark AST fixture missing at ${benchmarkAsyncDataAstPath}.`,
  );

  const tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), "surfaces-ast-consumer-"));
  const migratedAstPath = path.join(tempDir, "benchmark-async-data-web.ui.surface.ast.json");
  const configPath = path.join(tempDir, "benchmark-async-data-web.config.json");
  const bundleRoot = path.join(repoRoot, "artifacts", "generation-bundles", `benchmark-async-data-web-${Date.now()}`);
  const preparedGenerationPath = path.join(tempDir, "prepared-generation.json");
  const preparedRuntimePath = path.join(tempDir, "prepared-runtime.json");

  try {
    await writeJson(configPath, {
      surfaceRoots: {
        "benchmark-async-data-web": "apps/benchmark-async-data-web",
      },
    });

    const migrateResult = await runCommand(
      "node",
      [
        path.join(interfacectlRoot, "packages", "interfacectl-cli", "dist", "index.js"),
        "migrate-ui-ast",
        "--contract",
        benchmarkAsyncDataContractPath,
        "--out",
        migratedAstPath,
        "--format",
        "json",
      ],
      {
        cwd: repoRoot,
      },
    );
    assert.equal(migrateResult.exitCode, 0, migrateResult.stderr);

    const committedAst = JSON.parse(await fsp.readFile(benchmarkAsyncDataAstPath, "utf8"));
    const migratedAst = JSON.parse(await fsp.readFile(migratedAstPath, "utf8"));
    assert.deepEqual(
      committedAst,
      migratedAst,
      "Committed AST fixture must stay fresh relative to the migrated legacy contract",
    );

    const validateResult = await runCommand(
      "node",
      [
        "scripts/interfacectl-tool.mjs",
        "run",
        "cli",
        "validate",
        "--workspace-root",
        ".",
        "--ast",
        benchmarkAsyncDataAstPath,
        "--config",
        configPath,
        "--surface",
        "benchmark-async-data-web",
        "--format",
        "json",
        "--exit-codes",
        "v2",
      ],
      {
        cwd: repoRoot,
        env: {
          SURFACES_INTERFACECTL_ROOT: interfacectlRoot,
        },
      },
    );
    assert.equal(validateResult.exitCode, 0, validateResult.stderr);
    const validationPayload = JSON.parse(validateResult.stdout);
    // This cutover only requires the benchmark proof to stay at zero errors.
    // Existing warn-level async feedback findings are documented in the merge note
    // and intentionally remain out of scope for this pass.
    assert.equal(validationPayload.summary.errors, 0);
    assert.ok(
      validationPayload.findings.every((finding) => finding.surface === "benchmark-async-data-web"),
      "validation findings should stay scoped to the benchmark fixture",
    );

    const compileResult = await runCommand(
      "node",
      [
        "scripts/interfacectl-tool.mjs",
        "run",
        "cli",
        "compile",
        "--ast",
        benchmarkAsyncDataAstPath,
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

    const prepareGenerationResult = await runCommand(
      "node",
      [
        "scripts/interfacectl-tool.mjs",
        "run",
        "cli",
        "prepare-generation",
        "--bundle-root",
        bundleRoot,
        "--surface",
        "benchmark-async-data-web",
        "--out",
        preparedGenerationPath,
      ],
      {
        cwd: repoRoot,
        env: {
          SURFACES_INTERFACECTL_ROOT: interfacectlRoot,
        },
      },
    );
    assert.equal(prepareGenerationResult.exitCode, 0, prepareGenerationResult.stderr);

    const prepareRuntimeResult = await runCommand(
      "node",
      [
        "scripts/interfacectl-tool.mjs",
        "run",
        "cli",
        "prepare-runtime",
        "--bundle-root",
        bundleRoot,
        "--surface",
        "benchmark-async-data-web",
        "--out",
        preparedRuntimePath,
      ],
      {
        cwd: repoRoot,
        env: {
          SURFACES_INTERFACECTL_ROOT: interfacectlRoot,
        },
      },
    );
    assert.equal(prepareRuntimeResult.exitCode, 0, prepareRuntimeResult.stderr);

    const generationPayload = JSON.parse(await fsp.readFile(preparedGenerationPath, "utf8"));
    const runtimePayload = JSON.parse(await fsp.readFile(preparedRuntimePath, "utf8"));

    assertAstFirstBundleConventions(generationPayload, {
      astId: "benchmark-async-data-web.generated",
      surfaceId: "benchmark-async-data-web",
    });
    assert.equal(generationPayload.generation.ast.rootNodeId, "benchmark-async-data-web.root");

    assert.equal(runtimePayload.bundle.version, "3.0");
    assert.equal(runtimePayload.ast.id, "benchmark-async-data-web.generated");
    assert.equal(runtimePayload.runtime.ast.rootNodeId, "benchmark-async-data-web.root");
    assert.deepEqual(
      runtimePayload.runtime.ast.nodes
        .filter((node) => node.kind === "section")
        .map((node) => node.sectionId),
      ["data.hero", "data.stream", "data.queue", "data.health"],
    );
  } finally {
    await fsp.rm(tempDir, { recursive: true, force: true });
    await fsp.rm(bundleRoot, { recursive: true, force: true });
  }
});

test("consumer smoke: reference target AST uses the same AST-first bundle conventions as the benchmark path", async () => {
  assert.ok(
    fs.existsSync(referenceTargetAstPath),
    `Reference target AST fixture missing at ${referenceTargetAstPath}.`,
  );

  const tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), "surfaces-reference-target-ast-"));
  const bundleRoot = path.join(repoRoot, "artifacts", "generation-bundles", `reference-target-web-${Date.now()}`);
  const preparedGenerationPath = path.join(tempDir, "prepared-generation.json");

  try {
    const compileResult = await runCommand(
      "node",
      [
        "scripts/interfacectl-tool.mjs",
        "run",
        "cli",
        "compile",
        "--ast",
        referenceTargetAstPath,
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
        "reference-target-web",
        "--out",
        preparedGenerationPath,
      ],
      {
        cwd: repoRoot,
        env: {
          SURFACES_INTERFACECTL_ROOT: interfacectlRoot,
        },
      },
    );
    assert.equal(prepareResult.exitCode, 0, prepareResult.stderr);

    const generationPayload = JSON.parse(await fsp.readFile(preparedGenerationPath, "utf8"));
    assertAstFirstBundleConventions(generationPayload, {
      astId: "reference-target-web.generated",
      surfaceId: "reference-target-web",
    });
    assert.equal(generationPayload.generation.ast.rootNodeId, "reference-target-web.root");
  } finally {
    await fsp.rm(tempDir, { recursive: true, force: true });
    await fsp.rm(bundleRoot, { recursive: true, force: true });
  }
});
