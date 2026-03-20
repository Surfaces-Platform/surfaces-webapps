import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const desktopRoot = path.resolve(__dirname, "..");

function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (!current?.startsWith("--")) {
      continue;
    }

    const key = current.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Expected a value after ${current}.`);
    }

    args[key] = value;
    index += 1;
  }

  return args;
}

function runOrThrow(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? desktopRoot,
    stdio: options.stdio ?? "inherit",
    env: {
      ...process.env,
      ...options.env,
    },
  });

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with status ${result.status ?? "unknown"}.`);
  }
}

function buildElectronBuilderArgs(publish = "never") {
  return [
    "exec",
    "electron-builder",
    "--config",
    "electron-builder.config.cjs",
    "--mac",
    "dmg",
    "zip",
    "--arm64",
    "--publish",
    publish,
  ];
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const publish = args.publish?.trim() || "never";
  runOrThrow("pnpm", buildElectronBuilderArgs(publish));
}

main();
