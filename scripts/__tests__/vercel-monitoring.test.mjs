import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { execFileSync, spawnSync } from "node:child_process";

const repoRoot = path.resolve(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "../..")
);
const scriptsDir = path.join(repoRoot, "scripts");
const fixturesDir = path.join(scriptsDir, "__fixtures__");

function makeTempSandbox() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "vercel-mon-"));
  const contractsDir = path.join(dir, "contracts");
  const scriptsOut = path.join(dir, "scripts");
  fs.mkdirSync(contractsDir, { recursive: true });
  fs.mkdirSync(scriptsOut, { recursive: true });

  // Copy scripts under test
  for (const script of ["check-vercel-deployments.sh", "monitor-vercel.sh"]) {
    const src = path.join(scriptsDir, script);
    const dest = path.join(scriptsOut, script);
    fs.copyFileSync(src, dest);
    fs.chmodSync(dest, 0o755);
  }

  // Provide contract fixture under both the canonical name we prefer and the
  // current path the scripts consume.
  const fixture = path.join(fixturesDir, "contracts", "web.surface.contract.json");
  const canonical = path.join(contractsDir, "web.surface.contract.json");
  fs.copyFileSync(fixture, canonical);
  fs.copyFileSync(fixture, path.join(contractsDir, "surfaces.web.contract.json"));

  // Mock jq and vercel binaries on PATH
  const binDir = path.join(dir, "bin");
  fs.mkdirSync(binDir);

  const jqPath = path.join(binDir, "jq");
  fs.writeFileSync(
    jqPath,
    [
      "#!/usr/bin/env node",
      "const fs = require('fs');",
      "const file = process.argv[process.argv.length - 1];",
      "const data = JSON.parse(fs.readFileSync(file, 'utf8'));",
      "if (process.env.JQ_MODE === 'monitor') {",
      "  for (const s of data.surfaces) {",
      "    const name = s.domain.replace(/^www\\./, '');",
      "    console.log(`${name}:https://${s.domain}`);",
      "  }",
      "} else {",
      "  for (const s of data.surfaces) console.log('https://' + s.domain);",
      "}",
    ].join("\\n")
  );
  fs.chmodSync(jqPath, 0o755);

  const vercelPath = path.join(binDir, "vercel");
  fs.writeFileSync(
    vercelPath,
    [
      "#!/usr/bin/env node",
      "const url = process.argv[2];",
      "const name = url.replace(/^https:\\/\\//, '');",
      "console.log('status   ● Ready');",
      "console.log('target   production');",
      "console.log('id       dep_' + name.replace(/[^a-zA-Z0-9]/g, ''));",
      "console.log('created  2026-02-06T20:00:00Z');",
      "console.log('url      ' + url);",
    ].join("\\n")
  );
  fs.chmodSync(vercelPath, 0o755);

  const env = {
    ...process.env,
    PATH: `${binDir}:${process.env.PATH}`,
  };

  return { dir, scriptsOut, env };
}

function runScript(scriptName, args = [], options = {}) {
  const { dir, scriptsOut, env } = options.sandbox;
  return execFileSync(path.join(scriptsOut, scriptName), args, {
    cwd: dir,
    env,
    encoding: "utf8",
  });
}

test("check-vercel-deployments derives domains from contract", () => {
  const sandbox = makeTempSandbox();
  sandbox.env.PROJECTS_OVERRIDE = [
    "https://www.foo.com",
    "https://app.bar.com",
  ].join(",");
  const output = runScript("check-vercel-deployments.sh", [], { sandbox });
  assert.match(output, /foo.com/);
  assert.match(output, /bar.com/);
});

test("check-vercel-deployments respects explicit URL arg", () => {
  const sandbox = makeTempSandbox();
  delete sandbox.env.PROJECTS_OVERRIDE;
  const output = runScript("check-vercel-deployments.sh", ["https://only.this"], {
    sandbox,
  });
  assert.match(output, /only/);
});

test("monitor-vercel parses inspect output", () => {
  const sandbox = makeTempSandbox();
  sandbox.env.JQ_MODE = "monitor";
  sandbox.env.PROJECTS_OVERRIDE = [
    "foo.com:https://www.foo.com",
    "app.bar.com:https://app.bar.com",
  ].join(",");
  const output = runScript("monitor-vercel.sh", [], { sandbox });
  assert.match(output, /foo.com/);
  assert.match(output, /bar.com/);
});

test("scripts fail when contract missing", async () => {
  const sandbox = makeTempSandbox();
  await fsp.rm(path.join(sandbox.dir, "contracts", "surfaces.web.contract.json"));
  await fsp.rm(path.join(sandbox.dir, "contracts", "web.surface.contract.json"));
  const result = spawnSync(path.join(sandbox.scriptsOut, "check-vercel-deployments.sh"), {
    cwd: sandbox.dir,
    env: sandbox.env,
    encoding: "utf8",
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr || result.stdout, /Contract not found/);
});
