#!/usr/bin/env node
/**
 * Prints provenance information for interfacectl validation runs.
 * Resolver-backed script that prints CLI source, binary path, version, repo SHA,
 * workspace root, contract path, and schema checksum.
 */

import { spawnSync } from "node:child_process";
import { createHash } from "crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "url";
import { dirname, join, resolve } from "path";
import fs from "node:fs";

import { resolveCliTool } from "./lib/interfacectl-tooling.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const workspaceRoot = resolve(join(__dirname, ".."));
const contractPath = "./contracts/surfaces.web.contract.json";
const strict = process.argv.includes("--strict") || process.env.CI === "true";
const requireFromWorkspace = createRequire(join(workspaceRoot, "__surfaces_provenance__.cjs"));

function toDisplayPath(targetPath) {
  if (!targetPath) return "unresolved";
  if (targetPath.startsWith(workspaceRoot)) {
    const relative = targetPath.slice(workspaceRoot.length + 1);
    return relative ? `./${relative}` : ".";
  }
  return targetPath;
}

function runGit(cwd, args) {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    return undefined;
  }
  return result.stdout.trim() || undefined;
}

function resolveValidatorPackageRoot(cliResolution) {
  if (cliResolution.repoRoot) {
    return join(cliResolution.repoRoot, "packages", "interfacectl-validator");
  }

  try {
    const validatorPackageJson = requireFromWorkspace.resolve(
      "@surfaces/interfacectl-validator/package.json",
    );
    return dirname(validatorPackageJson);
  } catch {
    return undefined;
  }
}

function resolveSchemaPath(validatorPackageRoot) {
  if (!validatorPackageRoot) {
    return undefined;
  }

  for (const relativePath of [
    join("dist", "schema", "web.surface.contract.schema.json"),
    join("src", "schema", "web.surface.contract.schema.json"),
  ]) {
    const candidate = join(validatorPackageRoot, relativePath);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

let cliResolution;
let resolutionError;

try {
  cliResolution = resolveCliTool({ cwd: workspaceRoot });
} catch (error) {
  resolutionError = error instanceof Error ? error.message : String(error);
}

const validatorPackageRoot = cliResolution
  ? resolveValidatorPackageRoot(cliResolution)
  : undefined;
const schemaPath = resolveSchemaPath(validatorPackageRoot);
const schemaChecksum = schemaPath
  ? createHash("sha256").update(fs.readFileSync(schemaPath)).digest("hex")
  : undefined;
const gitSha = cliResolution?.repoRoot
  ? runGit(cliResolution.repoRoot, ["rev-parse", "HEAD"])
  : undefined;

console.log("=== Validation Provenance ===");
console.log(`CLI Source: ${cliResolution?.source ?? "unresolved"}`);
console.log(`Binary: ${toDisplayPath(cliResolution?.path)}`);
console.log(`CLI Version: ${cliResolution?.version ?? "unknown"}`);
console.log(`CLI Repo Root: ${toDisplayPath(cliResolution?.repoRoot)}`);
console.log(`CLI Repo SHA: ${gitSha ?? "unresolved"}`);
console.log(`Workspace Root: ${workspaceRoot}`);
console.log(`Contract: ${contractPath}`);
console.log(`Schema Path: ${toDisplayPath(schemaPath)}`);
console.log(`Schema SHA256: ${schemaChecksum ?? "unresolved"}`);
console.log("");

if (strict) {
  const missing = [];
  if (!cliResolution?.source) missing.push("CLI source");
  if (!cliResolution?.path) missing.push("CLI binary path");
  if (!cliResolution?.version) missing.push("CLI version");
  if (!schemaChecksum) missing.push("schema checksum");
  if (
    cliResolution?.source &&
    cliResolution.source !== "installed-package" &&
    cliResolution.source !== "explicit-cli" &&
    !gitSha
  ) {
    missing.push("CLI repo SHA");
  }

  if (missing.length > 0) {
    console.error(
      `Provenance resolution failed: ${missing.join(", ")}${
        resolutionError ? ` (${resolutionError})` : ""
      }`,
    );
    process.exit(1);
  }
}
