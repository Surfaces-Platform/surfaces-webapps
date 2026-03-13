import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

import { findSiblingInterfacectlRepoRoot } from "../lib/interfacectl-tooling.mjs";

const repoRoot = path.resolve(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "../.."),
);
const workspaceRoot = path.resolve(repoRoot, "..", "..");
const checkerModulePath = path.join(repoRoot, "scripts", "check-elevated-cards.mjs");
const validateContractScriptPath = path.join(repoRoot, "scripts", "validate-contract.sh");
const sharedInterfacectlRoot = [
  findSiblingInterfacectlRepoRoot({ cwd: repoRoot }),
  path.join(workspaceRoot, ".worktrees", "interfacectl-main"),
  path.join(workspaceRoot, "interfacectl"),
].find((candidate) => typeof candidate === "string" && fs.existsSync(candidate));
const sharedSchemaPath = path.join(
  sharedInterfacectlRoot,
  "packages",
  "interfacectl-validator",
  "src",
  "schema",
  "web.surface.contract.schema.json",
);

async function importChecker() {
  return import(pathToFileURL(checkerModulePath).href);
}

async function makeWorkspace({ pageSource = "", cssSource = "" }) {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), "surfaces-style-policy-"));
  await fsp.mkdir(path.join(dir, "apps", "demo-web", "app"), { recursive: true });
  await fsp.mkdir(path.join(dir, "contracts"), { recursive: true });

  const contract = {
    contractId: "demo.contract",
    version: "1.0.0",
    sections: [
      {
        id: "landing.hero",
        intent: "hero",
        description: "hero",
      },
    ],
    constraints: {
      motion: {
        allowedDurationsMs: [120],
        allowedTimingFunctions: ["linear"],
      },
    },
    color: {
      policy: "off",
      allowedValues: [],
    },
    surfaces: [
      {
        id: "demo-web",
        displayName: "Demo",
        type: "web",
        requiredSections: ["landing.hero"],
        allowedFonts: ["Inter"],
        layout: {
          maxContentWidth: 1120,
          chromePolicy: {
            policy: "strict",
            targets: ["page-container", "top-level-section", "layout-container"],
            maxBorderRadiusPx: 8,
            allowOuterShadow: false,
            allowInsetShadow: true,
          },
        },
      },
    ],
  };

  await fsp.writeFile(
    path.join(dir, "contracts", "surfaces.web.contract.json"),
    `${JSON.stringify(contract, null, 2)}\n`,
  );
  await fsp.writeFile(
    path.join(dir, "interfacectl.config.json"),
    `${JSON.stringify({ surfaceRoots: { "demo-web": "apps/demo-web" } }, null, 2)}\n`,
  );
  await fsp.writeFile(path.join(dir, "apps", "demo-web", "app", "page.tsx"), pageSource);
  await fsp.writeFile(path.join(dir, "apps", "demo-web", "app", "globals.css"), cssSource);

  return dir;
}

test("passes restrained cards, inset shadow, and ignores nested control styling", async () => {
  const { checkElevatedCards } = await importChecker();
  const workspaceRoot = await makeWorkspace({
    pageSource: `
      export default function Page() {
        return (
          <main data-contract="page-container" className="rounded-[6px] shadow-inner">
            <section data-contract-section="landing.hero" style={{ borderRadius: "6px", border: "1px solid #dbe4f0" }}>
              <button className="rounded-[12px] shadow-lg">Nested control</button>
            </section>
          </main>
        );
      }
    `,
  });

  const result = await checkElevatedCards({
    workspaceRoot,
    contractPath: "contracts/surfaces.web.contract.json",
    configPath: "interfacectl.config.json",
  });

  assert.equal(result.ok, true, JSON.stringify(result.violations, null, 2));
});

test("fails when inspected wrapper exceeds radius cap", async () => {
  const { checkElevatedCards } = await importChecker();
  const workspaceRoot = await makeWorkspace({
    pageSource: `
      export default function Page() {
        return (
          <section data-contract-section="landing.hero" className="rounded-[12px]">
            Hero
          </section>
        );
      }
    `,
  });

  const result = await checkElevatedCards({
    workspaceRoot,
    contractPath: "contracts/surfaces.web.contract.json",
    configPath: "interfacectl.config.json",
  });

  assert.equal(result.ok, false);
  assert.ok(
    result.violations.some((violation) => violation.code === "layout.chrome.radius-exceeded"),
    JSON.stringify(result.violations, null, 2),
  );
});

test("fails when inspected wrapper uses outer shadow from CSS class", async () => {
  const { checkElevatedCards } = await importChecker();
  const workspaceRoot = await makeWorkspace({
    pageSource: `
      export default function Page() {
        return (
          <main data-contract="page-container" className="panel">
            <section data-contract-section="landing.hero">Hero</section>
          </main>
        );
      }
    `,
    cssSource: `
      .panel {
        box-shadow: 0 12px 48px rgba(15, 23, 42, 0.15);
      }
    `,
  });

  const result = await checkElevatedCards({
    workspaceRoot,
    contractPath: "contracts/surfaces.web.contract.json",
    configPath: "interfacectl.config.json",
  });

  assert.equal(result.ok, false);
  assert.ok(
    result.violations.some((violation) => violation.code === "layout.chrome.outer-shadow-disallowed"),
    JSON.stringify(result.violations, null, 2),
  );
});

test("fails when direct child layout wrapper under landing hero uses outer shadow", async () => {
  const { checkElevatedCards } = await importChecker();
  const workspaceRoot = await makeWorkspace({
    pageSource: `
      export default function Page() {
        return (
          <section data-contract-section="landing.hero">
            <div className="hero-shell">Hero</div>
          </section>
        );
      }
    `,
    cssSource: `
      .hero-shell {
        box-shadow: 0 12px 48px rgba(15, 23, 42, 0.15);
      }
    `,
  });

  const result = await checkElevatedCards({
    workspaceRoot,
    contractPath: "contracts/surfaces.web.contract.json",
    configPath: "interfacectl.config.json",
  });

  assert.equal(result.ok, false);
  assert.ok(
    result.violations.some(
      (violation) =>
        violation.code === "layout.chrome.outer-shadow-disallowed" &&
        violation.targetType === "layout-wrapper-inferred" &&
        violation.inferred === true &&
        violation.parentTargetType === "top-level-section",
    ),
    JSON.stringify(result.violations, null, 2),
  );
});

test("fails when direct child layout wrapper under page container exceeds radius cap", async () => {
  const { checkElevatedCards } = await importChecker();
  const workspaceRoot = await makeWorkspace({
    pageSource: `
      export default function Page() {
        return (
          <main data-contract="page-container">
            <div style={{ borderRadius: "12px" }}>
              <section data-contract-section="landing.hero">Hero</section>
            </div>
          </main>
        );
      }
    `,
  });

  const result = await checkElevatedCards({
    workspaceRoot,
    contractPath: "contracts/surfaces.web.contract.json",
    configPath: "interfacectl.config.json",
  });

  assert.equal(result.ok, false);
  assert.ok(
    result.violations.some(
      (violation) =>
        violation.code === "layout.chrome.radius-exceeded" &&
        violation.targetType === "layout-wrapper-inferred" &&
        violation.inferred === true &&
        violation.parentTargetType === "page-container",
    ),
    JSON.stringify(result.violations, null, 2),
  );
});

test("passes when inferred wrapper contains nested rounded and shadowed controls", async () => {
  const { checkElevatedCards } = await importChecker();
  const workspaceRoot = await makeWorkspace({
    pageSource: `
      export default function Page() {
        return (
          <section data-contract-section="landing.hero">
            <div className="hero-shell">
              <button className="rounded-[12px] shadow-lg">Nested control</button>
            </div>
          </section>
        );
      }
    `,
    cssSource: `
      .hero-shell {
        border-radius: 6px;
        box-shadow: inset 0 1px 0 rgba(15, 23, 42, 0.15);
      }
    `,
  });

  const result = await checkElevatedCards({
    workspaceRoot,
    contractPath: "contracts/surfaces.web.contract.json",
    configPath: "interfacectl.config.json",
  });

  assert.equal(result.ok, true, JSON.stringify(result.violations, null, 2));
});

test("passes when inferred wrapper opts out with chrome ignore marker", async () => {
  const { checkElevatedCards } = await importChecker();
  const workspaceRoot = await makeWorkspace({
    pageSource: `
      export default function Page() {
        return (
          <section data-contract-section="landing.hero">
            <div data-contract-chrome-ignore="true" className="hero-shell">Hero</div>
          </section>
        );
      }
    `,
    cssSource: `
      .hero-shell {
        box-shadow: 0 12px 48px rgba(15, 23, 42, 0.15);
        border-radius: 16px;
      }
    `,
  });

  const result = await checkElevatedCards({
    workspaceRoot,
    contractPath: "contracts/surfaces.web.contract.json",
    configPath: "interfacectl.config.json",
  });

  assert.equal(result.ok, true, JSON.stringify(result.violations, null, 2));
});

test("does not duplicate violations for nested inferred wrappers with identical offending chrome", async () => {
  const { checkElevatedCards } = await importChecker();
  const workspaceRoot = await makeWorkspace({
    pageSource: `
      export default function Page() {
        return (
          <section data-contract-section="landing.hero">
            <div className="hero-shell">
              <div className="hero-shell">Hero</div>
            </div>
          </section>
        );
      }
    `,
    cssSource: `
      .hero-shell {
        box-shadow: 0 12px 48px rgba(15, 23, 42, 0.15);
      }
    `,
  });

  const result = await checkElevatedCards({
    workspaceRoot,
    contractPath: "contracts/surfaces.web.contract.json",
    configPath: "interfacectl.config.json",
  });

  assert.equal(result.ok, false);
  const shadowViolations = result.violations.filter(
    (violation) =>
      violation.code === "layout.chrome.outer-shadow-disallowed" &&
      violation.targetType === "layout-wrapper-inferred",
  );
  assert.equal(shadowViolations.length, 1, JSON.stringify(result.violations, null, 2));
});

test("shared validate remains unchanged and monorepo scripts add the repo-local gate", async () => {
  const sandboxRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "surfaces-validate-style-"));
  await fsp.mkdir(
    path.join(sandboxRoot, "tools", "interfacectl", "packages", "interfacectl-cli", "dist"),
    { recursive: true },
  );
  await fsp.mkdir(path.join(sandboxRoot, "apps", "demo-web", "app"), { recursive: true });
  await fsp.mkdir(path.join(sandboxRoot, "contracts"), { recursive: true });

  await fsp.writeFile(
    path.join(sandboxRoot, "tools", "interfacectl", "packages", "interfacectl-cli", "dist", "index.js"),
    `#!/usr/bin/env node
console.log(JSON.stringify({ ok: true, findings: [] }));
process.exit(0);
`,
  );
  fs.chmodSync(
    path.join(sandboxRoot, "tools", "interfacectl", "packages", "interfacectl-cli", "dist", "index.js"),
    0o755,
  );

  await fsp.writeFile(
    path.join(sandboxRoot, "contracts", "surfaces.web.contract.json"),
    `${JSON.stringify(
      {
        contractId: "demo.contract",
        version: "1.0.0",
        sections: [{ id: "landing.hero", intent: "hero", description: "hero" }],
        constraints: {
          motion: {
            allowedDurationsMs: [120],
            allowedTimingFunctions: ["linear"],
          },
        },
        color: {
          policy: "off",
          allowedValues: [],
        },
        surfaces: [
          {
            id: "demo-web",
            displayName: "Demo",
            type: "web",
            requiredSections: ["landing.hero"],
            allowedFonts: ["Inter"],
            layout: {
              maxContentWidth: 1120,
              chromePolicy: {
                policy: "strict",
                targets: ["top-level-section"],
                maxBorderRadiusPx: 8,
                allowOuterShadow: false,
                allowInsetShadow: true,
              },
            },
          },
        ],
      },
      null,
      2,
    )}\n`,
  );
  await fsp.writeFile(
    path.join(sandboxRoot, "interfacectl.config.json"),
    `${JSON.stringify({ surfaceRoots: { "demo-web": "apps/demo-web" } }, null, 2)}\n`,
  );
  await fsp.writeFile(
    path.join(sandboxRoot, "apps", "demo-web", "app", "page.tsx"),
    `
      export default function Page() {
        return <section data-contract-section="landing.hero" style={{ borderRadius: "12px" }}>Hero</section>;
      }
    `,
  );
  await fsp.writeFile(path.join(sandboxRoot, "apps", "demo-web", "app", "globals.css"), "");

  const directValidate = spawnSync(
    "node",
    [path.join(sandboxRoot, "tools", "interfacectl", "packages", "interfacectl-cli", "dist", "index.js"), "validate"],
    {
      cwd: sandboxRoot,
      encoding: "utf8",
    },
  );
  assert.equal(directValidate.status, 0, directValidate.stderr || directValidate.stdout);

  const directChecker = spawnSync(
    "node",
    [
      checkerModulePath,
      "--workspace-root",
      sandboxRoot,
      "--contract",
      "./contracts/surfaces.web.contract.json",
      "--config",
      "./interfacectl.config.json",
      "--format",
      "json",
    ],
    {
      cwd: sandboxRoot,
      encoding: "utf8",
    },
  );
  assert.equal(directChecker.status, 2, directChecker.stderr || directChecker.stdout);
  assert.match(
    directChecker.stdout,
    /layout\.chrome\.radius-exceeded/,
    directChecker.stderr || directChecker.stdout,
  );

  const packageJson = JSON.parse(await fsp.readFile(path.join(repoRoot, "package.json"), "utf8"));
  assert.match(
    packageJson.scripts["validate:local"],
    /validate:repo-style/,
    packageJson.scripts["validate:local"],
  );
  assert.match(
    packageJson.scripts["validate:ci"],
    /validate:repo-style/,
    packageJson.scripts["validate:ci"],
  );
  const validateContractShell = await fsp.readFile(validateContractScriptPath, "utf8");
  assert.match(validateContractShell, /check-elevated-cards\.mjs/, validateContractShell);
});

test("shared interfacectl schema stays unchanged by repo-local style policy", async () => {
  const schema = JSON.parse(await fsp.readFile(sharedSchemaPath, "utf8"));
  const layoutProperties = schema?.$defs?.surface?.properties?.layout?.properties ?? {};
  assert.equal("chromePolicy" in layoutProperties, true);
});
