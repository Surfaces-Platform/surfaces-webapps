import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), "../.."));
const safeCliSource = path.join(repoRoot, "scripts", "vercel", "safe-cli.mjs");

function writeExecutable(filePath, content) {
  fs.writeFileSync(filePath, content, "utf8");
  fs.chmodSync(filePath, 0o755);
}

function createSandbox() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "vercel-project-guard-"));
  const scriptsDir = path.join(dir, "scripts", "vercel");
  fs.mkdirSync(scriptsDir, { recursive: true });
  const safeCliPath = path.join(scriptsDir, "safe-cli.mjs");
  fs.copyFileSync(safeCliSource, safeCliPath);
  fs.chmodSync(safeCliPath, 0o755);

  const projectMap = {
    scopeSlug: "surfaces-platform",
    orgId: "team_test123",
    allowedExternalProjects: ["design-judgment-kit"],
    apps: {
      "surfaceops-web": {
        path: "apps/surfaceops-web",
        projectName: "surfaceops.ai",
        projectId: "prj_surfaceops",
      },
      "interfacectl-web": {
        path: "apps/interfacectl-web",
        projectName: "interfacectl.com",
        projectId: "prj_interfacectl",
      },
    },
  };
  const remoteProjects = [
    { name: "surfaceops.ai", id: "prj_surfaceops" },
    { name: "interfacectl.com", id: "prj_interfacectl" },
    { name: "design-judgment-kit", id: "prj_design_kit" },
  ];

  fs.writeFileSync(path.join(scriptsDir, "project-map.json"), JSON.stringify(projectMap, null, 2));

  for (const [appName, appConfig] of Object.entries(projectMap.apps)) {
    const appDir = path.join(dir, appConfig.path);
    fs.mkdirSync(path.join(appDir, ".vercel"), { recursive: true });
    fs.writeFileSync(
      path.join(appDir, ".vercel", "project.json"),
      JSON.stringify(
        {
          projectId: appConfig.projectId,
          orgId: projectMap.orgId,
          projectName: appConfig.projectName,
        },
        null,
        2
      )
    );
    assert.ok(fs.existsSync(path.join(dir, "apps", appName)));
  }

  const binDir = path.join(dir, "bin");
  fs.mkdirSync(binDir, { recursive: true });
  const logPath = path.join(dir, "mock-vercel.log");
  const mockVercelPath = path.join(binDir, "vercel");

  writeExecutable(
    mockVercelPath,
    `#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
const map = JSON.parse(process.env.MOCK_VERCEL_MAP_JSON || "{}");
const appEntries = Object.values(map.apps || {});
const remoteProjects = JSON.parse(process.env.MOCK_VERCEL_REMOTE_PROJECTS || "[]");
const logPath = process.env.MOCK_VERCEL_LOG;

if (logPath) {
  fs.appendFileSync(logPath, args.join(" ") + "\\n");
}

function findArg(flag) {
  const idx = args.indexOf(flag);
  return idx >= 0 ? args[idx + 1] : undefined;
}

if (args[0] === "project" && args[1] === "inspect") {
  const projectName = args[2];
  const match =
    remoteProjects.find((project) => project.name === projectName) ??
    appEntries.find((entry) => entry.projectName === projectName);
  if (!match) {
    console.error("Project not found");
    process.exit(1);
  }
  console.log("ID\\t\\t\\t" + (match.projectId || match.id));
  process.exit(0);
}

if (args[0] === "project" && args[1] === "ls" && args.includes("--json")) {
  console.log("Vercel CLI 50.1.6");
  console.log("Fetching projects in surfaces-platform");
  console.log(
    JSON.stringify(
      {
        projects: remoteProjects.map((project) => ({
          name: project.name,
          id: project.id,
        })),
      },
      null,
      2
    )
  );
  process.exit(0);
}

if (args[0] === "link") {
  const cwd = findArg("--cwd");
  const projectName = findArg("--project");
  const match = appEntries.find((entry) => entry.projectName === projectName);
  if (!cwd || !match) {
    process.exit(1);
  }
  const targetDir = path.join(cwd, ".vercel");
  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(
    path.join(targetDir, "project.json"),
    JSON.stringify(
      {
        projectId: match.projectId,
        orgId: map.orgId,
        projectName: match.projectName
      },
      null,
      2
    )
  );
  process.exit(0);
}

if (args[0] === "env" && args[1] === "pull") {
  const outputFile = args[2];
  const cwd = findArg("--cwd");
  const environment = findArg("--environment") || "development";
  const projectName = appEntries.find((entry) => cwd && cwd.endsWith(entry.path.replace(/\\\\/g, "/")))?.projectName;
  const targetPath = path.join(cwd, outputFile);
  fs.writeFileSync(targetPath, "# pulled " + environment + " for " + (projectName || "unknown") + "\\n");
  process.exit(0);
}

if (args[0] === "integration" && args[1] === "list") {
  console.log("integration resources listed");
  process.exit(0);
}

if (args[0] === "integration" && args[1] === "add") {
  console.log("integration installed");
  process.exit(0);
}

process.exit(0);
`
  );

  return {
    dir,
    safeCliPath,
    projectMap,
    remoteProjects,
    binDir,
    logPath,
  };
}

function runSafeCli(sandbox, args) {
  return spawnSync("node", [sandbox.safeCliPath, ...args], {
    cwd: sandbox.dir,
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${sandbox.binDir}:${process.env.PATH}`,
      MOCK_VERCEL_MAP_JSON: JSON.stringify(sandbox.projectMap),
      MOCK_VERCEL_REMOTE_PROJECTS: JSON.stringify(sandbox.remoteProjects),
      MOCK_VERCEL_LOG: sandbox.logPath,
    },
  });
}

test("check passes when local app links match canonical map", () => {
  const sandbox = createSandbox();
  const result = runSafeCli(sandbox, ["check"]);

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /OK surfaceops-web -> surfaceops.ai/);
  assert.match(result.stdout, /OK interfacectl-web -> interfacectl.com/);
  assert.match(result.stdout, /Checked 2 app link\(s\)\./);
});

test("check skips optional app when local link is missing", () => {
  const sandbox = createSandbox();
  sandbox.projectMap.apps["surfaces-dev"] = {
    path: "apps/surfaces-dev",
    projectName: "surfaces.dev",
    projectId: "prj_surfaces_dev",
    requiredLocalLink: false,
  };
  fs.writeFileSync(
    path.join(sandbox.dir, "scripts", "vercel", "project-map.json"),
    JSON.stringify(sandbox.projectMap, null, 2)
  );

  const result = runSafeCli(sandbox, ["check"]);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /SKIP surfaces-dev -> local link optional and currently missing/);
});

test("check fails on local link mismatch", () => {
  const sandbox = createSandbox();
  const linkFile = path.join(
    sandbox.dir,
    "apps",
    "surfaceops-web",
    ".vercel",
    "project.json"
  );
  fs.writeFileSync(
    linkFile,
    JSON.stringify(
      {
        projectId: "prj_wrong",
        orgId: "team_wrong",
        projectName: "surfaceops-web",
      },
      null,
      2
    )
  );

  const result = runSafeCli(sandbox, ["check", "--app", "surfaceops-web"]);
  const output = `${result.stdout}\n${result.stderr}`;

  assert.notEqual(result.status, 0);
  assert.match(output, /projectId expected "prj_surfaceops" got "prj_wrong"/);
  assert.match(output, /projectName expected "surfaceops.ai" got "surfaceops-web"/);
});

test("link command rewrites link file to canonical project mapping", () => {
  const sandbox = createSandbox();
  const appDir = path.join(sandbox.dir, "apps", "surfaceops-web");

  fs.writeFileSync(
    path.join(appDir, ".vercel", "project.json"),
    JSON.stringify(
      {
        projectId: "prj_bad",
        orgId: "team_bad",
        projectName: "bad-project",
      },
      null,
      2
    )
  );

  const result = runSafeCli(sandbox, ["link", "--app", "surfaceops-web"]);
  assert.equal(result.status, 0, result.stderr || result.stdout);

  const linked = JSON.parse(fs.readFileSync(path.join(appDir, ".vercel", "project.json"), "utf8"));
  assert.equal(linked.projectId, "prj_surfaceops");
  assert.equal(linked.projectName, "surfaceops.ai");
  assert.equal(linked.orgId, "team_test123");

  const log = fs.readFileSync(sandbox.logPath, "utf8");
  assert.match(log, /project inspect surfaceops.ai --scope surfaces-platform/);
  assert.match(log, /link --cwd .*apps\/surfaceops-web --project surfaceops.ai --scope surfaces-platform --yes/);
});

test("env-pull uses canonical app target and writes preview env file", () => {
  const sandbox = createSandbox();
  const appDir = path.join(sandbox.dir, "apps", "surfaceops-web");
  const result = runSafeCli(sandbox, [
    "env-pull",
    "--app",
    "surfaceops-web",
    "--environment",
    "preview",
  ]);

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const envFile = path.join(appDir, ".env.preview.local");
  assert.ok(fs.existsSync(envFile));
  assert.match(fs.readFileSync(envFile, "utf8"), /pulled preview for surfaceops.ai/);

  const log = fs.readFileSync(sandbox.logPath, "utf8");
  assert.match(log, /env pull \.env\.preview\.local --environment preview --yes --cwd .*apps\/surfaceops-web --scope surfaces-platform/);
});

test("integration-list targets canonical project name", () => {
  const sandbox = createSandbox();
  const result = runSafeCli(sandbox, [
    "integration-list",
    "--app",
    "surfaceops-web",
    "--integration",
    "neon",
  ]);

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const log = fs.readFileSync(sandbox.logPath, "utf8");
  assert.match(log, /integration list surfaceops.ai --scope surfaces-platform --integration neon/);
});

test("parser tolerates standalone -- token from pnpm", () => {
  const sandbox = createSandbox();
  const result = runSafeCli(sandbox, [
    "integration-list",
    "--",
    "--app",
    "surfaceops-web",
    "--integration",
    "neon",
  ]);

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const log = fs.readFileSync(sandbox.logPath, "utf8");
  assert.match(log, /integration list surfaceops.ai --scope surfaces-platform --integration neon/);
});

test("audit passes when only managed and allowlisted external projects exist", () => {
  const sandbox = createSandbox();
  const result = runSafeCli(sandbox, ["audit"]);
  const output = `${result.stdout}\n${result.stderr}`;

  assert.equal(result.status, 0, output);
  assert.match(output, /Allowed external projects \(1\): design-judgment-kit/);
  assert.match(output, /Project audit passed: no unknown or missing managed projects/);
});

test("audit fails on unknown team project", () => {
  const sandbox = createSandbox();
  sandbox.remoteProjects.push({ name: "surfaceops-web", id: "prj_zombie" });
  const result = runSafeCli(sandbox, ["audit"]);
  const output = `${result.stdout}\n${result.stderr}`;

  assert.notEqual(result.status, 0);
  assert.match(output, /ERROR unknown project in scope surfaces-platform: surfaceops-web/);
  assert.match(output, /Project audit found 1 issue/);
});

test("audit fails on managed project id mismatch", () => {
  const sandbox = createSandbox();
  sandbox.remoteProjects = sandbox.remoteProjects.map((project) =>
    project.name === "surfaceops.ai"
      ? { ...project, id: "prj_wrong_surfaceops" }
      : project
  );
  const result = runSafeCli(sandbox, ["audit"]);
  const output = `${result.stdout}\n${result.stderr}`;

  assert.notEqual(result.status, 0);
  assert.match(
    output,
    /ERROR managed project ID mismatch: surfaceops.ai expected prj_surfaceops got prj_wrong_surfaceops/
  );
});
