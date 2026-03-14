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
  startLocalWorkbenchRerun,
  suggestionSummaryFromRun,
  unresolvedAcceptedSuggestionCodes,
  unresolvedAcceptedSuggestionNoopErrorMessage,
} from "@/lib/local-workbench/service";
import type { LocalWorkbenchAcceptedSuggestion, LocalWorkbenchRun } from "@/lib/local-workbench/types";

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
      transcriptPath: "/tmp/surfaceops-local-runs/reference-target-web/runs/20260313225854/agent-trace.json",
      touchedFiles: ["apps/reference-target-web/app/globals.css"],
      errorMessage: null,
      effectiveContractPath: null,
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
      transcriptPath: "/tmp/surfaceops-local-runs/reference-target-web/runs/20260313233524/agent-trace.json",
      touchedFiles: ["apps/reference-target-web/app/globals.css"],
      errorMessage: null,
      effectiveContractPath: null,
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
});
