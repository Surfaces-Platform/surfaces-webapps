#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

function parseArgs(argv) {
  const args = { surface: "surfaces-web" };
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (key === "--surface") {
      args.surface = argv[++i];
    } else if (key === "--contract") {
      args.contract = argv[++i];
    } else if (key === "--out") {
      args.out = argv[++i];
    } else {
      throw new Error(`Unknown argument: ${key}`);
    }
  }
  return args;
}

function resolveRepoRoot(start = process.cwd()) {
  let current = path.resolve(start);
  while (true) {
    if (fs.existsSync(path.join(current, "pnpm-workspace.yaml"))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      throw new Error("Could not resolve the Surfaces repo root.");
    }
    current = parent;
  }
}

function runInterfacectl(repoRoot, args) {
  const resolver = path.join(repoRoot, "scripts", "interfacectl-tool.mjs");
  const result = spawnSync(process.execPath, [resolver, "run", "cli", ...args], {
    cwd: repoRoot,
    encoding: "utf8",
    env: process.env,
  });
  if (result.status !== 0) {
    throw new Error([
      `interfacectl ${args[0]} failed with exit code ${result.status ?? 1}.`,
      result.stderr?.trim(),
      result.stdout?.trim(),
    ].filter(Boolean).join("\n"));
  }
  return result.stdout ?? "";
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const root = resolveRepoRoot();
  const contractPath = path.resolve(
    root,
    args.contract ?? "contracts/surfaces.web.contract.json",
  );
  const outPath = path.resolve(
    root,
    args.out ?? `contracts/generated/${args.surface}.runtime-manifest.json`,
  );
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), `surfaces-runtime-${args.surface}-`));
  const bundleRoot = path.join(tempRoot, "bundle");

  try {
    runInterfacectl(root, [
      "compile",
      "--contract",
      contractPath,
      "--out",
      bundleRoot,
    ]);
    const preparedRuntime = JSON.parse(runInterfacectl(root, [
      "prepare-runtime",
      "--bundle-root",
      bundleRoot,
      "--surface",
      args.surface,
    ]) || "{}");
    const manifest = {
      surface: preparedRuntime.surface ?? {},
      contract: {
        id: preparedRuntime.contract?.id ?? "",
        version: preparedRuntime.contract?.version ?? "",
      },
      summary: preparedRuntime.summary ?? {},
      governance: preparedRuntime.governance ?? {},
      runtime: preparedRuntime.runtime ?? {},
      evidenceRefs: Array.isArray(preparedRuntime.evidenceRefs) ? preparedRuntime.evidenceRefs : [],
    };
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(`Wrote runtime manifest: ${path.relative(root, outPath)}`);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

main();
