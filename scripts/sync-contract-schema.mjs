#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const workspaceRoot = process.cwd();
const source = resolve(
  workspaceRoot,
  "tools/interfacectl/packages/interfacectl-validator/src/schema/web.surface.contract.schema.json",
);
const target = resolve(workspaceRoot, "contracts/web.surface.contract.schema.json");

if (!existsSync(source)) {
  console.error(`Schema sync failed: source not found at ${source}`);
  process.exit(1);
}

mkdirSync(dirname(target), { recursive: true });
copyFileSync(source, target);
console.log(`Synced contract schema -> ${target}`);
