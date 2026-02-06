#!/usr/bin/env node
/**
 * Prints provenance information for interfacectl validation runs.
 * Cross-platform Node script that extracts git SHA, binary path, CLI version,
 * workspace root, contract path, and schema checksum.
 */

import { execSync } from "child_process";
import { readFileSync, existsSync } from "fs";
import { createHash } from "crypto";
import { fileURLToPath } from "url";
import { dirname, join, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const workspaceRoot = resolve(join(__dirname, ".."));
const contractPath = "./contracts/surfaces.web.contract.json";

// Get git SHA
let gitSha = "not a git repo";
try {
  gitSha = execSync("git rev-parse HEAD", {
    cwd: workspaceRoot,
    encoding: "utf8",
  }).trim();
} catch {
  // Not in a git repo or git not available
}

// Get binary path - derive from package location for robustness
let binaryPath = "./node_modules/.bin/interfacectl";
try {
  // First try to resolve via which (more accurate if available)
  const whichOutput = execSync("pnpm exec which interfacectl", {
    cwd: workspaceRoot,
    encoding: "utf8",
  }).trim();
  // Normalize to relative path if it's in workspace
  if (whichOutput.startsWith(workspaceRoot)) {
    binaryPath = `./${whichOutput.slice(workspaceRoot.length + 1)}`;
  } else {
    binaryPath = whichOutput;
  }
} catch {
  // Fallback: derive from package.json location
  try {
    const cliPackagePath = join(
      workspaceRoot,
      "interfacectl-tooling/packages/interfacectl-cli/package.json",
    );
    if (existsSync(cliPackagePath)) {
      // Package exists, assume standard bin location
      binaryPath = "./node_modules/.bin/interfacectl";
    }
  } catch {
    // Couldn't determine package location - use default
  }
}

// Get CLI version
let cliVersion = "unknown";
try {
  cliVersion = execSync("pnpm exec interfacectl --version", {
    cwd: workspaceRoot,
    encoding: "utf8",
  }).trim();
} catch {
  // Fallback to reading package.json
  try {
    const packageJson = JSON.parse(
      readFileSync(
        join(workspaceRoot, "interfacectl-tooling/packages/interfacectl-cli/package.json"),
        "utf8",
      ),
    );
    cliVersion = packageJson.version;
  } catch {
    // Couldn't read package.json
  }
}

// Get schema checksum (if schema exists)
let schemaChecksum = "schema not found";
try {
  const schemaPath = join(
    workspaceRoot,
    "interfacectl-tooling/packages/interfacectl-validator/dist/schema/web.surface.contract.schema.json",
  );
  if (existsSync(schemaPath)) {
    const schemaContent = readFileSync(schemaPath);
    const hash = createHash("sha256").update(schemaContent).digest("hex");
    schemaChecksum = hash;
  }
} catch {
  // Schema file doesn't exist or couldn't read it
}

console.log("=== Validation Provenance ===");
console.log(`Git SHA: ${gitSha}`);
console.log(`Binary: ${binaryPath}`);
console.log(`CLI Version: ${cliVersion}`);
console.log(`Workspace Root: ${workspaceRoot}`);
console.log(`Contract: ${contractPath}`);
console.log(`Schema SHA256: ${schemaChecksum}`);
console.log("");
