#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../..");
const defaultProjectMapPath = path.join(repoRoot, "scripts", "vercel", "project-map.json");

const usage = `Usage:
  node scripts/vercel/safe-cli.mjs check [--app <name>] [--map <path>]
  node scripts/vercel/safe-cli.mjs audit [--map <path>]
  node scripts/vercel/safe-cli.mjs link --app <name> [--map <path>]
  node scripts/vercel/safe-cli.mjs env-pull --app <name> [--environment <name>] [--file <filename>] [--git-branch <name>] [--map <path>]
  node scripts/vercel/safe-cli.mjs integration-list --app <name> [--integration <name>] [--map <path>]
  node scripts/vercel/safe-cli.mjs integration-add --app <name> --name <integration> [--map <path>]

Examples:
  pnpm vercel:project:check
  pnpm vercel:project:audit
  pnpm vercel:project:link -- --app surfaceops-web
  pnpm vercel:env:pull -- --app surfaceops-web --environment preview
  pnpm vercel:integration:add -- --app surfaceops-web --name neon
`;

function fail(message, code = 1) {
  process.stderr.write(`${message}\n`);
  process.exit(code);
}

function parseArgs(argv) {
  const options = {};
  const positionals = [];

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];

    if (token === "--") {
      // pnpm forwards a standalone -- before script args; ignore it.
      continue;
    }

    if (!token.startsWith("--")) {
      positionals.push(token);
      continue;
    }

    const eqIndex = token.indexOf("=");
    if (eqIndex > 2) {
      options[token.slice(2, eqIndex)] = token.slice(eqIndex + 1);
      continue;
    }

    const key = token.slice(2);
    const nextToken = argv[i + 1];
    if (nextToken && !nextToken.startsWith("--")) {
      options[key] = nextToken;
      i += 1;
    } else {
      options[key] = true;
    }
  }

  return { options, positionals };
}

function csvList(value) {
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function loadProjectMap(mapPathOption) {
  const mapPath = path.resolve(repoRoot, mapPathOption ?? defaultProjectMapPath);
  if (!fs.existsSync(mapPath)) {
    fail(`Project map not found: ${mapPath}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(mapPath, "utf8"));
  } catch (error) {
    fail(`Failed to parse project map (${mapPath}): ${error.message}`);
  }

  if (!parsed.scopeSlug || !parsed.orgId || !parsed.apps || typeof parsed.apps !== "object") {
    fail(`Invalid project map shape: ${mapPath}`);
  }

  if (parsed.allowedExternalProjects && !Array.isArray(parsed.allowedExternalProjects)) {
    fail(`Invalid project map shape: "allowedExternalProjects" must be an array in ${mapPath}`);
  }

  return { mapPath, map: parsed };
}

function getAppEntry(map, appName) {
  const entry = map.apps[appName];
  if (!entry) {
    const known = Object.keys(map.apps).sort().join(", ");
    fail(`Unknown app "${appName}". Known apps: ${known}`);
  }
  return entry;
}

function listTargetApps(map, appOption) {
  if (!appOption) {
    return Object.keys(map.apps).sort();
  }
  return csvList(appOption).map((appName) => {
    getAppEntry(map, appName);
    return appName;
  });
}

function appDirectory(entry) {
  return path.resolve(repoRoot, entry.path);
}

function projectJsonPath(entry) {
  return path.join(appDirectory(entry), ".vercel", "project.json");
}

function validateLinkedProject(map, appName) {
  const entry = getAppEntry(map, appName);
  const linkPath = projectJsonPath(entry);
  const requiredLocalLink = entry.requiredLocalLink !== false;

  if (!fs.existsSync(linkPath)) {
    if (!requiredLocalLink) {
      return {
        ok: true,
        skipped: true,
        appName,
        entry,
        linkPath,
      };
    }
    return {
      ok: false,
      appName,
      entry,
      linkPath,
      message: `missing ${linkPath}`,
    };
  }

  let linked;
  try {
    linked = JSON.parse(fs.readFileSync(linkPath, "utf8"));
  } catch (error) {
    return {
      ok: false,
      appName,
      entry,
      linkPath,
      message: `invalid JSON in ${linkPath}: ${error.message}`,
    };
  }

  const expected = {
    projectId: entry.projectId,
    projectName: entry.projectName,
    orgId: map.orgId,
  };

  const mismatches = [];
  for (const [field, expectedValue] of Object.entries(expected)) {
    if (!expectedValue) {
      continue;
    }
    const actualValue = linked[field];
    if (actualValue !== expectedValue) {
      mismatches.push(`${field} expected "${expectedValue}" got "${actualValue ?? "<missing>"}"`);
    }
  }

  if (mismatches.length > 0) {
    return {
      ok: false,
      appName,
      entry,
      linkPath,
      message: `${linkPath}: ${mismatches.join(", ")}`,
    };
  }

  return {
    ok: true,
    skipped: false,
    appName,
    entry,
    linkPath,
    linked,
  };
}

function runVercel(args, options = {}) {
  const result = spawnSync("vercel", args, {
    cwd: options.cwd ?? repoRoot,
    env: process.env,
    encoding: "utf8",
    stdio: options.capture ? "pipe" : "inherit",
  });

  if (options.capture) {
    return result;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
  return result;
}

function requireOption(options, key, commandName) {
  const value = options[key];
  if (!value || value === true) {
    fail(`Missing required --${key} for "${commandName}"`);
  }
  return String(value);
}

function verifyRemoteProject(map, entry) {
  const inspect = runVercel(
    ["project", "inspect", entry.projectName, "--scope", map.scopeSlug],
    { capture: true }
  );
  const output = `${inspect.stdout ?? ""}${inspect.stderr ?? ""}`;
  if (inspect.status !== 0) {
    fail(
      `Failed remote project check for ${entry.projectName} in scope ${map.scopeSlug}.\n${output.trim()}`
    );
  }
  if (!output.includes(entry.projectId)) {
    fail(
      `Remote safety check failed for ${entry.projectName}: expected ID ${entry.projectId} was not found in vercel project inspect output.`
    );
  }
}

function defaultEnvFile(environment) {
  if (environment === "development") {
    return ".env.local";
  }
  if (environment === "preview") {
    return ".env.preview.local";
  }
  if (environment === "production") {
    return ".env.production.local";
  }
  return `.env.${environment}.local`;
}

function parseJsonFromVercelOutput(output) {
  const start = output.indexOf("{");
  if (start < 0) {
    throw new Error("No JSON object found in Vercel CLI output.");
  }

  let depth = 0;
  let inString = false;
  let escaping = false;
  let end = -1;

  for (let i = start; i < output.length; i += 1) {
    const char = output[i];

    if (escaping) {
      escaping = false;
      continue;
    }

    if (char === "\\") {
      escaping = true;
      continue;
    }

    if (char === "\"") {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === "{") {
      depth += 1;
      continue;
    }

    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }

  if (end < 0) {
    throw new Error("Unable to find complete JSON object in Vercel CLI output.");
  }

  const jsonText = output.slice(start, end + 1);
  return JSON.parse(jsonText);
}

function commandAudit(map) {
  const result = runVercel(
    ["project", "ls", "--scope", map.scopeSlug, "--json"],
    { capture: true }
  );
  const rawOutput = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  if (result.status !== 0) {
    fail(`Failed to list projects in scope ${map.scopeSlug}.\n${rawOutput.trim()}`);
  }

  let payload;
  try {
    payload = parseJsonFromVercelOutput(rawOutput);
  } catch (error) {
    fail(`Failed to parse Vercel project list JSON: ${error.message}`);
  }

  const remoteProjects = Array.isArray(payload.projects) ? payload.projects : [];
  const remoteByName = new Map(remoteProjects.map((project) => [project.name, project]));

  const managedEntries = Object.entries(map.apps).map(([appName, entry]) => ({
    appName,
    projectName: entry.projectName,
    projectId: entry.projectId,
  }));
  const managedNames = new Set(managedEntries.map((entry) => entry.projectName));
  const allowedExternal = new Set((map.allowedExternalProjects ?? []).map(String));
  const allowedNames = new Set([...managedNames, ...allowedExternal]);

  const missingManaged = managedEntries.filter((entry) => !remoteByName.has(entry.projectName));
  const managedIdMismatches = managedEntries
    .map((entry) => {
      const remote = remoteByName.get(entry.projectName);
      if (!remote || !entry.projectId) {
        return null;
      }
      if (remote.id !== entry.projectId) {
        return {
          projectName: entry.projectName,
          expectedProjectId: entry.projectId,
          actualProjectId: remote.id,
        };
      }
      return null;
    })
    .filter(Boolean);

  const unknownProjects = remoteProjects
    .map((project) => project.name)
    .filter((projectName) => !allowedNames.has(projectName))
    .sort((a, b) => a.localeCompare(b));

  process.stdout.write(`Audit scope: ${map.scopeSlug}\n`);
  process.stdout.write(
    `Managed projects (${managedEntries.length}): ${managedEntries.map((entry) => entry.projectName).sort((a, b) => a.localeCompare(b)).join(", ")}\n`
  );
  process.stdout.write(
    `Allowed external projects (${allowedExternal.size}): ${[...allowedExternal].sort((a, b) => a.localeCompare(b)).join(", ") || "<none>"}\n`
  );
  process.stdout.write(`Remote projects (${remoteProjects.length}) loaded.\n`);

  let failures = 0;
  if (missingManaged.length > 0) {
    failures += missingManaged.length;
    for (const entry of missingManaged) {
      process.stderr.write(
        `ERROR missing managed project: ${entry.projectName} (app: ${entry.appName})\n`
      );
    }
  }

  if (managedIdMismatches.length > 0) {
    failures += managedIdMismatches.length;
    for (const mismatch of managedIdMismatches) {
      process.stderr.write(
        `ERROR managed project ID mismatch: ${mismatch.projectName} expected ${mismatch.expectedProjectId} got ${mismatch.actualProjectId}\n`
      );
    }
  }

  if (unknownProjects.length > 0) {
    failures += unknownProjects.length;
    for (const projectName of unknownProjects) {
      process.stderr.write(`ERROR unknown project in scope ${map.scopeSlug}: ${projectName}\n`);
    }
  }

  if (failures > 0) {
    fail(
      `\nProject audit found ${failures} issue(s). Update scripts/vercel/project-map.json (apps or allowedExternalProjects) or remove unknown projects.`
    );
  }

  process.stdout.write("Project audit passed: no unknown or missing managed projects.\n");
}

function ensureCanonicalLink(map, appName) {
  const state = validateLinkedProject(map, appName);
  if (!state.ok || state.skipped) {
    const message = state.skipped
      ? `${state.linkPath} is not linked locally`
      : state.message;
    fail(
      `Link preflight failed for ${appName}: ${message}\nRun: pnpm vercel:project:link -- --app ${appName}`
    );
  }
  return state;
}

function commandCheck(map, options) {
  const targets = listTargetApps(map, options.app);
  let failures = 0;

  for (const appName of targets) {
    const state = validateLinkedProject(map, appName);
    if (state.ok) {
      if (state.skipped) {
        process.stdout.write(
          `SKIP ${appName} -> local link optional and currently missing\n`
        );
        continue;
      }
      process.stdout.write(
        `OK ${appName} -> ${state.entry.projectName} (${state.entry.projectId})\n`
      );
      continue;
    }
    failures += 1;
    process.stderr.write(`ERROR ${appName}: ${state.message}\n`);
  }

  if (failures > 0) {
    fail(
      `\n${failures} link preflight check(s) failed. Fix with: pnpm vercel:project:link -- --app <app-name>`
    );
  }

  process.stdout.write(`Checked ${targets.length} app link(s).\n`);
}

function commandLink(map, options) {
  const appName = requireOption(options, "app", "link");
  const entry = getAppEntry(map, appName);
  verifyRemoteProject(map, entry);

  runVercel([
    "link",
    "--cwd",
    appDirectory(entry),
    "--project",
    entry.projectName,
    "--scope",
    map.scopeSlug,
    "--yes",
  ]);

  const state = validateLinkedProject(map, appName);
  if (!state.ok) {
    fail(`Link command completed but preflight still fails: ${state.message}`);
  }
  process.stdout.write(
    `Linked ${appName} to ${entry.projectName} (${entry.projectId}) successfully.\n`
  );
}

function commandEnvPull(map, options) {
  const appName = requireOption(options, "app", "env-pull");
  const state = ensureCanonicalLink(map, appName);
  const environment = String(options.environment ?? "development");
  const outputFile = String(options.file ?? defaultEnvFile(environment));

  const args = [
    "env",
    "pull",
    outputFile,
    "--environment",
    environment,
    "--yes",
    "--cwd",
    appDirectory(state.entry),
    "--scope",
    map.scopeSlug,
  ];

  if (options["git-branch"] && options["git-branch"] !== true) {
    args.push("--git-branch", String(options["git-branch"]));
  }

  runVercel(args);

  const outputPath = path.join(appDirectory(state.entry), outputFile);
  process.stdout.write(
    `Pulled ${environment} env vars for ${appName} into ${outputPath}.\n`
  );
}

function commandIntegrationList(map, options) {
  const appName = requireOption(options, "app", "integration-list");
  const state = ensureCanonicalLink(map, appName);
  const args = [
    "integration",
    "list",
    state.entry.projectName,
    "--scope",
    map.scopeSlug,
  ];

  if (options.integration && options.integration !== true) {
    args.push("--integration", String(options.integration));
  }

  runVercel(args);
}

function commandIntegrationAdd(map, options, positionals) {
  const appName = requireOption(options, "app", "integration-add");
  const integrationName = options.name
    ? String(options.name)
    : positionals[0]
      ? String(positionals[0])
      : null;

  if (!integrationName) {
    fail('Missing integration name. Use --name <integration> (example: --name neon).');
  }

  const entry = getAppEntry(map, appName);
  verifyRemoteProject(map, entry);

  runVercel([
    "integration",
    "add",
    integrationName,
    "--cwd",
    appDirectory(entry),
    "--scope",
    map.scopeSlug,
  ]);

  process.stdout.write(
    `If dashboard prompts appear, connect ${integrationName} to ${entry.projectName} and select Development/Preview/Production.\n`
  );

  runVercel([
    "integration",
    "list",
    entry.projectName,
    "--integration",
    integrationName,
    "--scope",
    map.scopeSlug,
  ]);
}

const [command, ...rest] = process.argv.slice(2);
if (!command || command === "help" || command === "--help" || command === "-h") {
  process.stdout.write(usage);
  process.exit(0);
}

const { options, positionals } = parseArgs(rest);
const { mapPath, map } = loadProjectMap(options.map);

process.stdout.write(
  `Using project map: ${mapPath}\n`
);

switch (command) {
  case "check":
    commandCheck(map, options);
    break;
  case "audit":
    commandAudit(map);
    break;
  case "link":
    commandLink(map, options);
    break;
  case "env-pull":
    commandEnvPull(map, options);
    break;
  case "integration-list":
    commandIntegrationList(map, options);
    break;
  case "integration-add":
    commandIntegrationAdd(map, options, positionals);
    break;
  default:
    fail(`Unknown command "${command}".\n\n${usage}`);
}
