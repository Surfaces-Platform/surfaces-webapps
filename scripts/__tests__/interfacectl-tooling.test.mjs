import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  findSiblingInterfacectlRepoRoot,
  resolveCliTool,
  resolveGenerationGuardTool,
} from "../lib/interfacectl-tooling.mjs";

function writeFile(filePath, contents) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents, "utf8");
}

test("resolver honors explicit standalone repo root", async () => {
  const sandbox = await fsp.mkdtemp(path.join(os.tmpdir(), "surfaces-interfacectl-root-"));
  const standaloneRoot = path.join(sandbox, "standalone-interfacectl");

  try {
    writeFile(
      path.join(standaloneRoot, "packages", "interfacectl-cli", "package.json"),
      JSON.stringify({
        name: "@surfaces/interfacectl-cli",
        version: "0.2.0-canary.1",
        main: "dist/index.js",
        bin: { interfacectl: "dist/index.js" },
      }),
    );
    writeFile(
      path.join(standaloneRoot, "packages", "interfacectl-cli", "dist", "index.js"),
      "#!/usr/bin/env node\n",
    );
    writeFile(
      path.join(standaloneRoot, "packages", "interfacectl-validator", "package.json"),
      JSON.stringify({
        name: "@surfaces/interfacectl-validator",
        version: "0.2.0-canary.1",
      }),
    );
    writeFile(
      path.join(standaloneRoot, "tools", "check-generation-boundaries.mjs"),
      "export {};\n",
    );

    const cli = resolveCliTool({
      cwd: sandbox,
      env: { SURFACES_INTERFACECTL_ROOT: standaloneRoot },
    });
    const guard = resolveGenerationGuardTool({
      cwd: sandbox,
      env: { SURFACES_INTERFACECTL_ROOT: standaloneRoot },
      cliResolution: cli,
    });

    assert.equal(cli.source, "explicit-root");
    assert.equal(cli.repoRoot, standaloneRoot);
    assert.equal(cli.version, "0.2.0-canary.1");
    assert.equal(
      cli.path,
      path.join(standaloneRoot, "packages", "interfacectl-cli", "dist", "index.js"),
    );
    assert.equal(guard.source, "explicit-root");
    assert.equal(
      guard.path,
      path.join(standaloneRoot, "tools", "check-generation-boundaries.mjs"),
    );
  } finally {
    await fsp.rm(sandbox, { recursive: true, force: true });
  }
});

test("resolver can use an installed CLI package and local submodule guard fallback", async () => {
  const sandbox = await fsp.mkdtemp(path.join(os.tmpdir(), "surfaces-interfacectl-installed-"));

  try {
    writeFile(
      path.join(
        sandbox,
        "node_modules",
        "@surfaces",
        "interfacectl-cli",
        "package.json",
      ),
      JSON.stringify({
        name: "@surfaces/interfacectl-cli",
        version: "0.1.0",
        main: "dist/index.js",
        bin: { interfacectl: "dist/index.js" },
      }),
    );
    writeFile(
      path.join(
        sandbox,
        "node_modules",
        "@surfaces",
        "interfacectl-cli",
        "dist",
        "index.js",
      ),
      "#!/usr/bin/env node\n",
    );
    writeFile(
      path.join(
        sandbox,
        "tools",
        "interfacectl",
        "tools",
        "check-generation-boundaries.mjs",
      ),
      "export {};\n",
    );

    const cli = resolveCliTool({ cwd: sandbox, env: {} });
    const guard = resolveGenerationGuardTool({
      cwd: sandbox,
      env: {},
      cliResolution: cli,
    });

    assert.equal(cli.source, "installed-package");
    assert.equal(fs.realpathSync(cli.path), fs.realpathSync(path.join(
      sandbox,
      "node_modules",
      "@surfaces",
      "interfacectl-cli",
      "dist",
      "index.js",
    )));
    assert.equal(guard.source, "local-submodule");
    assert.equal(
      guard.path,
      path.join(
        sandbox,
        "tools",
        "interfacectl",
        "tools",
        "check-generation-boundaries.mjs",
      ),
    );
  } finally {
    await fsp.rm(sandbox, { recursive: true, force: true });
  }
});

test("resolver prefers a sibling standalone checkout before installed-package or submodule fallback", async () => {
  const sandbox = await fsp.mkdtemp(path.join(os.tmpdir(), "surfaces-interfacectl-sibling-"));
  const surfacesRoot = path.join(sandbox, "surfaces-webapps");
  const siblingRoot = path.join(sandbox, "interfacectl");

  try {
    writeFile(
      path.join(siblingRoot, "packages", "interfacectl-cli", "package.json"),
      JSON.stringify({
        name: "@surfaces/interfacectl-cli",
        version: "0.3.0-local.1",
        main: "dist/index.js",
        bin: { interfacectl: "dist/index.js" },
      }),
    );
    writeFile(
      path.join(siblingRoot, "packages", "interfacectl-cli", "dist", "index.js"),
      "#!/usr/bin/env node\n",
    );
    writeFile(
      path.join(siblingRoot, "packages", "interfacectl-validator", "package.json"),
      JSON.stringify({
        name: "@surfaces/interfacectl-validator",
        version: "0.3.0-local.1",
      }),
    );
    writeFile(
      path.join(siblingRoot, "tools", "check-generation-boundaries.mjs"),
      "export {};\n",
    );

    writeFile(
      path.join(
        surfacesRoot,
        "node_modules",
        "@surfaces",
        "interfacectl-cli",
        "package.json",
      ),
      JSON.stringify({
        name: "@surfaces/interfacectl-cli",
        version: "0.1.0",
        main: "dist/index.js",
        bin: { interfacectl: "dist/index.js" },
      }),
    );
    writeFile(
      path.join(
        surfacesRoot,
        "node_modules",
        "@surfaces",
        "interfacectl-cli",
        "dist",
        "index.js",
      ),
      "#!/usr/bin/env node\n",
    );

    assert.equal(
      findSiblingInterfacectlRepoRoot({ cwd: surfacesRoot }),
      siblingRoot,
    );

    const cli = resolveCliTool({ cwd: surfacesRoot, env: {} });
    const guard = resolveGenerationGuardTool({
      cwd: surfacesRoot,
      env: {},
      cliResolution: cli,
    });

    assert.equal(cli.source, "sibling-checkout");
    assert.equal(cli.repoRoot, siblingRoot);
    assert.equal(cli.version, "0.3.0-local.1");
    assert.equal(
      cli.path,
      path.join(siblingRoot, "packages", "interfacectl-cli", "dist", "index.js"),
    );
    assert.equal(guard.source, "sibling-checkout");
    assert.equal(
      guard.path,
      path.join(siblingRoot, "tools", "check-generation-boundaries.mjs"),
    );
  } finally {
    await fsp.rm(sandbox, { recursive: true, force: true });
  }
});
