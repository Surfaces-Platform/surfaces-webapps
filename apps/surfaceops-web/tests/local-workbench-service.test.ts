import * as childProcess from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockedInterfacectl = vi.hoisted(() => ({
  resolveWorkspaceRoot: vi.fn(),
  runInterfacectlCli: vi.fn(),
}));
const mockedLocalLlm = vi.hoisted(() => ({
  runLocalLlmAgent: vi.fn(),
}));
const mockedChildProcess = vi.hoisted(() => ({
  actualSpawn: null as unknown as typeof import("node:child_process").spawn,
  spawn: vi.fn(),
}));

vi.mock("@/lib/interfacectl", () => ({
  resolveWorkspaceRoot: mockedInterfacectl.resolveWorkspaceRoot,
  runInterfacectlCli: mockedInterfacectl.runInterfacectlCli,
}));
vi.mock("@/lib/local-workbench/local-llm", async () => {
  const actual = await vi.importActual<typeof import("@/lib/local-workbench/local-llm")>("@/lib/local-workbench/local-llm");
  return {
    ...actual,
    runLocalLlmAgent: mockedLocalLlm.runLocalLlmAgent,
  };
});
vi.mock("node:child_process", async () => {
  const actual = await vi.importActual<typeof import("node:child_process")>("node:child_process");
  mockedChildProcess.actualSpawn = actual.spawn;
  mockedChildProcess.spawn.mockImplementation(actual.spawn);
  return {
    ...actual,
    spawn: mockedChildProcess.spawn,
  };
});

import {
  appendLocalWorkbenchChatMessage,
  buildAssessmentPayload,
  buildEditedUnresolvedAcceptedSuggestionMessage,
  fatalServerResponseMessage,
  loadLocalWorkbenchData,
  pruneAcceptedSuggestions,
  reviewLocalWorkbenchSuggestion,
  runBenchmarkCohort,
  startLocalWorkbenchRerun,
  suggestionSummaryFromRun,
  unresolvedAcceptedSuggestionCodes,
  unresolvedAcceptedSuggestionNoopErrorMessage,
} from "@/lib/local-workbench/service";
import type { LocalWorkbenchAcceptedSuggestion, LocalWorkbenchRun } from "@/lib/local-workbench/types";
import {
  BENCHMARK_SHARED_SHELL_FIXTURE,
  getBenchmarkFixture,
  getBenchmarkFixtureProfile,
} from "@/lib/local-workbench/benchmark-fixtures";

async function seedContract(workspaceRoot: string): Promise<void> {
  const contractPath = path.join(workspaceRoot, "contracts", "generated", "reference-target-web.contract.json");
  await fs.mkdir(path.dirname(contractPath), { recursive: true });
  await fs.writeFile(
    contractPath,
    JSON.stringify({
      contractId: "reference-target-web.generated",
      version: "0.1.0",
      description: "Generated fixture contract.",
      color: {
        policy: "warn",
        allowedValues: ["#f9fbff"],
      },
      surfaces: [
        {
          id: "reference-target-web",
          allowedFonts: ["Inter"],
          layout: { maxContentWidth: 1160 },
          requiredSections: ["landing.hero"],
        },
      ],
    }),
    "utf8",
  );
}

function responsesPayload(value: unknown) {
  return {
    output_text: JSON.stringify(value),
    output: [],
  };
}

function createCompletedChild(code = 0) {
  const child = new EventEmitter() as unknown as childProcess.ChildProcessWithoutNullStreams;
  const stdin = new PassThrough();
  const stdout = new PassThrough();
  const stderr = new PassThrough();
  Object.assign(child, {
    stdin,
    stdout,
    stderr,
    exitCode: null,
    kill: vi.fn(() => {
      return true;
    }),
  });
  queueMicrotask(() => {
    Object.assign(child, { exitCode: code });
    child.emit("close", code);
    child.emit("exit", code);
  });
  return child;
}

function createLongRunningChild() {
  const child = new EventEmitter() as unknown as childProcess.ChildProcessWithoutNullStreams;
  const stdin = new PassThrough();
  const stdout = new PassThrough();
  const stderr = new PassThrough();
  Object.assign(child, {
    stdin,
    stdout,
    stderr,
    exitCode: null,
    kill: vi.fn(() => {
      Object.assign(child, { exitCode: 0 });
      queueMicrotask(() => {
        child.emit("exit", 0);
        child.emit("close", 0);
      });
      return true;
    }),
  });
  return child;
}

function buildAcceptedSuggestion(overrides: Partial<LocalWorkbenchAcceptedSuggestion> = {}): LocalWorkbenchAcceptedSuggestion {
  return {
    findingCode: "motion.none-detected",
    findingMessage: "No motion declarations detected.",
    summary: "Add contract-compliant motion declarations.",
    suggestedPath: "apps/reference-target-web/app/page.tsx",
    sourceRunId: "run-1",
    acceptedAt: "2026-03-13T21:24:00.000Z",
    ...overrides,
  };
}

async function seedBenchmarkSandboxDependencies(workspaceRoot: string, fixtureIds: string[]): Promise<void> {
  await fs.mkdir(path.join(workspaceRoot, "node_modules"), { recursive: true });
  for (const fixtureId of fixtureIds) {
    const fixture = getBenchmarkFixture(fixtureId);
    await fs.mkdir(path.join(workspaceRoot, fixture.appPath, "node_modules"), { recursive: true });
  }
}

async function seedBenchmarkContracts(workspaceRoot: string, fixtureIds: string[]): Promise<void> {
  for (const fixtureId of fixtureIds) {
    const fixture = getBenchmarkFixture(fixtureId);
    const contractPath = path.join(workspaceRoot, fixture.contractPath);
    await fs.mkdir(path.dirname(contractPath), { recursive: true });
    await fs.writeFile(
      contractPath,
      JSON.stringify({
        contractId: `${fixtureId}.generated`,
        version: "0.1.0",
        description: `${fixtureId} generated fixture contract.`,
        surfaces: [
          {
            id: fixtureId,
            allowedFonts: ["Inter", "var(--font-inter)", "sans-serif"],
            layout: { maxContentWidth: 1120, requiredContainers: ["page-container"] },
            requiredSections: [],
          },
        ],
        constraints: {
          motion: {
            allowedDurationsMs: [120],
            allowedTimingFunctions: ["linear"],
          },
        },
      }),
      "utf8",
    );
  }
}

function installBenchmarkCliMocks(input: {
  workspaceRoot: string;
  baselineFindingsByFixtureId?: Record<string, Array<Record<string, unknown>>>;
  strategyFindingsByFixtureId?: Record<string, Record<string, Array<Record<string, unknown>>>>;
  repairMapByFixtureId?: Record<string, Array<Record<string, unknown>>>;
}): void {
  const baselineFindingsByFixtureId = input.baselineFindingsByFixtureId ?? {};
  const strategyFindingsByFixtureId = input.strategyFindingsByFixtureId ?? {};
  const repairMapByFixtureId = input.repairMapByFixtureId ?? {};

  mockedInterfacectl.runInterfacectlCli.mockImplementation(async (args: string[]) => {
    const [command] = args;

    if (command === "compile") {
      const outDir = args[args.indexOf("--out") + 1]!;
      await fs.mkdir(outDir, { recursive: true });
      return { stdout: "", stderr: "" };
    }

    if (command === "prepare-generation") {
      const surfaceId = args[args.indexOf("--surface") + 1]!;
      const outPath = args[args.indexOf("--out") + 1]!;
      await fs.mkdir(path.dirname(outPath), { recursive: true });
      await fs.writeFile(
        outPath,
        JSON.stringify({ repairMap: repairMapByFixtureId[surfaceId] ?? [] }),
        "utf8",
      );
      return { stdout: "", stderr: "" };
    }

    if (command === "init-generation-session") {
      const surfaceId = args[args.indexOf("--surface") + 1]!;
      const sessionId = args[args.indexOf("--session") + 1]!;
      const artifactsRoot = args[args.indexOf("--artifacts-root") + 1]!;
      const sessionDir = path.join(artifactsRoot, surfaceId, sessionId);
      await fs.mkdir(path.join(sessionDir, "attempts"), { recursive: true });
      await fs.writeFile(path.join(sessionDir, "session.json"), JSON.stringify({ sessionId, surfaceId }), "utf8");
      return { stdout: "", stderr: "" };
    }

    if (command === "record-generation-attempt") {
      const sessionDir = args[args.indexOf("--session-dir") + 1]!;
      const pathParts = sessionDir.split(path.sep);
      const surfaceId = pathParts[pathParts.length - 3]!;
      const strategy = path.basename(sessionDir);
      const findings = strategy === "baseline-seed"
        ? (baselineFindingsByFixtureId[surfaceId] ?? [])
        : (strategyFindingsByFixtureId[surfaceId]?.[strategy] ?? []);
      const status = findings.length > 0 ? "warn" : "pass";
      await fs.mkdir(path.join(sessionDir, "attempts"), { recursive: true });
      await fs.writeFile(
        path.join(sessionDir, "attempts", "001.validate.json"),
        JSON.stringify({ status, findings }),
        "utf8",
      );
      return { stdout: "", stderr: "" };
    }

    if (command === "prepare-generation-handoff") {
      const outPath = args[args.indexOf("--out") + 1]!;
      await fs.mkdir(path.dirname(outPath), { recursive: true });
      await fs.writeFile(outPath, JSON.stringify({ runtimeGuidance: {} }), "utf8");
      return { stdout: "", stderr: "" };
    }

    if (command === "capture-generation-preview") {
      const sessionDir = args[args.indexOf("--session-dir") + 1]!;
      await fs.writeFile(path.join(sessionDir, "attempts", "001.preview.png"), "");
      return { stdout: "", stderr: "" };
    }

    if (command === "summarize-generation-session") {
      const sessionDir = args[args.indexOf("--session-dir") + 1]!;
      const pathParts = sessionDir.split(path.sep);
      const surfaceId = pathParts[pathParts.length - 3]!;
      const strategy = path.basename(sessionDir);
      const validatePath = path.join(sessionDir, "attempts", "001.validate.json");
      const validate = JSON.parse(await fs.readFile(validatePath, "utf8")) as {
        status: string;
        findings: Array<{ code?: string }>;
      };
      await fs.writeFile(
        path.join(sessionDir, "summary.json"),
        JSON.stringify({
          surfaceId,
          sessionId: path.relative(path.join(input.workspaceRoot, "artifacts", "generation-sessions", surfaceId), sessionDir),
          tool: "local-llm",
          guidanceStrategy: strategy,
          attemptCount: 1,
          firstPassAttempt: validate.status === "pass" ? 1 : null,
          firstAcceptableAttempt: 1,
          latestStatus: validate.status,
          latestOutcome: validate.status,
          latestAssessment: null,
          latestReview: null,
          heuristics: {
            latestAttempt: {
              unresolvedAcceptedSuggestionRate: validate.findings.length > 0 ? 1 : 0,
            },
            repeatedFindingCarryoverCount: 0,
            rerunsToAcceptableOutcome: 1,
          },
          paths: {
            sessionPath: path.join(sessionDir, "session.json"),
            bundleRoot: path.join(input.workspaceRoot, "artifacts", "generation-benchmarks", "bundle"),
            preparedInputPath: path.join(path.dirname(path.dirname(sessionDir)), "prepared-input.json"),
          },
          attempts: [
            {
              attemptNumber: 1,
              status: validate.status,
              outcome: validate.status,
              findingCodes: validate.findings.map((finding) => String(finding.code ?? "")),
              assessmentPath: path.join(sessionDir, "attempts", "001.assessment.json"),
              metadataPath: path.join(sessionDir, "attempts", "001.metadata.json"),
              validatePath,
            },
          ],
        }),
        "utf8",
      );
      return { stdout: "", stderr: "" };
    }

    if (command === "compare-generation-sessions") {
      const baselineSessionDir = args[args.indexOf("--baseline-session-dir") + 1]!;
      const guidedSessionDir = args[args.indexOf("--guided-session-dir") + 1]!;
      const outDir = args[args.indexOf("--out-dir") + 1]!;
      const baselineSummary = JSON.parse(await fs.readFile(path.join(baselineSessionDir, "summary.json"), "utf8"));
      const guidedSummary = JSON.parse(await fs.readFile(path.join(guidedSessionDir, "summary.json"), "utf8"));
      const comparisonPath = path.join(outDir, "comparison.json");
      await fs.mkdir(outDir, { recursive: true });
      await fs.writeFile(
        comparisonPath,
        JSON.stringify({
          surfaceId: baselineSummary.surfaceId,
          tool: "local-llm",
          brief: {
            sha256: "brief-hash",
            baselinePath: path.join(path.dirname(outDir), "implementation-brief.md"),
            guidedPath: path.join(path.dirname(outDir), "implementation-brief.md"),
          },
          baseline: {
            sessionId: baselineSummary.sessionId,
            sessionDir: baselineSessionDir,
            guidanceStrategy: baselineSummary.guidanceStrategy,
            attemptCount: 1,
            firstAcceptableAttempt: 1,
            latestOutcome: baselineSummary.latestOutcome,
            firstAttempt: {
              attemptNumber: 1,
              status: baselineSummary.latestStatus,
              outcome: baselineSummary.latestOutcome,
              findingCount: baselineSummary.attempts[0].findingCodes.length,
              blockingFindingCount: 0,
              warningFindingCount: baselineSummary.attempts[0].findingCodes.length,
              findingCodes: baselineSummary.attempts[0].findingCodes,
              assessment: {
                structure: "partial",
                components: "partial",
                boundary: "partial",
                visual: "partial",
                responsiveness: "partial",
                notes: "Benchmark baseline attempt.",
              },
            },
            latestAttempt: {
              attemptNumber: 1,
              status: baselineSummary.latestStatus,
              outcome: baselineSummary.latestOutcome,
              findingCount: baselineSummary.attempts[0].findingCodes.length,
              blockingFindingCount: 0,
              warningFindingCount: baselineSummary.attempts[0].findingCodes.length,
              findingCodes: baselineSummary.attempts[0].findingCodes,
              assessment: {
                structure: "partial",
                components: "partial",
                boundary: "partial",
                visual: "partial",
                responsiveness: "partial",
                notes: "Benchmark baseline attempt.",
              },
            },
            recurringFindingCodes: [],
            recurringRepairCodes: [],
          },
          guided: {
            sessionId: guidedSummary.sessionId,
            sessionDir: guidedSessionDir,
            guidanceStrategy: guidedSummary.guidanceStrategy,
            attemptCount: 1,
            firstAcceptableAttempt: 1,
            latestOutcome: guidedSummary.latestOutcome,
            firstAttempt: {
              attemptNumber: 1,
              status: guidedSummary.latestStatus,
              outcome: guidedSummary.latestOutcome,
              findingCount: guidedSummary.attempts[0].findingCodes.length,
              blockingFindingCount: 0,
              warningFindingCount: guidedSummary.attempts[0].findingCodes.length,
              findingCodes: guidedSummary.attempts[0].findingCodes,
              assessment: {
                structure: "strong",
                components: "strong",
                boundary: "strong",
                visual: "strong",
                responsiveness: "strong",
                notes: "Benchmark guided attempt.",
              },
            },
            latestAttempt: {
              attemptNumber: 1,
              status: guidedSummary.latestStatus,
              outcome: guidedSummary.latestOutcome,
              findingCount: guidedSummary.attempts[0].findingCodes.length,
              blockingFindingCount: 0,
              warningFindingCount: guidedSummary.attempts[0].findingCodes.length,
              findingCodes: guidedSummary.attempts[0].findingCodes,
              assessment: {
                structure: "strong",
                components: "strong",
                boundary: "strong",
                visual: "strong",
                responsiveness: "strong",
                notes: "Benchmark guided attempt.",
              },
            },
            recurringFindingCodes: [],
            recurringRepairCodes: [],
          },
          delta: {
            firstAttemptVerdict: { baseline: baselineSummary.latestOutcome, guided: guidedSummary.latestOutcome },
            firstAttemptFindingCountDelta: guidedSummary.attempts[0].findingCodes.length - baselineSummary.attempts[0].findingCodes.length,
            firstAttemptBlockingFindingCountDelta: 0,
            firstAttemptWarningFindingCountDelta: guidedSummary.attempts[0].findingCodes.length - baselineSummary.attempts[0].findingCodes.length,
            latestFindingCountDelta: guidedSummary.attempts[0].findingCodes.length - baselineSummary.attempts[0].findingCodes.length,
            attemptsToAcceptableOutcome: {
              baseline: 1,
              guided: 1,
              delta: 0,
            },
            rubric: {},
          },
          checks: {
            guidedFewerFirstAttemptBlockingFindings: false,
            guidedReachedAcceptableNoLater: true,
            guidedRubricAtLeastAsGood: true,
            guidedRubricBetterDimensions: ["structure"],
            meetsGoal: guidedSummary.latestOutcome === "pass",
          },
          paths: {
            baselineSessionDir,
            guidedSessionDir,
          },
        }),
        "utf8",
      );
      return { stdout: JSON.stringify({ paths: { jsonPath: comparisonPath } }), stderr: "" };
    }

    if (command === "summarize-generation-benchmark") {
      const comparisonPaths = (args[args.indexOf("--comparisons") + 1] ?? "")
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);
      const outDir = args[args.indexOf("--out-dir") + 1]!;
      const comparisons = await Promise.all(
        comparisonPaths.map(async (comparisonPath) => JSON.parse(await fs.readFile(comparisonPath, "utf8"))),
      );
      const reportJsonPath = path.join(outDir, "benchmark-report.json");
      const reportMarkdownPath = path.join(outDir, "benchmark-report.md");
      await fs.mkdir(outDir, { recursive: true });
      await fs.writeFile(
        reportJsonPath,
        JSON.stringify({
          generatedAt: "2026-03-15T01:00:00.000Z",
          comparisons: comparisons.map((comparison, index) => ({
            comparisonPath: comparisonPaths[index],
            surfaceId: comparison.surfaceId,
            tool: "local-llm",
            meetsGoal: comparison.checks.meetsGoal,
            baselineGuidanceStrategy: comparison.baseline.guidanceStrategy,
            guidedGuidanceStrategy: comparison.guided.guidanceStrategy,
            guidedFewerFirstAttemptBlockingFindings: comparison.checks.guidedFewerFirstAttemptBlockingFindings,
            guidedReachedAcceptableNoLater: comparison.checks.guidedReachedAcceptableNoLater,
            guidedRubricBetterDimensions: comparison.checks.guidedRubricBetterDimensions,
          })),
          suggestions: [],
          overall: {
            surfaceCount: new Set(comparisons.map((comparison) => comparison.surfaceId)).size,
            surfacesMeetingGoal: comparisons.filter((comparison) => comparison.checks.meetsGoal).length,
            guidedFewerFirstAttemptBlockingFindings: 0,
            guidedReachedAcceptableNoLater: comparisons.length,
            acceptedSuggestionCount: 0,
            rejectedSuggestionCount: 0,
            proposedSuggestionCount: 0,
          },
        }),
        "utf8",
      );
      await fs.writeFile(reportMarkdownPath, "# Benchmark report\n", "utf8");
      return {
        stdout: JSON.stringify({
          paths: {
            jsonPath: reportJsonPath,
            markdownPath: reportMarkdownPath,
          },
        }),
        stderr: "",
      };
    }

    return { stdout: "", stderr: "" };
  });
}

describe("local workbench service", () => {
  const originalFetch = global.fetch;
  let workspaceRoot: string;

  beforeEach(async () => {
    workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "surfaceops-local-workbench-"));
    mockedInterfacectl.resolveWorkspaceRoot.mockReturnValue(workspaceRoot);
    mockedInterfacectl.runInterfacectlCli.mockReset();
    mockedLocalLlm.runLocalLlmAgent.mockReset();
    mockedChildProcess.spawn.mockReset();
    mockedChildProcess.spawn.mockImplementation((command: string, args?: readonly string[]) => {
      if (command === "git") {
        return createCompletedChild() as unknown as ReturnType<typeof childProcess.spawn>;
      }
      if (command === "pnpm" && args?.[0] === "exec" && args?.[1] === "next") {
        return createLongRunningChild() as unknown as ReturnType<typeof childProcess.spawn>;
      }
      return mockedChildProcess.actualSpawn(command, args as string[]);
    });
    delete process.env.SURFACEOPS_LOCAL_RUNS_DIR;
    delete process.env.SURFACEOPS_REPO_CLONE_ROOT;
    delete process.env.SURFACEOPS_LOCAL_LLM_BASE_URL;
    delete process.env.SURFACEOPS_LOCAL_LLM_MODEL;
    await seedContract(workspaceRoot);
    global.fetch = vi.fn(async () =>
      new Response(JSON.stringify(responsesPayload({
        assistantMessage: "No changes.",
        contractChanges: [],
        designerNotes: [],
      })), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ) as typeof fetch;
  });

  afterEach(async () => {
    global.fetch = originalFetch;
    await fs.rm(workspaceRoot, { recursive: true, force: true });
    vi.clearAllMocks();
  });

  it("emits the full interfacectl assessment schema", () => {
    expect(
      buildAssessmentPayload("Baseline snapshot before local agent edits.", ["apps/reference-target-web/app/page.tsx"]),
    ).toEqual({
      structure: "partial",
      components: "partial",
      boundary: "partial",
      visual: "partial",
      responsiveness: "partial",
      notes: "Baseline snapshot before local agent edits.",
      touchedFiles: ["apps/reference-target-web/app/page.tsx"],
    });
  });

  it("adds a highlight color to the working contract via chat", async () => {
    global.fetch = vi.fn(async () =>
      new Response(JSON.stringify(responsesPayload({
        assistantMessage: "Added highlight color #8BAE3F.",
        contractChanges: [
          {
            field: "color.allowedValues",
            action: "add",
            value: "#8BAE3F",
            summary: "Allow color #8BAE3F in the working contract.",
          },
        ],
        designerNotes: [],
      })), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ) as typeof fetch;

    await appendLocalWorkbenchChatMessage({ message: "add highlight color #8BAE3F" });

    const data = await loadLocalWorkbenchData();
    expect(data.activeContractChanges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "color.allowedValues",
          value: "#8BAE3F",
        }),
      ]),
    );
    expect(data.chat).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: "Working contract" }),
        expect.objectContaining({ role: "user", content: "add highlight color #8BAE3F" }),
        expect.objectContaining({
          role: "assistant",
          content: "Applied: Allow color #8BAE3F in the working contract.",
        }),
      ]),
    );

    const sessionPath = path.join(
      workspaceRoot,
      ".scratch",
      "surfaceops-local-runs",
      "reference-target-web",
      "contract-session.json",
    );
    await expect(fs.readFile(sessionPath, "utf8")).resolves.toContain("#8BAE3F");

    const canonicalContract = await fs.readFile(
      path.join(workspaceRoot, "contracts", "generated", "reference-target-web.contract.json"),
      "utf8",
    );
    expect(canonicalContract).not.toContain("#8BAE3F");
  });

  it("captures unsupported layout intent as a designer note while setting max width", async () => {
    global.fetch = vi.fn(async () =>
      new Response(JSON.stringify(responsesPayload({
        assistantMessage: "Updated width and preserved edge-to-edge as a designer note.",
        contractChanges: [
          {
            field: "surfaces.reference-target-web.layout.maxContentWidth",
            action: "set",
            value: 2000,
            summary: "Set max content width to 2000px.",
          },
        ],
        designerNotes: ["Edge-to-edge layout intent should be preserved."],
      })), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ) as typeof fetch;

    await appendLocalWorkbenchChatMessage({ message: "go edge-to-edge, max 2000px" });

    const data = await loadLocalWorkbenchData();
    expect(data.contract.maxContentWidth).toBe(2000);
    expect(data.activeDesignerNotes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          content: "Edge-to-edge layout intent should be preserved.",
        }),
      ]),
    );
  });

  it("upgrades a legacy session by replaying named-color chat turns into structured contract state", async () => {
    const sessionPath = path.join(
      workspaceRoot,
      ".scratch",
      "surfaceops-local-runs",
      "reference-target-web",
      "contract-session.json",
    );
    const canonicalContractPath = path.join(workspaceRoot, "contracts", "generated", "reference-target-web.contract.json");
    await fs.mkdir(path.dirname(sessionPath), { recursive: true });
    await fs.writeFile(
      sessionPath,
      JSON.stringify({
        schemaVersion: 1,
        surfaceId: "reference-target-web",
        canonicalContractPath,
        updatedAt: "2026-03-14T05:22:46.297Z",
        workingContract: JSON.parse(await fs.readFile(canonicalContractPath, "utf8")),
        chat: [
          {
            id: "user-1",
            role: "user",
            title: "Designer",
            content: "the background color of the shell should be pink",
            createdAt: "2026-03-14T05:22:46.297Z",
          },
          {
            id: "assistant-1",
            role: "assistant",
            title: "Contract shaper",
            content: "The shell’s background color has been added as an allowed value.",
            createdAt: "2026-03-14T05:22:46.297Z",
          },
        ],
        activeContractChanges: [],
        activeDesignerNotes: [],
      }),
      "utf8",
    );

    global.fetch = vi.fn(async () =>
      new Response("{}", {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }),
    ) as typeof fetch;

    const data = await loadLocalWorkbenchData();
    expect(data.activeContractChanges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "color.allowedValues",
          value: "#ffc0cb",
        }),
      ]),
    );
    expect(data.activeDesignerNotes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          content: "Shell background should use #ffc0cb.",
        }),
      ]),
    );
    expect(data.chat).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: "assistant",
          content: "Applied: Allow color #ffc0cb in the working contract. Designer notes: Shell background should use #ffc0cb.",
        }),
      ]),
    );

    const storedSession = JSON.parse(await fs.readFile(sessionPath, "utf8")) as {
      schemaVersion: number;
      workingContract: { color?: { allowedValues?: string[] } };
      chat: Array<{ content: string }>;
    };
    expect(storedSession.schemaVersion).toBe(2);
    expect(storedSession.workingContract.color?.allowedValues).toContain("#ffc0cb");
    expect(storedSession.chat[1]?.content).toBe(
      "Applied: Allow color #ffc0cb in the working contract. Designer notes: Shell background should use #ffc0cb.",
    );
  });

  it("keeps latest run agent input stable after later chat turns update the working contract", async () => {
    await appendLocalWorkbenchChatMessage({ message: "add highlight color #8BAE3F" });

    const runRoot = path.join(
      workspaceRoot,
      ".scratch",
      "surfaceops-local-runs",
      "reference-target-web",
      "runs",
      "20260313210000",
    );
    await fs.mkdir(runRoot, { recursive: true });
    const agentInputPath = path.join(runRoot, "agent-input.txt");
    await fs.writeFile(agentInputPath, "System:\nEffective working contract:\nMax content width: 1160", "utf8");
    await fs.writeFile(
      path.join(runRoot, "run.json"),
      JSON.stringify({
        schemaVersion: 1,
        runId: "20260313210000",
        status: "succeeded",
        createdAt: "2026-03-13T21:00:00.000Z",
        completedAt: "2026-03-13T21:02:00.000Z",
        contractPath: path.join(runRoot, "effective-contract.json"),
        preparedInputPath: null,
        baselineSessionDir: null,
        currentSessionDir: null,
        baselinePreviewPath: null,
        currentPreviewPath: null,
        baselineSummaryPath: null,
        currentSummaryPath: null,
        comparisonPath: null,
        suggestionsPath: null,
        transcriptPath: null,
        effectiveContractPath: path.join(runRoot, "effective-contract.json"),
        agentInputPath,
        explainabilityPath: path.join(runRoot, "explainability.json"),
        touchedFiles: [],
        errorMessage: null,
      }),
      "utf8",
    );

    global.fetch = vi.fn(async () =>
      new Response(JSON.stringify(responsesPayload({
        assistantMessage: "Set max content width to 2000px.",
        contractChanges: [
          {
            field: "surfaces.reference-target-web.layout.maxContentWidth",
            action: "set",
            value: 2000,
            summary: "Set max content width to 2000px.",
          },
        ],
        designerNotes: [],
      })), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ) as typeof fetch;

    await appendLocalWorkbenchChatMessage({ message: "max 2000px" });

    const data = await loadLocalWorkbenchData();
    expect(data.latestRunAgentInput.path).toBe(agentInputPath);
    expect(data.latestRunAgentInput.content).toContain("Max content width: 1160");
    expect(data.contract.maxContentWidth).toBe(2000);
  });

  it("writes repaired named colors into rerun effective contracts and agent input", async () => {
    const sessionPath = path.join(
      workspaceRoot,
      ".scratch",
      "surfaceops-local-runs",
      "reference-target-web",
      "contract-session.json",
    );
    const canonicalContractPath = path.join(workspaceRoot, "contracts", "generated", "reference-target-web.contract.json");
    await fs.mkdir(path.dirname(sessionPath), { recursive: true });
    await fs.writeFile(
      sessionPath,
      JSON.stringify({
        schemaVersion: 1,
        surfaceId: "reference-target-web",
        canonicalContractPath,
        updatedAt: "2026-03-14T05:22:46.297Z",
        workingContract: JSON.parse(await fs.readFile(canonicalContractPath, "utf8")),
        chat: [
          {
            id: "user-1",
            role: "user",
            title: "Designer",
            content: "the background color of the shell should be pink",
            createdAt: "2026-03-14T05:22:46.297Z",
          },
          {
            id: "assistant-1",
            role: "assistant",
            title: "Contract shaper",
            content: "The shell’s background color has been added as an allowed value.",
            createdAt: "2026-03-14T05:22:46.297Z",
          },
        ],
        activeContractChanges: [],
        activeDesignerNotes: [],
      }),
      "utf8",
    );

    global.fetch = vi.fn(async (input) => {
      const url = String(input);
      if (url.startsWith("http://127.0.0.1:")) {
        return new Response("", { status: 200 });
      }
      return new Response("{}", {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;

    mockedInterfacectl.runInterfacectlCli.mockImplementation(async (args: string[]) => {
      const command = args[0];
      if (command === "compile") {
        const outIndex = args.indexOf("--out");
        if (outIndex >= 0) {
          await fs.mkdir(args[outIndex + 1]!, { recursive: true });
        }
        return { stdout: "", stderr: "" };
      }

      if (command === "prepare-generation") {
        const outIndex = args.indexOf("--out");
        const contract = JSON.parse(await fs.readFile(sessionPath, "utf8")) as {
          workingContract: { color?: { allowedValues?: string[] } };
        };
        await fs.writeFile(
          args[outIndex + 1]!,
          JSON.stringify({
            contract: {
              id: "reference-target-web.generated",
              version: "0.1.0",
            },
            generation: {
              layout: { maxContentWidth: 1160 },
              visual: { allowedFonts: ["Inter"] },
            },
            constraints: {
              color: {
                policy: "warn",
                allowedValues: contract.workingContract.color?.allowedValues ?? [],
              },
            },
            sections: [],
            repairMap: [],
          }),
          "utf8",
        );
        return { stdout: "", stderr: "" };
      }

      if (command === "init-generation-session") {
        const sessionIndex = args.indexOf("--session");
        const artifactsIndex = args.indexOf("--artifacts-root");
        const sessionDir = path.join(args[artifactsIndex + 1]!, "reference-target-web", args[sessionIndex + 1]!);
        await fs.mkdir(path.join(sessionDir, "attempts"), { recursive: true });
        return { stdout: "", stderr: "" };
      }

      if (command === "capture-generation-preview") {
        const sessionIndex = args.indexOf("--session-dir");
        await fs.writeFile(path.join(args[sessionIndex + 1]!, "attempts", "001.preview.png"), "");
        return { stdout: "", stderr: "" };
      }

      if (command === "summarize-generation-session") {
        const sessionIndex = args.indexOf("--session-dir");
        const sessionDir = args[sessionIndex + 1]!;
        await fs.writeFile(path.join(sessionDir, "summary.json"), JSON.stringify({ status: "warn" }), "utf8");
        await fs.writeFile(
          path.join(sessionDir, "attempts", "001.validate.json"),
          JSON.stringify({ status: "warn", findings: [] }),
          "utf8",
        );
        return { stdout: "", stderr: "" };
      }

      return { stdout: "", stderr: "" };
    });

    mockedLocalLlm.runLocalLlmAgent.mockImplementation(async (options: {
      effectiveContractSummary?: string;
      activeDesignerNotes?: Array<{ content: string }>;
    }) => ({
      transcript: [],
      touchedFiles: ["apps/reference-target-web/app/page.tsx"],
      summary: "Applied the repaired color guidance.",
      noChanges: false,
      agentInput: [
        "System:",
        "Effective working contract:",
        options.effectiveContractSummary ?? "",
        "",
        "Active designer notes:",
        ...(options.activeDesignerNotes?.map((note) => `- ${note.content}`) ?? []),
      ].join("\n"),
    }));

    const result = await startLocalWorkbenchRerun();
    expect(result.status).toBe("succeeded");

    const runsDir = path.join(
      workspaceRoot,
      ".scratch",
      "surfaceops-local-runs",
      "reference-target-web",
      "runs",
    );
    const [latestRunId] = (await fs.readdir(runsDir)).sort().reverse();
    expect(latestRunId).toBeTruthy();

    const effectiveContract = await fs.readFile(path.join(runsDir, latestRunId!, "effective-contract.json"), "utf8");
    const agentInput = await fs.readFile(path.join(runsDir, latestRunId!, "agent-input.txt"), "utf8");
    const explainability = await fs.readFile(path.join(runsDir, latestRunId!, "explainability.json"), "utf8");

    expect(effectiveContract).toContain("#ffc0cb");
    expect(agentInput).toContain("#ffc0cb");
    expect(agentInput).toContain("Shell background should use #ffc0cb.");
    expect(explainability).toContain("#ffc0cb");
  });

  it("builds validator-specific follow-up guidance when edits land but motion still remains unresolved", () => {
    const latestRun = {
      runId: "20260313225854",
      status: "succeeded",
      createdAt: "2026-03-13T22:58:54.037Z",
      completedAt: "2026-03-13T22:59:19.280Z",
      latestRunLabel: "Run 20260313",
      model: "openai/gpt-oss-120b",
      currentPhase: null,
      phaseHistory: [],
      agentSummary: null,
      noChanges: false,
      toolCallCount: 2,
      writeCount: 1,
      lastToolName: "finish",
      lastError: null,
      transcriptPath: "/tmp/surfaceops-local-runs/reference-target-web/runs/20260313225854/agent-trace.json",
      touchedFiles: ["apps/reference-target-web/app/globals.css"],
      errorMessage: null,
      effectiveContractPath: null,
      guidanceStrategy: null,
      guidanceHandoffPath: null,
      agentInputPath: null,
      explainabilityPath: null,
      baselinePreview: { path: null, dataUrl: null },
      currentPreview: { path: null, dataUrl: null },
      baselineSummaryPath: null,
      currentSummaryPath: null,
      suggestionsPath: null,
      comparison: {
        baselineStatus: "warn",
        currentStatus: "warn",
        baselineFindingCount: 2,
        currentFindingCount: 1,
        baselineBlockingCount: 0,
        currentBlockingCount: 0,
        findingCountDelta: -1,
        blockingCountDelta: 0,
        newFindingCodes: [],
        resolvedFindingCodes: ["token.normalization-skipped"],
      },
      suggestions: [
        {
          suggestionId: "suggestion-1",
          findingCode: "motion.none-detected",
          findingMessage: "No motion declarations detected.",
          summary: "Legacy motion summary.",
          suggestedPath: "apps/reference-target-web/app/globals.css",
          status: "accepted",
        },
      ],
    } satisfies LocalWorkbenchRun;

    const latestRunOperatorNote = buildEditedUnresolvedAcceptedSuggestionMessage(latestRun, [
      buildAcceptedSuggestion({
        summary: "Add contract-compliant motion declarations in existing styles using 120ms linear timing without changing the fixture structure.",
        suggestedPath: "apps/reference-target-web/app/globals.css",
      }),
    ]);

    expect(latestRunOperatorNote).toContain("validator still did not observe any real motion declarations");
    expect(latestRunOperatorNote).toContain("literal 120ms linear timing");
    expect(latestRunOperatorNote).toContain(".header, .section, or .card");
  });

  it("does not build follow-up guidance immediately after accepting a suggestion on the latest run", () => {
    const latestRun = {
      runId: "20260313233524",
      status: "succeeded",
      createdAt: "2026-03-13T23:35:24.000Z",
      completedAt: "2026-03-13T23:35:46.000Z",
      latestRunLabel: "Run 20260313",
      model: "openai/gpt-oss-120b",
      currentPhase: null,
      phaseHistory: [],
      agentSummary: null,
      noChanges: false,
      toolCallCount: 2,
      writeCount: 1,
      lastToolName: "finish",
      lastError: null,
      transcriptPath: "/tmp/surfaceops-local-runs/reference-target-web/runs/20260313233524/agent-trace.json",
      touchedFiles: ["apps/reference-target-web/app/globals.css"],
      errorMessage: null,
      effectiveContractPath: null,
      guidanceStrategy: null,
      guidanceHandoffPath: null,
      agentInputPath: null,
      explainabilityPath: null,
      baselinePreview: { path: null, dataUrl: null },
      currentPreview: { path: null, dataUrl: null },
      baselineSummaryPath: null,
      currentSummaryPath: null,
      suggestionsPath: null,
      comparison: {
        baselineStatus: "warn",
        currentStatus: "warn",
        baselineFindingCount: 2,
        currentFindingCount: 1,
        baselineBlockingCount: 0,
        currentBlockingCount: 0,
        findingCountDelta: -1,
        blockingCountDelta: 0,
        newFindingCodes: [],
        resolvedFindingCodes: ["motion.none-detected"],
      },
      suggestions: [
        {
          suggestionId: "suggestion-1",
          findingCode: "token.normalization-skipped",
          findingMessage: "Could not normalize typography token \"var(--font-inter)\" because missing custom property definition.",
          summary: "In apps/reference-target-web/app/globals.css, insert --font-inter: \"Inter\", sans-serif; into the existing :root block so typography normalization succeeds.",
          suggestedPath: "apps/reference-target-web/app/globals.css",
          status: "accepted",
        },
      ],
    } satisfies LocalWorkbenchRun;

    expect(
      buildEditedUnresolvedAcceptedSuggestionMessage(latestRun, [
        buildAcceptedSuggestion({
          findingCode: "token.normalization-skipped",
          findingMessage: "Could not normalize typography token \"var(--font-inter)\" because missing custom property definition.",
          summary: "In apps/reference-target-web/app/globals.css, insert --font-inter: \"Inter\", sans-serif; into the existing :root block so typography normalization succeeds.",
          suggestedPath: "apps/reference-target-web/app/globals.css",
          sourceRunId: "20260313233524",
          acceptedAt: "2026-03-13T23:35:50.000Z",
        }),
      ]),
    ).toBeNull();
  });

  it("uses repair-map arrays and accepted backlog to summarize recurring findings", () => {
    const suggestions = suggestionSummaryFromRun(
      {
        repairMap: [
          {
            code: "motion.none-detected",
            summary: "Add contract-compliant motion declarations.",
            path: "apps/reference-target-web/app/page.tsx",
          },
        ],
      },
      {
        findings: [
          {
            code: "motion.none-detected",
            message: "No motion declarations detected.",
          },
          {
            code: "token.normalization-skipped",
            message: "Could not normalize var(--font-inter).",
          },
        ],
      },
      {
        acceptedSuggestions: [
          buildAcceptedSuggestion({
            findingCode: "token.normalization-skipped",
            findingMessage: "Could not normalize var(--font-inter).",
            summary: "Define the font token so normalization succeeds.",
            suggestedPath: "apps/reference-target-web/app/layout.tsx",
            rationale: "The accepted suggestion should persist across reruns.",
          }),
        ],
      },
    );

    expect(suggestions).toEqual([
      expect.objectContaining({
        findingCode: "motion.none-detected",
        summary: "Add contract-compliant motion declarations.",
        suggestedPath: "apps/reference-target-web/app/page.tsx",
        status: "proposed",
      }),
      expect.objectContaining({
        findingCode: "token.normalization-skipped",
        summary: "Define the font token so normalization succeeds.",
        suggestedPath: "apps/reference-target-web/app/layout.tsx",
        status: "accepted",
        rationale: "The accepted suggestion should persist across reruns.",
      }),
    ]);
  });

  it("falls back to concrete file paths and summaries for unresolved motion and token findings", () => {
    const suggestions = suggestionSummaryFromRun(
      {
        repairMap: [],
      },
      {
        findings: [
          {
            code: "motion.none-detected",
            message: "No motion declarations detected for surface \"reference-target-web\".",
            location: {
              file: "",
              line: 0,
            },
          },
          {
            code: "token.normalization-skipped",
            message: "Could not normalize typography token \"var(--font-inter)\" because missing custom property definition.",
            location: {
              file: "apps/reference-target-web/app/globals.css",
              line: 0,
            },
          },
        ],
      },
    );

    expect(suggestions).toHaveLength(2);
    expect(suggestions[0]).toEqual(
      expect.objectContaining({
        findingCode: "motion.none-detected",
        suggestedPath: "apps/reference-target-web/app/globals.css",
      }),
    );
    expect(suggestions[0]?.summary).toContain("literal 120ms linear timing");
    expect(suggestions[0]?.summary).toContain("real transition or animation declaration");
    expect(suggestions[1]).toEqual(
      expect.objectContaining({
        findingCode: "token.normalization-skipped",
        summary: "In apps/reference-target-web/app/globals.css, insert --font-inter: \"Inter\", sans-serif; into the existing :root block so typography normalization succeeds.",
        suggestedPath: "apps/reference-target-web/app/globals.css",
      }),
    );
  });

  it("prunes resolved accepted suggestions and builds explicit no-op failure messages", () => {
    const acceptedSuggestions = [
      buildAcceptedSuggestion(),
      buildAcceptedSuggestion({
        findingCode: "token.normalization-skipped",
        findingMessage: "Could not normalize var(--font-inter).",
        summary: "Define the font token so normalization succeeds.",
        suggestedPath: "apps/reference-target-web/app/layout.tsx",
      }),
    ];
    const validatePayload = {
      findings: [
        {
          code: "motion.none-detected",
          message: "No motion declarations detected.",
        },
      ],
    };

    expect(pruneAcceptedSuggestions(acceptedSuggestions, validatePayload)).toEqual([acceptedSuggestions[0]]);
    expect(unresolvedAcceptedSuggestionCodes(acceptedSuggestions, validatePayload)).toEqual(["motion.none-detected"]);
    expect(unresolvedAcceptedSuggestionNoopErrorMessage(true, acceptedSuggestions, validatePayload)).toBe(
      "Local model reported noChanges=true but accepted suggestions remain unresolved: motion.none-detected",
    );
    expect(unresolvedAcceptedSuggestionNoopErrorMessage(false, acceptedSuggestions, validatePayload)).toBeNull();
  });

  it("summarizes fatal preview server responses so broken sandboxes fail fast", () => {
    const body = `
      <!DOCTYPE html>
      <html>
        <body>
          <script id="__NEXT_DATA__" type="application/json">
            {"err":{"name":"ModuleBuildError","message":"Syntax Error: Expected '</', got '!'"}}
          </script>
        </body>
      </html>
    `;

    expect(
      fatalServerResponseMessage("http://127.0.0.1:54868", 500, body),
    ).toContain("reference-target-web dev server returned HTTP 500");
    expect(
      fatalServerResponseMessage("http://127.0.0.1:54868", 500, body),
    ).toContain("ModuleBuildError");
    expect(fatalServerResponseMessage("http://127.0.0.1:54868", 404, body)).toBeNull();
  });

  it("updates the accepted backlog by finding code when suggestions are accepted and rejected", async () => {
    const runDir = path.join(
      workspaceRoot,
      ".scratch",
      "surfaceops-local-runs",
      "reference-target-web",
      "runs",
      "run-1",
    );
    await fs.mkdir(runDir, { recursive: true });
    await fs.writeFile(
      path.join(runDir, "run.json"),
      JSON.stringify({
        schemaVersion: 1,
        runId: "run-1",
        status: "succeeded",
        createdAt: "2026-03-13T21:22:06.823Z",
        completedAt: "2026-03-13T21:22:27.051Z",
        contractPath: path.join(workspaceRoot, "contracts", "generated", "reference-target-web.contract.json"),
        preparedInputPath: null,
        baselineSessionDir: null,
        currentSessionDir: null,
        baselinePreviewPath: null,
        currentPreviewPath: null,
        baselineSummaryPath: null,
        currentSummaryPath: null,
        comparisonPath: null,
        suggestionsPath: path.join(runDir, "suggestions.json"),
        transcriptPath: null,
        effectiveContractPath: null,
        agentInputPath: null,
        explainabilityPath: null,
        touchedFiles: [],
        errorMessage: null,
      }),
      "utf8",
    );
    await fs.writeFile(
      path.join(runDir, "suggestions.json"),
      JSON.stringify({
        runId: "run-1",
        suggestions: [
          {
            suggestionId: "suggestion-1",
            findingCode: "token.normalization-skipped",
            findingMessage: "Could not normalize var(--font-inter).",
            summary: "Review and refine token.normalization-skipped.",
            suggestedPath: "apps/reference-target-web",
            status: "proposed",
          },
        ],
      }),
      "utf8",
    );

    await reviewLocalWorkbenchSuggestion({
      runId: "run-1",
      suggestionId: "suggestion-1",
      decision: "accepted",
      rationale: "Use this as the default rerun target.",
    });

    const acceptedPath = path.join(
      workspaceRoot,
      ".scratch",
      "surfaceops-local-runs",
      "reference-target-web",
      "accepted-suggestions.json",
    );
    await expect(fs.readFile(acceptedPath, "utf8")).resolves.toContain("\"findingCode\": \"token.normalization-skipped\"");
    await expect(fs.readFile(acceptedPath, "utf8")).resolves.toContain("\"summary\": \"In apps/reference-target-web/app/globals.css, insert --font-inter: \\\"Inter\\\", sans-serif; into the existing :root block so typography normalization succeeds.\"");
    await expect(fs.readFile(acceptedPath, "utf8")).resolves.toContain("\"suggestedPath\": \"apps/reference-target-web/app/globals.css\"");
    await expect(fs.readFile(acceptedPath, "utf8")).resolves.toContain("\"rationale\": \"Use this as the default rerun target.\"");
    await expect(fs.readFile(path.join(runDir, "suggestions.json"), "utf8")).resolves.toContain("\"status\": \"accepted\"");

    await appendLocalWorkbenchChatMessage({ message: "add highlight color #8BAE3F" });

    const data = await loadLocalWorkbenchData();
    expect(data.activeAcceptedSuggestions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          findingCode: "token.normalization-skipped",
          rationale: "Use this as the default rerun target.",
        }),
      ]),
    );

    global.fetch = vi.fn(async () =>
      new Response(JSON.stringify(responsesPayload({
        assistantMessage: "Added highlight color #8BAE3F.",
        contractChanges: [
          {
            field: "color.allowedValues",
            action: "add",
            value: "#8BAE3F",
            summary: "Allow color #8BAE3F in the working contract.",
          },
        ],
        designerNotes: [],
      })), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ) as typeof fetch;

    await appendLocalWorkbenchChatMessage({ message: "add highlight color #8BAE3F" });

    const updatedData = await loadLocalWorkbenchData();
    expect(updatedData.activeContractChanges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "color.allowedValues",
          value: "#8BAE3F",
        }),
      ]),
    );

    await reviewLocalWorkbenchSuggestion({
      runId: "run-1",
      suggestionId: "suggestion-1",
      decision: "rejected",
    });

    await expect(fs.readFile(acceptedPath, "utf8")).resolves.not.toContain("token.normalization-skipped");
    await expect(fs.readFile(path.join(runDir, "suggestions.json"), "utf8")).resolves.toContain("\"status\": \"rejected\"");
  });

  it("loads active accepted guidance into local workbench data with enriched defaults", async () => {
    const acceptedPath = path.join(
      workspaceRoot,
      ".scratch",
      "surfaceops-local-runs",
      "reference-target-web",
      "accepted-suggestions.json",
    );
    await fs.mkdir(path.dirname(acceptedPath), { recursive: true });
    await fs.writeFile(
      acceptedPath,
      JSON.stringify({
        schemaVersion: 1,
        surfaceId: "reference-target-web",
        updatedAt: "2026-03-13T21:24:00.000Z",
        suggestions: [
          {
            findingCode: "motion.none-detected",
            findingMessage: "No motion declarations detected.",
            summary: "Add contract-compliant motion declarations in existing styles using 120ms linear timing without changing the fixture structure.",
            suggestedPath: "apps/reference-target-web",
            sourceRunId: "run-1",
            acceptedAt: "2026-03-13T21:24:00.000Z",
          },
        ],
      }),
      "utf8",
    );

    const data = await loadLocalWorkbenchData();

    expect(data.activeAcceptedSuggestions).toEqual([
      expect.objectContaining({
        findingCode: "motion.none-detected",
        summary: expect.stringContaining("literal 120ms linear timing"),
        suggestedPath: "apps/reference-target-web/app/globals.css",
      }),
    ]);
    expect(data.latestRunOperatorNote).toBeNull();
    expect(data.chat).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: "Working contract" }),
        expect.objectContaining({ title: "Contract shaper" }),
      ]),
    );
  });

  it("uses fixture metadata to enrich non-reference repair guidance", () => {
    const suggestions = suggestionSummaryFromRun(
      {
        repairMap: [
          {
            code: "section.missing",
            action: {
              type: "ensure-required-sections",
              sectionIds: ["reports.metrics"],
            },
          },
        ],
      },
      {
        findings: [
          {
            code: "section.missing",
            message: "Missing required sections: reports.metrics.",
          },
          {
            code: "motion.none-detected",
            message: "No motion declarations detected for surface \"benchmark-shared-shell-web\".",
            location: {
              file: "",
              line: 0,
            },
          },
        ],
      },
      {
        fixture: BENCHMARK_SHARED_SHELL_FIXTURE,
      },
    );

    expect(suggestions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          findingCode: "section.missing",
          suggestedPath: "apps/benchmark-shared-shell-web/app/reports/page.tsx",
          summary:
            "Restore reports.metrics in apps/benchmark-shared-shell-web/app/reports/page.tsx using real data-contract-section markers while preserving the existing fixture structure.",
        }),
        expect.objectContaining({
          findingCode: "motion.none-detected",
          suggestedPath: "apps/benchmark-shared-shell-web/app/globals.css",
          summary: expect.stringContaining(".shellLink, .surfaceCard, or .statusPill"),
        }),
      ]),
    );
  });

  it("seeds and freezes accepted benchmark guidance per fixture before reusing it across strategies", async () => {
    const fixtureIds = ["reference-target-web", "benchmark-shared-shell-web"];
    await seedBenchmarkSandboxDependencies(workspaceRoot, fixtureIds);
    await seedBenchmarkContracts(workspaceRoot, fixtureIds);
    installBenchmarkCliMocks({
      workspaceRoot,
      baselineFindingsByFixtureId: {
        "reference-target-web": [
          {
            code: "motion.none-detected",
            message: "No motion declarations detected for surface \"reference-target-web\".",
            location: { file: "", line: 0 },
          },
          {
            code: "token.normalization-skipped",
            message:
              "Could not normalize typography token \"var(--font-inter)\" because missing custom property definition.",
            location: { file: "apps/reference-target-web/app/globals.css", line: 0 },
          },
        ],
        "benchmark-shared-shell-web": [
          {
            code: "section.missing",
            message: "Missing required sections: reports.metrics.",
          },
          {
            code: "motion.none-detected",
            message: "No motion declarations detected for surface \"benchmark-shared-shell-web\".",
            location: { file: "", line: 0 },
          },
        ],
      },
      repairMapByFixtureId: {
        "benchmark-shared-shell-web": [
          {
            code: "section.missing",
            action: {
              type: "ensure-required-sections",
              sectionIds: ["reports.metrics"],
            },
          },
        ],
      },
    });
    mockedLocalLlm.runLocalLlmAgent.mockImplementation(async (options: {
      surfaceId?: string;
      acceptedSuggestions?: LocalWorkbenchAcceptedSuggestion[];
    }) => ({
      transcript: [],
      touchedFiles: [`apps/${options.surfaceId}/app/page.tsx`],
      summary: "Applied benchmark guidance.",
      noChanges: false,
      agentInput: "System:\nBenchmark",
      toolCallCount: 1,
      writeCount: 1,
      lastToolName: "finish",
    }));

    const result = await runBenchmarkCohort({
      cohortId: "20260315010000",
      fixtureIds,
      strategies: ["prompt-summary", "json-primary"],
    });

    const manifest = JSON.parse(
      await fs.readFile(path.join(result.benchmarkDir, "manifest.json"), "utf8"),
    ) as {
      schemaVersion: number;
      fixtures: Array<{ fixtureId: string; paths: { acceptedSuggestionsPath: string } }>;
    };
    expect(manifest.schemaVersion).toBe(2);
    expect(manifest.fixtures.map((fixture) => fixture.fixtureId)).toEqual(fixtureIds);

    const referenceRuntimeGuidance = JSON.parse(
      await fs.readFile(
        path.join(result.benchmarkDir, "fixtures", "reference-target-web", "accepted-suggestions.runtime.json"),
        "utf8",
      ),
    ) as { suggestions: LocalWorkbenchAcceptedSuggestion[] };
    const sharedShellRuntimeGuidance = JSON.parse(
      await fs.readFile(
        path.join(result.benchmarkDir, "fixtures", "benchmark-shared-shell-web", "accepted-suggestions.runtime.json"),
        "utf8",
      ),
    ) as { suggestions: LocalWorkbenchAcceptedSuggestion[] };

    expect(referenceRuntimeGuidance.suggestions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          findingCode: "motion.none-detected",
          suggestedPath: "apps/reference-target-web/app/globals.css",
          sourceRunId: "20260315010000/baseline-seed",
        }),
        expect.objectContaining({
          findingCode: "token.normalization-skipped",
          suggestedPath: "apps/reference-target-web/app/globals.css",
          sourceRunId: "20260315010000/baseline-seed",
        }),
      ]),
    );
    expect(sharedShellRuntimeGuidance.suggestions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          findingCode: "section.missing",
          suggestedPath: "apps/benchmark-shared-shell-web/app/reports/page.tsx",
          sourceRunId: "20260315010000/baseline-seed",
        }),
        expect.objectContaining({
          findingCode: "motion.none-detected",
          suggestedPath: "apps/benchmark-shared-shell-web/app/globals.css",
          sourceRunId: "20260315010000/baseline-seed",
        }),
      ]),
    );
    expect(new Set(referenceRuntimeGuidance.suggestions.map((suggestion) => suggestion.acceptedAt)).size).toBe(1);
    expect(new Set(sharedShellRuntimeGuidance.suggestions.map((suggestion) => suggestion.acceptedAt)).size).toBe(1);

    const acceptedSuggestionsByFixture = new Map<string, LocalWorkbenchAcceptedSuggestion[][]>();
    for (const [options] of mockedLocalLlm.runLocalLlmAgent.mock.calls as Array<[{
      surfaceId?: string;
      acceptedSuggestions?: LocalWorkbenchAcceptedSuggestion[];
    }]>) {
      const fixtureCallSet = acceptedSuggestionsByFixture.get(options.surfaceId ?? "") ?? [];
      fixtureCallSet.push(options.acceptedSuggestions ?? []);
      acceptedSuggestionsByFixture.set(options.surfaceId ?? "", fixtureCallSet);
    }
    expect(acceptedSuggestionsByFixture.get("reference-target-web")).toEqual([
      referenceRuntimeGuidance.suggestions,
      referenceRuntimeGuidance.suggestions,
    ]);
    expect(acceptedSuggestionsByFixture.get("benchmark-shared-shell-web")).toEqual([
      sharedShellRuntimeGuidance.suggestions,
      sharedShellRuntimeGuidance.suggestions,
    ]);
  });

  it("lets explicit fixture profile guidance override baseline-derived suggestions by finding code", async () => {
    const fixtureId = "benchmark-shared-shell-web";
    await seedBenchmarkSandboxDependencies(workspaceRoot, [fixtureId]);
    await seedBenchmarkContracts(workspaceRoot, [fixtureId]);
    installBenchmarkCliMocks({
      workspaceRoot,
      baselineFindingsByFixtureId: {
        "benchmark-shared-shell-web": [
          {
            code: "section.missing",
            message: "Missing required sections: reports.metrics.",
          },
          {
            code: "motion.none-detected",
            message: "No motion declarations detected for surface \"benchmark-shared-shell-web\".",
            location: { file: "", line: 0 },
          },
        ],
      },
      repairMapByFixtureId: {
        "benchmark-shared-shell-web": [
          {
            code: "section.missing",
            action: {
              type: "ensure-required-sections",
              sectionIds: ["reports.metrics"],
            },
          },
        ],
      },
    });
    mockedLocalLlm.runLocalLlmAgent.mockImplementation(async () => ({
      transcript: [],
      touchedFiles: ["apps/benchmark-shared-shell-web/app/reports/page.tsx"],
      summary: "Applied override guidance.",
      noChanges: false,
      agentInput: "System:\nBenchmark override",
      toolCallCount: 1,
      writeCount: 1,
      lastToolName: "finish",
    }));

    const result = await runBenchmarkCohort({
      cohortId: "20260315011500",
      fixtureIds: [fixtureId],
      strategies: ["prompt-summary", "json-primary"],
      profilesByFixtureId: {
        "benchmark-shared-shell-web": {
          ...getBenchmarkFixtureProfile(fixtureId),
          acceptedSuggestions: [
            buildAcceptedSuggestion({
              findingCode: "section.missing",
              findingMessage: "Missing required sections: reports.metrics.",
              summary: "Use the explicit shared-shell override for the reports metrics section.",
              suggestedPath: "apps/benchmark-shared-shell-web/app/reports/page.tsx",
              sourceRunId: "profile-seed",
              acceptedAt: "2026-03-15T01:15:00.000Z",
            }),
            buildAcceptedSuggestion({
              findingCode: "custom.profile-guidance",
              findingMessage: "Profile-only guidance.",
              summary: "Apply the profile-only shared-shell guidance entry.",
              suggestedPath: "apps/benchmark-shared-shell-web/app/_components/shared-shell.tsx",
              sourceRunId: "profile-seed",
              acceptedAt: "2026-03-15T01:15:00.000Z",
            }),
          ],
        },
      },
    });

    const runtimeGuidance = JSON.parse(
      await fs.readFile(
        path.join(result.benchmarkDir, "fixtures", fixtureId, "accepted-suggestions.runtime.json"),
        "utf8",
      ),
    ) as { suggestions: LocalWorkbenchAcceptedSuggestion[] };

    expect(runtimeGuidance.suggestions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          findingCode: "motion.none-detected",
          sourceRunId: "20260315011500/baseline-seed",
        }),
        expect.objectContaining({
          findingCode: "section.missing",
          summary: "Use the explicit shared-shell override for the reports metrics section.",
          suggestedPath: "apps/benchmark-shared-shell-web/app/reports/page.tsx",
          sourceRunId: "profile-seed",
        }),
        expect.objectContaining({
          findingCode: "custom.profile-guidance",
          summary: "Apply the profile-only shared-shell guidance entry.",
          suggestedPath: "apps/benchmark-shared-shell-web/app/_components/shared-shell.tsx",
          sourceRunId: "profile-seed",
        }),
      ]),
    );
    expect(runtimeGuidance.suggestions.filter((suggestion) => suggestion.findingCode === "section.missing")).toHaveLength(1);
  });
});
