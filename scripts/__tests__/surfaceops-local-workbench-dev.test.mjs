import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  DEFAULT_LOCAL_WORKBENCH_ENV,
  resolveLocalWorkbenchEnv,
} from "../../apps/surfaceops-web/scripts/dev-local-workbench.mjs";

function writeFile(filePath, contents) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents, "utf8");
}

function writeStandaloneInterfacectlRepo(repoRoot) {
  writeFile(
    path.join(repoRoot, "packages", "interfacectl-cli", "package.json"),
    JSON.stringify({
      name: "@surfaces/interfacectl-cli",
      version: "0.1.0",
      main: "dist/index.js",
    }),
  );
  writeFile(
    path.join(repoRoot, "packages", "interfacectl-validator", "package.json"),
    JSON.stringify({
      name: "@surfaces/interfacectl-validator",
      version: "0.1.0",
    }),
  );
}

test("local workbench dev defaults inject required env and prefer sibling interfacectl root", async () => {
  const sandbox = await fsp.mkdtemp(path.join(os.tmpdir(), "surfaceops-local-workbench-env-"));
  const surfacesRoot = path.join(sandbox, "surfaces-webapps");
  const interfacectlRoot = path.join(sandbox, "interfacectl");

  try {
    writeStandaloneInterfacectlRepo(interfacectlRoot);

    const env = resolveLocalWorkbenchEnv({
      cwd: surfacesRoot,
      env: {},
    });

    assert.equal(env.SURFACEOPS_LOCAL_WORKBENCH, DEFAULT_LOCAL_WORKBENCH_ENV.SURFACEOPS_LOCAL_WORKBENCH);
    assert.equal(env.SURFACEOPS_LOCAL_LLM_BASE_URL, DEFAULT_LOCAL_WORKBENCH_ENV.SURFACEOPS_LOCAL_LLM_BASE_URL);
    assert.equal(env.SURFACEOPS_LOCAL_LLM_MODEL, DEFAULT_LOCAL_WORKBENCH_ENV.SURFACEOPS_LOCAL_LLM_MODEL);
    assert.equal(env.SURFACES_INTERFACECTL_ROOT, interfacectlRoot);
  } finally {
    await fsp.rm(sandbox, { recursive: true, force: true });
  }
});

test("local workbench dev preserves explicit operator overrides", () => {
  const env = resolveLocalWorkbenchEnv({
    cwd: "/tmp/surfaces-webapps",
    env: {
      SURFACEOPS_LOCAL_WORKBENCH: "1",
      SURFACEOPS_LOCAL_LLM_BASE_URL: "http://127.0.0.1:9999/v1",
      SURFACEOPS_LOCAL_LLM_MODEL: "qwen/qwen3-coder-30b",
      SURFACEOPS_LOCAL_LLM_API_KEY: "demo-key",
      SURFACES_INTERFACECTL_ROOT: "/custom/interfacectl",
    },
  });

  assert.equal(env.SURFACEOPS_LOCAL_LLM_BASE_URL, "http://127.0.0.1:9999/v1");
  assert.equal(env.SURFACEOPS_LOCAL_LLM_MODEL, "qwen/qwen3-coder-30b");
  assert.equal(env.SURFACEOPS_LOCAL_LLM_API_KEY, "demo-key");
  assert.equal(env.SURFACES_INTERFACECTL_ROOT, "/custom/interfacectl");
});

test("generic dev scripts remain unchanged and local workbench scripts are explicit", async () => {
  const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "..");
  const rootPackageJson = JSON.parse(await fsp.readFile(path.join(repoRoot, "package.json"), "utf8"));
  const appPackageJson = JSON.parse(
    await fsp.readFile(path.join(repoRoot, "apps", "surfaceops-web", "package.json"), "utf8"),
  );

  assert.equal(rootPackageJson.scripts["dev:surfaceops"], "pnpm --filter surfaceops-web dev");
  assert.equal(
    rootPackageJson.scripts["dev:surfaceops:local-workbench"],
    "pnpm --filter surfaceops-web dev:local-workbench",
  );
  assert.equal(appPackageJson.scripts.dev, "next dev --port 3001 --webpack");
  assert.equal(appPackageJson.scripts["dev:local-workbench"], "node scripts/dev-local-workbench.mjs");
});
