#!/usr/bin/env node
import fs from "fs";
import path from "path";
import url from "url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../../../"); // monorepo root
const contractPath = path.join(root, "contracts/surfaces.web.contract.json");
const outPath = path.join(__dirname, "manifest.json");

const contract = JSON.parse(fs.readFileSync(contractPath, "utf8"));
const surface = contract.surfaces?.find((s) => s.id === "surfaces-web");
if (!surface) {
  console.error("Surface surfaces-web not found in contract");
  process.exit(1);
}

const manifest = {
  contractId: contract.contractId,
  version: contract.version,
  surfaceId: surface.id,
  layout: surface.layout,
  color: contract.color,
  motion: contract.constraints?.motion,
};

fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2));
console.log(`Wrote manifest to ${outPath}`);
