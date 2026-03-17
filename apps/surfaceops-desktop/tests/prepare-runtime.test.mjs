import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";

import { repairBrokenPnpmAliasSymlinks } from "../scripts/prepare-runtime.mjs";

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
