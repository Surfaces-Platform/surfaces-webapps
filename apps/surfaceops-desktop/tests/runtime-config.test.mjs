import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";

import {
  DEFAULT_SURFACEOPS_DESKTOP_PORT,
  buildManagedServerCommand,
  resolveSurfaceOpsDesktopConfig,
} from "../lib/runtime-config.cjs";

test("surfaceops desktop config uses a managed localhost server by default", () => {
  const config = resolveSurfaceOpsDesktopConfig({
    env: {},
    appRoot: "/repo/apps/surfaceops-desktop",
    repoRoot: "/repo",
  });

  assert.equal(config.managedPort, DEFAULT_SURFACEOPS_DESKTOP_PORT);
  assert.equal(config.baseUrl, `http://localhost:${DEFAULT_SURFACEOPS_DESKTOP_PORT}`);
  assert.equal(config.launchUrl, `http://localhost:${DEFAULT_SURFACEOPS_DESKTOP_PORT}/contracts/governance`);
  assert.equal(config.shouldSpawnManagedServer, true);
  assert.equal(config.updateChannel, "alpha");
});

test("surfaceops desktop config respects explicit target url and local port overrides", () => {
  const config = resolveSurfaceOpsDesktopConfig({
    env: {
      SURFACEOPS_DESKTOP_TARGET_URL: "http://127.0.0.1:4400",
      SURFACEOPS_DESKTOP_WORKBENCH_PATH: "/download",
      SURFACEOPS_DESKTOP_PORT: "4400",
      SURFACEOPS_UPDATE_CHANNEL: "stable",
      SURFACEOPS_UPDATE_BASE_URL: "https://surfaceops.ai/api/desktop/updates",
    },
    appRoot: "/repo/apps/surfaceops-desktop",
    repoRoot: "/repo",
  });

  assert.equal(config.baseUrl, "http://127.0.0.1:4400");
  assert.equal(config.launchUrl, "http://127.0.0.1:4400/download");
  assert.equal(config.managedPort, 4400);
  assert.equal(config.shouldSpawnManagedServer, false);
  assert.equal(config.updateChannel, "stable");
  assert.equal(config.updateBaseUrl, "https://surfaceops.ai/api/desktop/updates");
});

test("managed server command starts the local workbench with desktop env markers", () => {
  const config = resolveSurfaceOpsDesktopConfig({
    env: {
      SURFACEOPS_DESKTOP_PORT: "4311",
    },
    appRoot: "/repo/apps/surfaceops-desktop",
    repoRoot: "/repo",
  });

  const command = buildManagedServerCommand(config, {
    env: {
      SURFACES_INTERFACECTL_ROOT: "/repo/../interfacectl",
    },
  });

  assert.equal(command.command, "pnpm");
  assert.deepEqual(command.args, ["run", "dev:local-workbench"]);
  assert.equal(command.cwd, path.join("/repo", "apps", "surfaceops-web"));
  assert.equal(command.env.SURFACEOPS_LOCAL_WORKBENCH, "1");
  assert.equal(command.env.SURFACEOPS_DESKTOP_RUNTIME, "1");
  assert.equal(command.env.SURFACEOPS_LOCAL_WORKBENCH_PORT, "4311");
  assert.equal(command.env.SURFACES_INTERFACECTL_ROOT, "/repo/../interfacectl");
});

test("managed server command uses the bundled standalone server in packaged mode", () => {
  const config = resolveSurfaceOpsDesktopConfig({
    env: {},
    appRoot: "/repo/apps/surfaceops-desktop",
    repoRoot: "/repo",
    isPackaged: true,
    bundledRuntimeRoot: "/bundle/runtime",
  });

  const command = buildManagedServerCommand(config, { env: {} });
  assert.equal(command.command, process.execPath);
  assert.match(command.args[0], /server\.js$/);
  assert.equal(command.env.PORT, String(config.managedPort));
});
