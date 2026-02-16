#!/usr/bin/env node
import fs from "node:fs";
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

function ensureColorPolicy(color) {
  if (!color || typeof color !== "object") {
    throw new Error("Contract is missing required top-level color policy.");
  }
  if (!color.sourceOfTruth) {
    throw new Error("Contract color policy must include sourceOfTruth.");
  }
  if (!color.rawValues) {
    throw new Error("Contract color policy must include rawValues.");
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const root = process.cwd();
  const contractPath = path.resolve(
    root,
    args.contract ?? "contracts/surfaces.web.contract.json",
  );
  const outPath = path.resolve(
    root,
    args.out ?? `contracts/generated/${args.surface}.runtime-manifest.json`,
  );

  const contract = JSON.parse(fs.readFileSync(contractPath, "utf8"));
  const surface = contract.surfaces?.find((entry) => entry.id === args.surface);

  if (!surface) {
    throw new Error(`Surface "${args.surface}" not found in ${contractPath}`);
  }

  ensureColorPolicy(contract.color);

  const manifest = {
    contractId: contract.contractId,
    version: contract.version,
    surfaceId: surface.id,
    layout: surface.layout,
    color: contract.color,
    motion: contract.constraints?.motion,
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Wrote runtime manifest: ${path.relative(root, outPath)}`);
}

main();
