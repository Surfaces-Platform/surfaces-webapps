import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = "/Users/mike/SurfacesPlatform/surfaces-webapps";

function createIsolatedResolverEnv(extraEnv = {}) {
  const env = { ...process.env, ...extraEnv };
  delete env.SURFACES_INTERFACECTL_ROOT;
  delete env.SURFACES_INTERFACECTL_CLI;
  delete env.SURFACES_INTERFACECTL_GENERATION_GUARD;
  return env;
}

function writeFile(filePath, contents) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents, "utf8");
}

function run(command, args, cwd, extraEnv = {}) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    env: createIsolatedResolverEnv(extraEnv),
  });

  if (result.error) {
    throw result.error;
  }

  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function git(cwd, args) {
  const result = run("git", args, cwd);
  if (result.status !== 0) {
    throw new Error(
      `git ${args.join(" ")} failed in ${cwd}\nstatus=${result.status}\nstdout=${result.stdout}\nstderr=${result.stderr}`,
    );
  }
  return result;
}

async function createSandbox() {
  const sandbox = await fsp.mkdtemp(path.join(os.tmpdir(), "surfaces-provenance-"));
  const surfacesRoot = path.join(sandbox, "surfaces-webapps");
  const interfacectlRoot = path.join(sandbox, "interfacectl");

  writeFile(
    path.join(surfacesRoot, "scripts", "print-provenance.mjs"),
    fs.readFileSync(path.join(repoRoot, "scripts", "print-provenance.mjs"), "utf8"),
  );
  writeFile(
    path.join(surfacesRoot, "scripts", "lib", "interfacectl-tooling.mjs"),
    fs.readFileSync(path.join(repoRoot, "scripts", "lib", "interfacectl-tooling.mjs"), "utf8"),
  );
  writeFile(
    path.join(surfacesRoot, "contracts", "surfaces.web.contract.json"),
    JSON.stringify({ $schema: "https://contracts.surfaces.local/web.surface.contract.schema.json" }),
  );

  writeFile(
    path.join(interfacectlRoot, "packages", "interfacectl-cli", "package.json"),
    JSON.stringify({
      name: "@surfaces/interfacectl-cli",
      version: "0.4.0-local.1",
      main: "dist/index.js",
      bin: { interfacectl: "dist/index.js" },
    }),
  );
  writeFile(
    path.join(interfacectlRoot, "packages", "interfacectl-cli", "dist", "index.js"),
    "#!/usr/bin/env node\nconsole.log('0.4.0-local.1');\n",
  );
  fs.chmodSync(
    path.join(interfacectlRoot, "packages", "interfacectl-cli", "dist", "index.js"),
    0o755,
  );
  writeFile(
    path.join(interfacectlRoot, "packages", "interfacectl-validator", "package.json"),
    JSON.stringify({
      name: "@surfaces/interfacectl-validator",
      version: "0.4.0-local.1",
    }),
  );
  writeFile(
    path.join(
      interfacectlRoot,
      "packages",
      "interfacectl-validator",
      "dist",
      "schema",
      "web.surface.contract.schema.json",
    ),
    JSON.stringify({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      $id: "https://contracts.surfaces.local/web.surface.contract.schema.json",
      type: "object",
    }),
  );
  writeFile(
    path.join(interfacectlRoot, "tools", "check-generation-boundaries.mjs"),
    "export {};\n",
  );

  run("git", ["init", "--initial-branch=main", interfacectlRoot], sandbox);
  git(interfacectlRoot, ["config", "user.name", "Codex"]);
  git(interfacectlRoot, ["config", "user.email", "codex@example.com"]);
  git(interfacectlRoot, ["add", "."]);
  git(interfacectlRoot, ["commit", "-m", "initial"]);

  return { sandbox, surfacesRoot, interfacectlRoot };
}

test("print-provenance reports sibling-checkout metadata in strict mode", async () => {
  const { sandbox, surfacesRoot } = await createSandbox();

  try {
    const result = run(process.execPath, ["scripts/print-provenance.mjs", "--strict"], surfacesRoot);
    assert.equal(result.status, 0);
    assert.match(result.stdout, /CLI Source: sibling-checkout/);
    assert.match(result.stdout, /CLI Version: 0\.4\.0-local\.1/);
    assert.match(
      result.stdout,
      /Schema SHA256: [a-f0-9]{64}/,
    );
    assert.doesNotMatch(result.stdout, /Schema SHA256: unresolved/);
  } finally {
    await fsp.rm(sandbox, { recursive: true, force: true });
  }
});

test("print-provenance fails in strict mode when sibling schema cannot be resolved", async () => {
  const { sandbox, surfacesRoot, interfacectlRoot } = await createSandbox();

  try {
    await fsp.rm(
      path.join(
        interfacectlRoot,
        "packages",
        "interfacectl-validator",
        "dist",
        "schema",
      ),
      { recursive: true, force: true },
    );

    const result = run(process.execPath, ["scripts/print-provenance.mjs", "--strict"], surfacesRoot);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /schema checksum/);
  } finally {
    await fsp.rm(sandbox, { recursive: true, force: true });
  }
});
