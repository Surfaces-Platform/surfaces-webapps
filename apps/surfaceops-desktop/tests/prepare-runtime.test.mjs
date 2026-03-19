import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";

import {
  prepareBundledModelRuntime,
  prepareBundledWorkbenchRuntime,
  repairBrokenPnpmAliasSymlinks,
  resolvePreparedStandaloneServerPath,
} from "../scripts/prepare-runtime.mjs";

test("repairBrokenPnpmAliasSymlinks repoints broken alias entries to an available pnpm package", async () => {
  const tempRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "surfaceops-standalone-"));
  const standaloneRoot = path.join(tempRoot, "standalone");
  const pnpmRoot = path.join(standaloneRoot, "node_modules", ".pnpm");
  const aliasRoot = path.join(pnpmRoot, "node_modules");
  const semverTarget = path.join(pnpmRoot, "semver@7.7.3", "node_modules", "semver");
  const aliasPath = path.join(aliasRoot, "semver");

  await fsp.mkdir(semverTarget, { recursive: true });
  await fsp.writeFile(path.join(semverTarget, "package.json"), '{"name":"semver","version":"7.7.3"}', "utf8");
  await fsp.mkdir(aliasRoot, { recursive: true });
  await fsp.symlink("../semver@6.3.1/node_modules/semver", aliasPath, "dir");

  const repairs = await repairBrokenPnpmAliasSymlinks(standaloneRoot);

  assert.equal(repairs.length, 1);
  assert.equal(repairs[0].packageName, "semver");
  assert.equal(fs.existsSync(aliasPath), true);
  assert.equal(fs.realpathSync(aliasPath), fs.realpathSync(semverTarget));

  await fsp.rm(tempRoot, { recursive: true, force: true });
});

test("prepareBundledModelRuntime copies template assets and an injected llama-server binary", async () => {
  const tempRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "surfaceops-model-runtime-"));
  const templateRoot = path.join(tempRoot, "template");
  const outputRoot = path.join(tempRoot, "output");
  const sourceBinaryPath = path.join(tempRoot, "llama-server");

  await fsp.mkdir(templateRoot, { recursive: true });
  await fsp.writeFile(path.join(templateRoot, "README.md"), "template", "utf8");
  await fsp.writeFile(sourceBinaryPath, "#!/bin/sh\necho llama\n", "utf8");

  const prepared = await prepareBundledModelRuntime({
    templateRoot,
    outputRoot,
    sourceBinaryPath,
  });

  assert.equal(prepared.binaryPath, path.join(outputRoot, "llama-server"));
  assert.equal(fs.existsSync(path.join(outputRoot, "README.md")), true);
  assert.equal(fs.existsSync(path.join(outputRoot, "llama-server")), true);

  await fsp.rm(tempRoot, { recursive: true, force: true });
});

test("prepareBundledModelRuntime downloads and extracts the pinned runtime bundle from a local manifest source", async () => {
  const tempRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "surfaceops-model-runtime-archive-"));
  const templateRoot = path.join(tempRoot, "template");
  const outputRoot = path.join(tempRoot, "output");
  const cacheRoot = path.join(tempRoot, "cache");
  const archiveRoot = path.join(tempRoot, "llama-b7472");
  const archivePath = path.join(tempRoot, "llama-b7472-bin-macos-arm64.tar.gz");
  const binaryContents = Buffer.from("#!/bin/sh\necho bundled\n", "utf8");

  try {
    await fsp.mkdir(templateRoot, { recursive: true });
    await fsp.writeFile(path.join(templateRoot, "README.md"), "template", "utf8");
    await fsp.mkdir(archiveRoot, { recursive: true });
    await fsp.writeFile(path.join(archiveRoot, "llama-server"), binaryContents);
    await fsp.writeFile(path.join(archiveRoot, "libllama.dylib"), "dylib", "utf8");

    const tarResult = spawnSync("tar", ["-czf", archivePath, "-C", tempRoot, "llama-b7472"]);
    assert.equal(tarResult.status, 0);

    const archiveHash = createHash("sha256")
      .update(await fsp.readFile(archivePath))
      .digest("hex");
    await fsp.writeFile(
      path.join(templateRoot, "llama-runtime.manifest.json"),
      JSON.stringify({
        vendor: "ggml-org/llama.cpp",
        releaseTag: "b7472",
        assetName: path.basename(archivePath),
        downloadUrl: pathToFileURL(archivePath).toString(),
        sha256: archiveHash,
        sizeBytes: (await fsp.stat(archivePath)).size,
        archiveRoot: "llama-b7472",
        entrypoint: "llama-server",
      }, null, 2),
      "utf8",
    );

    const prepared = await prepareBundledModelRuntime({
      templateRoot,
      outputRoot,
      cacheRoot,
    });

    assert.equal(prepared.binaryPath, path.join(outputRoot, "llama-server"));
    assert.equal(fs.existsSync(path.join(outputRoot, "libllama.dylib")), true);
    assert.equal(fs.existsSync(path.join(cacheRoot, path.basename(archivePath))), true);
  } finally {
    await fsp.rm(tempRoot, { recursive: true, force: true });
  }
});

test("prepareBundledModelRuntime fails fast when the prepared runtime is missing llama-server", async () => {
  const tempRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "surfaceops-model-runtime-missing-"));
  const templateRoot = path.join(tempRoot, "template");
  const outputRoot = path.join(tempRoot, "output");
  const sourceBinaryPath = path.join(tempRoot, "missing-runtime");

  try {
    await fsp.mkdir(templateRoot, { recursive: true });
    await fsp.writeFile(path.join(templateRoot, "README.md"), "template", "utf8");
    await fsp.mkdir(sourceBinaryPath, { recursive: true });
    await fsp.writeFile(path.join(sourceBinaryPath, "libllama.dylib"), "dylib", "utf8");

    await assert.rejects(
      () => prepareBundledModelRuntime({
        templateRoot,
        outputRoot,
        sourceBinaryPath,
      }),
      /Expected llama-server in override runtime path/,
    );
  } finally {
    await fsp.rm(tempRoot, { recursive: true, force: true });
  }
});

test("prepareBundledWorkbenchRuntime preserves standalone symlinks inside the bundled runtime", async () => {
  const tempRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "surfaceops-workbench-runtime-"));
  const standaloneRoot = path.join(tempRoot, "standalone");
  const runtimeRoot = path.join(tempRoot, "runtime");
  const staticRoot = path.join(tempRoot, "static");
  const publicRoot = path.join(tempRoot, "public");
  const nextTarget = path.join(standaloneRoot, "node_modules", ".pnpm", "next@1.0.0", "node_modules", "next");
  const appNodeModules = path.join(standaloneRoot, "apps", "surfaceops-web", "node_modules");
  const appNextLink = path.join(appNodeModules, "next");

  try {
    await fsp.mkdir(path.join(standaloneRoot, "apps", "surfaceops-web"), { recursive: true });
    await fsp.mkdir(nextTarget, { recursive: true });
    await fsp.mkdir(appNodeModules, { recursive: true });
    await fsp.writeFile(path.join(standaloneRoot, "apps", "surfaceops-web", "server.js"), "console.log('server');\n", "utf8");
    await fsp.writeFile(path.join(nextTarget, "package.json"), '{"name":"next","version":"1.0.0"}', "utf8");
    await fsp.symlink("../../../node_modules/.pnpm/next@1.0.0/node_modules/next", appNextLink, "dir");
    await fsp.mkdir(staticRoot, { recursive: true });
    await fsp.writeFile(path.join(staticRoot, "asset.txt"), "static", "utf8");
    await fsp.mkdir(publicRoot, { recursive: true });
    await fsp.writeFile(path.join(publicRoot, "favicon.ico"), "icon", "utf8");

    const prepared = await prepareBundledWorkbenchRuntime({
      standaloneRoot,
      staticRoot,
      publicRoot,
      outputRoot: runtimeRoot,
    });

    const bundledNextLink = path.join(runtimeRoot, "standalone", "apps", "surfaceops-web", "node_modules", "next");
    assert.equal(fs.lstatSync(bundledNextLink).isSymbolicLink(), true);
    assert.equal(
      await fsp.readlink(bundledNextLink),
      "../../../node_modules/.pnpm/next@1.0.0/node_modules/next",
    );
    assert.equal(
      prepared.serverPath,
      path.join(runtimeRoot, "standalone", "apps", "surfaceops-web", "server.js"),
    );
    const metadata = JSON.parse(await fsp.readFile(prepared.metadataPath, "utf8"));
    assert.match(metadata.preparedAt, /T/);
    assert.equal(metadata.serverPath, path.join("standalone", "apps", "surfaceops-web", "server.js"));
  } finally {
    await fsp.rm(tempRoot, { recursive: true, force: true });
  }
});

test("resolvePreparedStandaloneServerPath keeps bundled metadata inside the copied runtime", () => {
  const preparedServerPath = resolvePreparedStandaloneServerPath({
    runtimeRoot: "/bundle/surfaceops-web-runtime",
    standaloneRoot: "/repo/apps/surfaceops-web/.next/standalone",
    resolvedServerPath: "/repo/apps/surfaceops-web/.next/standalone/apps/surfaceops-web/server.js",
  });

  assert.equal(
    preparedServerPath,
    path.join("/bundle/surfaceops-web-runtime", "standalone", "apps", "surfaceops-web", "server.js"),
  );
});

test("resolvePreparedStandaloneServerPath rejects servers outside the standalone bundle", () => {
  assert.throws(
    () => resolvePreparedStandaloneServerPath({
      runtimeRoot: "/bundle/surfaceops-web-runtime",
      standaloneRoot: "/repo/apps/surfaceops-web/.next/standalone",
      resolvedServerPath: "/repo/apps/surfaceops-web/server.js",
    }),
    /is not contained within/,
  );
});
