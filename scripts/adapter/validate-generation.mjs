#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  AdapterInputError,
  runGenerationAdapter,
} from "./generation-adapter-core.mjs";

function usage() {
  return [
    "Usage:",
    "  node scripts/adapter/validate-generation.mjs --tool <codex|cursor|lovable|figma-make> --surface <surface-id> --mode <workspace|descriptor> [options]",
    "",
    "Options:",
    "  --workspace-root <path>    Required when mode=workspace",
    "  --descriptor-path <path>   Required when mode=descriptor",
    "  --contract <path>          Optional contract override",
    "  --out <path>               Optional output JSON file",
    "  --request-id <id>          Optional request identifier",
  ].join("\n");
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (key === "--help" || key === "-h") {
      args.help = true;
      continue;
    }

    const value = argv[i + 1];
    if (!value || value.startsWith("--")) {
      throw new AdapterInputError(`Missing value for ${key}.`);
    }

    switch (key) {
      case "--tool":
        args.tool = value;
        i += 1;
        break;
      case "--surface":
        args.surfaceId = value;
        i += 1;
        break;
      case "--mode":
        args.mode = value;
        i += 1;
        break;
      case "--workspace-root":
        args.workspaceRoot = value;
        i += 1;
        break;
      case "--descriptor-path":
        args.descriptorPath = value;
        i += 1;
        break;
      case "--contract":
        args.contractPath = value;
        i += 1;
        break;
      case "--out":
        args.outPath = value;
        i += 1;
        break;
      case "--request-id":
        args.requestId = value;
        i += 1;
        break;
      default:
        throw new AdapterInputError(`Unknown argument: ${key}.`);
    }
  }
  return args;
}

function readDescriptor(descriptorPath) {
  const resolvedPath = path.resolve(descriptorPath);
  if (!fs.existsSync(resolvedPath)) {
    throw new AdapterInputError(`Descriptor file not found: ${resolvedPath}.`);
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(resolvedPath, "utf8"));
    if (!Array.isArray(parsed)) {
      throw new AdapterInputError(
        `Descriptor file must contain a JSON array: ${resolvedPath}.`,
      );
    }
    return parsed;
  } catch (error) {
    if (error instanceof AdapterInputError) {
      throw error;
    }
    throw new AdapterInputError(
      `Failed to read descriptor JSON at ${resolvedPath}: ${error.message}`,
    );
  }
}

async function main() {
  let parsed;
  try {
    parsed = parseArgs(process.argv.slice(2));
  } catch (error) {
    if (error instanceof AdapterInputError) {
      process.stderr.write(`${error.message}\n\n${usage()}\n`);
      process.exit(10);
    }
    throw error;
  }

  if (parsed.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }

  const request = {
    requestId: parsed.requestId ?? crypto.randomUUID(),
    tool: parsed.tool,
    surfaceId: parsed.surfaceId,
    mode: parsed.mode,
    contractPath: parsed.contractPath,
    provenance: {
      timestamp: new Date().toISOString(),
      sessionId: process.env.SURFACES_ADAPTER_SESSION_ID,
      userId: process.env.SURFACES_ADAPTER_USER_ID,
    },
  };

  if (parsed.mode === "workspace") {
    request.workspaceRoot =
      typeof parsed.workspaceRoot === "string"
        ? path.resolve(parsed.workspaceRoot)
        : undefined;
  } else if (parsed.mode === "descriptor") {
    if (!parsed.descriptorPath) {
      process.stderr.write(
        `--descriptor-path is required when --mode descriptor.\n\n${usage()}\n`,
      );
      process.exit(10);
      return;
    }
    request.descriptor = readDescriptor(parsed.descriptorPath);
  }

  if (parsed.mode === "workspace" && !parsed.workspaceRoot) {
    process.stderr.write(
      `--workspace-root is required when --mode workspace.\n\n${usage()}\n`,
    );
    process.exit(10);
    return;
  }

  try {
    const response = await runGenerationAdapter(request);
    const serialized = `${JSON.stringify(response, null, 2)}\n`;

    if (parsed.outPath) {
      const outPath = path.resolve(parsed.outPath);
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, serialized);
    }

    process.stdout.write(serialized);

    if (response.status === "block") {
      process.exit(30);
      return;
    }

    process.exit(0);
  } catch (error) {
    if (error instanceof AdapterInputError) {
      process.stderr.write(
        `${JSON.stringify(
          {
            requestId: request.requestId,
            status: "block",
            error: error.message,
            code: error.code,
          },
          null,
          2,
        )}\n`,
      );
      process.exit(10);
      return;
    }

    process.stderr.write(
      `${JSON.stringify(
        {
          requestId: request.requestId,
          status: "block",
          error: error instanceof Error ? error.message : String(error),
          code: "adapter.internal",
        },
        null,
        2,
      )}\n`,
    );
    process.exit(1);
  }
}

main();
