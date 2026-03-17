import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  DEFAULT_LOCAL_WORKBENCH_PORT,
  DEFAULT_LOCAL_WORKBENCH_ENV,
  resolveLocalWorkbenchPort,
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

test("local workbench dev resolves an explicit port override", () => {
  const port = resolveLocalWorkbenchPort({
    env: {
      SURFACEOPS_LOCAL_WORKBENCH_PORT: "4311",
    },
  });

  assert.equal(port, 4311);
  assert.equal(
    resolveLocalWorkbenchPort({ env: {} }),
    DEFAULT_LOCAL_WORKBENCH_PORT,
  );
});

test("generic dev scripts remain unchanged and local workbench scripts are explicit", async () => {
  const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "..");
  const rootPackageJson = JSON.parse(await fsp.readFile(path.join(repoRoot, "package.json"), "utf8"));
  const appPackageJson = JSON.parse(
    await fsp.readFile(path.join(repoRoot, "apps", "surfaceops-web", "package.json"), "utf8"),
  );

  assert.equal(rootPackageJson.scripts["dev:surfaceops"], "pnpm --filter surfaceops-web dev");
  assert.equal(
    rootPackageJson.scripts["dev:surfaceops:rehearsal-feed"],
    "pnpm --filter surfaceops-web dev:rehearsal-feed",
  );
  assert.equal(
    rootPackageJson.scripts["surfaceops:unsigned-rehearsal:stage"],
    "node scripts/release/stage-surfaceops-desktop-unsigned-rehearsal.mjs",
  );
  assert.equal(
    rootPackageJson.scripts["surfaceops:unsigned-rehearsal:serve"],
    "node scripts/release/serve-surfaceops-desktop-unsigned-rehearsal.mjs",
  );
  assert.equal(
    rootPackageJson.scripts["dev:surfaceops:unsigned-rehearsal-feed"],
    "pnpm --filter surfaceops-web dev:unsigned-rehearsal-feed",
  );
  assert.equal(
    rootPackageJson.scripts["dev:surfaceops:local-workbench"],
    "pnpm --filter surfaceops-web dev:local-workbench",
  );
  assert.equal(
    rootPackageJson.scripts["dev:surfaceops:desktop:unsigned-rehearsal"],
    "pnpm --filter surfaceops-desktop dev:unsigned-rehearsal",
  );
  assert.equal(appPackageJson.scripts.dev, "next dev --port 3001 --webpack");
  assert.equal(
    appPackageJson.scripts["dev:rehearsal-feed"],
    "SURFACEOPS_DESKTOP_RELEASE_MANIFEST_URL=https://github.com/Surfaces-Platform/surfaces-webapps/releases/download/surfaceops-desktop-feed-rehearsal/surfaceops-desktop-release-manifest.json next dev --port 3001 --webpack",
  );
  assert.equal(
    appPackageJson.scripts["dev:unsigned-rehearsal-feed"],
    "node scripts/dev-unsigned-rehearsal-feed.mjs",
  );
  assert.equal(appPackageJson.scripts["dev:local-workbench"], "node scripts/dev-local-workbench.mjs");
  const desktopPackageJson = JSON.parse(
    await fsp.readFile(path.join(repoRoot, "apps", "surfaceops-desktop", "package.json"), "utf8"),
  );
  assert.equal(desktopPackageJson.scripts["dev:unsigned-rehearsal"], "node scripts/dev-unsigned-rehearsal.mjs");
});
