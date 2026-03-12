import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

import { resolveCliTool } from "../lib/interfacectl-tooling.mjs";

const repoRoot = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), "../.."));
const cliPath = resolveCliTool({ cwd: repoRoot }).path;

function sha256File(filePath) {
  const content = fs.readFileSync(filePath);
  return createHash("sha256").update(content).digest("hex");
}

function run(cmd, args, options = {}) {
  return spawnSync(cmd, args, {
    cwd: options.cwd ?? repoRoot,
    encoding: "utf8",
    env: { ...process.env, ...(options.env ?? {}) },
  });
}

async function makeSandbox() {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), "surfaces-onboarding-smoke-"));
  await fsp.mkdir(path.join(dir, "contracts", "generated"), { recursive: true });
  await fsp.writeFile(
    path.join(dir, "contracts", "surfaces.web.contract.json"),
    JSON.stringify({
      contractId: "surfaces.web",
      version: "0.1.0",
      surfaces: [],
      sections: [],
      constraints: {
        motion: { allowedDurationsMs: [120], allowedTimingFunctions: ["linear"] },
      },
    }, null, 2),
    "utf8",
  );
  return dir;
}

test("onboarding smoke: CLI init non-interactive writes artifacts and lineage", async () => {
  const sandbox = await makeSandbox();
  try {
    assert.ok(fs.existsSync(cliPath), `CLI binary missing at ${cliPath}`);
    const canonicalPath = path.join(sandbox, "contracts", "surfaces.web.contract.json");
    const beforeHash = sha256File(canonicalPath);
    const init = run(
      "node",
      [cliPath, "init", "--non-interactive", "--url", "https://example.com", "--surface", "smoke-surface"],
      { cwd: sandbox, env: { INTERFACECTL_AUTH_PROFILES_PATH: path.join(sandbox, "auth-profiles.json") } },
    );
    assert.equal(init.status, 0, init.stderr || init.stdout);

    const generatedDir = path.join(sandbox, "contracts", "generated");
    const contractPath = path.join(generatedDir, "smoke-surface.contract.json");
    const extractionPath = path.join(generatedDir, "smoke-surface.extraction.json");
    const runsPath = path.join(generatedDir, "contract-runs.json");
    const lineagePath = path.join(generatedDir, "contract-lineage.json");
    assert.ok(fs.existsSync(contractPath), "Expected onboarding contract artifact");
    assert.ok(fs.existsSync(extractionPath), "Expected onboarding extraction artifact");
    assert.ok(fs.existsSync(runsPath), "Expected contract-runs.json");
    assert.ok(fs.existsSync(lineagePath), "Expected contract-lineage.json");

    const runs = JSON.parse(await fsp.readFile(runsPath, "utf8"));
    assert.ok(runs.runs.some((entry) => entry.surfaceId === "smoke-surface" && entry.source === "generation"));
    const lineage = JSON.parse(await fsp.readFile(lineagePath, "utf8"));
    assert.equal(lineage.surfaces["smoke-surface"]?.lastSource, "generation");

    const validator = run("node", [path.join(repoRoot, "scripts/validate-run-artifacts.mjs")], { cwd: sandbox });
    assert.equal(validator.status, 0, validator.stderr || validator.stdout);

    const afterHash = sha256File(canonicalPath);
    assert.equal(afterHash, beforeHash, "Canonical contract must not mutate during onboarding.");
  } finally {
    await fsp.rm(sandbox, { recursive: true, force: true });
  }
});

test("onboarding smoke: API route direct call succeeds and returns policy membership", async () => {
  const sandbox = await makeSandbox();
  const appDir = path.join(repoRoot, "apps", "surfaceops-web");
  try {
    const command = `
      import { POST } from "./app/api/onboarding/extract/route.ts";
      (async () => {
        const req = new Request("http://localhost/api/onboarding/extract", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            url: "https://example.com/products"
          })
        });
        const res = await POST(req);
        const body = await res.json();
        console.log(JSON.stringify({ status: res.status, body }));
      })();
    `;
    const route = run(
      "pnpm",
      ["--filter", "surfaceops-web", "exec", "tsx", "-e", command],
      {
        cwd: repoRoot,
        env: { SURFACEOPS_CONTRACTS_DIR: path.join(sandbox, "contracts") },
      },
    );
    assert.equal(route.status, 0, route.stderr || route.stdout);
    const line = route.stdout.trim().split("\n").filter(Boolean).at(-1);
    assert.ok(line, route.stdout);
    const payload = JSON.parse(line);
    assert.equal(payload.status, 200);
    assert.equal(payload.body.state, "completed");
    assert.equal(payload.body.status, "warn");
    assert.equal(payload.body.inPolicyContract, false);
    assert.ok(payload.body.surfaceId);
    assert.ok(payload.body.extraction.reportPath.includes(".extraction.json"));
  } finally {
    await fsp.rm(sandbox, { recursive: true, force: true });
  }
});

test("onboarding smoke: API route invalid URL fails and does not write activation", async () => {
  const sandbox = await makeSandbox();
  try {
    const command = `
      import { POST } from "./app/api/onboarding/extract/route.ts";
      (async () => {
        const req = new Request("http://localhost/api/onboarding/extract", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ url: "not-a-url" })
        });
        const res = await POST(req);
        const body = await res.json();
        console.log(JSON.stringify({ status: res.status, body }));
      })();
    `;
    const route = run(
      "pnpm",
      ["--filter", "surfaceops-web", "exec", "tsx", "-e", command],
      {
        cwd: repoRoot,
        env: { SURFACEOPS_CONTRACTS_DIR: path.join(sandbox, "contracts") },
      },
    );
    assert.equal(route.status, 0, route.stderr || route.stdout);
    const payload = JSON.parse(route.stdout.trim().split("\n").filter(Boolean).at(-1));
    assert.equal(payload.status, 400);
    assert.equal(payload.body.state, "failed");
    const generatedDir = path.join(sandbox, "contracts", "generated");
    const files = await fsp.readdir(generatedDir);
    assert.equal(files.length, 0, "Invalid onboarding request should not write generated artifacts.");
  } finally {
    await fsp.rm(sandbox, { recursive: true, force: true });
  }
});
