import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const repoRoot = path.resolve(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "../.."),
);

test("docs ownership guard passes", () => {
  const result = spawnSync(process.execPath, ["scripts/check-docs-ownership.mjs"], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  assert.equal(
    result.status,
    0,
    `docs ownership guard failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );
});
