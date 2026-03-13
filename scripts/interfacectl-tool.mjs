#!/usr/bin/env node
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  INTERFACECTL_ENV_VARS,
  findSiblingInterfacectlRepoRoot,
  inspectResolvedTool,
  resolveCliTool,
  resolveGenerationGuardTool,
} from "./lib/interfacectl-tooling.mjs";

function usage() {
  console.error(`Usage:
  node scripts/interfacectl-tool.mjs path <cli|guard>
  node scripts/interfacectl-tool.mjs inspect [cli|guard|all]
  node scripts/interfacectl-tool.mjs run <cli|guard> [--] <args...>
  node scripts/interfacectl-tool.mjs build`);
}

function resolveTool(kind) {
  if (kind === "guard") {
    return resolveGenerationGuardTool();
  }
  if (kind === "cli") {
    return resolveCliTool();
  }

  throw new Error(`Unknown tool kind "${kind}". Expected cli or guard.`);
}

function printInspection(kind) {
  if (kind === "all") {
    console.log(
      JSON.stringify(
        {
          cli: inspectResolvedTool("cli"),
          guard: inspectResolvedTool("guard"),
        },
        null,
        2,
      ),
    );
    return;
  }

  const details = inspectResolvedTool(kind);
  console.log(`Tool: ${details.kind}`);
  console.log(`Source: ${details.source}`);
  console.log(`Path: ${details.path}`);
  if (details.version) {
    console.log(`Version: ${details.version}`);
  }
  if (details.repoRoot) {
    console.log(`Repo Root: ${details.repoRoot}`);
  }
  if (details.gitSha) {
    console.log(`Git SHA: ${details.gitSha}`);
  }
}

function runResolvedTool(kind, args) {
  const tool = resolveTool(kind);
  const normalizedArgs = args.filter((arg) => arg !== "--");

  const result = spawnSync(process.execPath, [tool.path, ...normalizedArgs], {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  process.exit(result.status ?? 1);
}

function buildLocalCli() {
  let repoRoot;
  let source;

  if (process.env[INTERFACECTL_ENV_VARS.root]) {
    repoRoot = path.resolve(process.env[INTERFACECTL_ENV_VARS.root]);
    source = "explicit-root";
  } else {
    const siblingRepoRoot = findSiblingInterfacectlRepoRoot({ cwd: process.cwd() });
    if (siblingRepoRoot) {
      repoRoot = siblingRepoRoot;
      source = "sibling-checkout";
    }
  }

  if (!repoRoot) {
    try {
      const cli = resolveCliTool();
      if (
        cli.source === "explicit-root" ||
        cli.source === "sibling-checkout"
      ) {
        repoRoot =
          cli.repoRoot ??
          (cli.packageRoot ? path.resolve(cli.packageRoot, "..", "..") : undefined);
        source = cli.source;
      } else {
        console.log(
          `[interfacectl] CLI source is ${cli.source}; no local build performed.`,
        );
        return;
      }
    } catch {}
  }

  if (!repoRoot) {
    console.log("[interfacectl] No local interfacectl checkout resolved; no local build performed.");
    return;
  }

  console.log(`[interfacectl] Building from ${repoRoot} (${source})`);

  for (const args of [
    ["install", "--frozen-lockfile"],
    ["run", "build"],
  ]) {
    const result = spawnSync("pnpm", args, {
      cwd: repoRoot,
      env: process.env,
      stdio: "inherit",
    });

    if (result.error) {
      throw result.error;
    }
    if (result.status !== 0) {
      process.exit(result.status ?? 1);
    }
  }
}

function main() {
  const [command, kindOrMaybeAll, ...rest] = process.argv.slice(2);

  if (!command) {
    usage();
    process.exit(1);
  }

  try {
    switch (command) {
      case "path":
        console.log(resolveTool(kindOrMaybeAll ?? "cli").path);
        return;
      case "inspect":
        printInspection(kindOrMaybeAll ?? "all");
        return;
      case "run":
        runResolvedTool(kindOrMaybeAll ?? "cli", rest);
        return;
      case "build":
        buildLocalCli();
        return;
      default:
        usage();
        process.exit(1);
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
