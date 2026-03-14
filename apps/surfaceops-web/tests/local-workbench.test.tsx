import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { LocalWorkbench } from "@/app/contracts/governance/_components/local-workbench";
import type { LocalWorkbenchData, LocalWorkbenchRun } from "@/lib/local-workbench/types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

function buildRun(overrides: Partial<LocalWorkbenchRun> = {}): LocalWorkbenchRun {
  return {
    runId: "20260314091904",
    status: "succeeded",
    createdAt: "2026-03-14T16:19:04.000Z",
    completedAt: "2026-03-14T16:19:27.000Z",
    latestRunLabel: "Run 20260314",
    model: "openai/gpt-oss-120b",
    currentPhase: null,
    phaseHistory: [],
    agentSummary: null,
    noChanges: false,
    toolCallCount: 2,
    writeCount: 1,
    lastToolName: "finish",
    lastError: null,
    transcriptPath: null,
    touchedFiles: ["apps/reference-target-web/app/globals.css"],
    errorMessage: null,
    effectiveContractPath: "/tmp/surfaceops-local-runs/reference-target-web/runs/20260314091904/effective-contract.json",
    agentInputPath: "/tmp/surfaceops-local-runs/reference-target-web/runs/20260314091904/agent-input.txt",
    explainabilityPath: "/tmp/surfaceops-local-runs/reference-target-web/runs/20260314091904/explainability.json",
    baselinePreview: { path: null, dataUrl: null },
    currentPreview: { path: null, dataUrl: null },
    baselineSummaryPath: null,
    currentSummaryPath: null,
    suggestionsPath: null,
    comparison: null,
    suggestions: [],
    ...overrides,
  };
}

function buildData(overrides: Partial<LocalWorkbenchData> = {}): LocalWorkbenchData {
  return {
    enabled: true,
    runRoot: "/tmp/surfaceops-local-runs/reference-target-web",
    target: {
      id: "reference-target-web",
      label: "Reference Target Web",
      appRoot: "/repo/apps/reference-target-web",
      contractPath: "/repo/contracts/generated/reference-target-web.contract.json",
      implementationBrief: "Refine the reference target UI to better match the contract-guided surface.",
    },
    contract: {
      contractId: "reference-target-web.generated",
      version: "0.1.0",
      description: "Generated fixture contract.",
      requiredSections: ["landing.hero", "landing.capabilities"],
      allowedFonts: ["Inter", "sans-serif"],
      maxContentWidth: 1160,
      colorPolicy: "warn",
    },
    latestRun: null,
    runs: [],
    activeAcceptedSuggestions: [],
    latestRunOperatorNote: null,
    activeContractChanges: [],
    activeDesignerNotes: [],
    latestRunAgentInput: {
      path: null,
      content: null,
    },
    chat: [
      {
        id: "contract-summary",
        role: "system",
        title: "Working contract",
        content: "reference-target-web.generated v0.1.0",
        createdAt: "1970-01-01T00:00:00.000Z",
      },
      {
        id: "empty-chat",
        role: "assistant",
        title: "Contract shaper",
        content: "Send a designer instruction to shape the working contract before the next rerun.",
        createdAt: "2026-03-13T21:00:00.000Z",
      },
    ],
    localModel: {
      configured: true,
      baseUrl: "http://127.0.0.1:1234/v1",
      model: "openai/gpt-oss-120b",
    },
    ...overrides,
  };
}

describe("LocalWorkbench", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the decision-first controls shell and hides empty secondary sections", () => {
    const newestRun = buildRun({
      comparison: {
        baselineStatus: "warn",
        currentStatus: "pass",
        baselineFindingCount: 2,
        currentFindingCount: 0,
        baselineBlockingCount: 0,
        currentBlockingCount: 0,
        findingCountDelta: -2,
        blockingCountDelta: 0,
        newFindingCodes: [],
        resolvedFindingCodes: ["motion.none-detected", "token.normalization-skipped"],
      },
    });
    const olderRuns = [
      buildRun({ runId: "20260313090000", latestRunLabel: "Run 20260313", createdAt: "2026-03-13T16:19:04.000Z" }),
      buildRun({ runId: "20260312090000", latestRunLabel: "Run 20260312", createdAt: "2026-03-12T16:19:04.000Z" }),
      buildRun({ runId: "20260311090000", latestRunLabel: "Run 20260311", createdAt: "2026-03-11T16:19:04.000Z" }),
    ];

    const html = renderToStaticMarkup(React.createElement(LocalWorkbench, {
      data: buildData({
        latestRun: newestRun,
        runs: [newestRun, ...olderRuns],
      }),
    }));

    expect(html).toContain("Latest result");
    expect(html).toContain("Next action");
    expect(html).toContain("Evidence summary");
    expect(html).toContain("Technical context");
    expect(html).toContain("Recent runs");
    expect(html).toContain("Open all runs");
    expect(html).toContain("trace");
    expect(html).toContain("Inspect trace");
    expect(html).toContain("Preview unavailable");
    expect(html).not.toContain("Current state");
    expect(html).not.toContain("History");
    expect(html).not.toContain("Guidance");
    expect(html).toContain("Run 20260314");
    expect(html).toContain("Run 20260313");
    expect(html).toContain("Run 20260312");
    expect(html).not.toContain("Run 20260311");
    expect((html.match(/data-testid="local-workbench-recent-run"/g) ?? [])).toHaveLength(3);
  });

  it("renders accepted guidance and open suggestions when they affect the next pass", () => {
    const failedRun = buildRun({
      status: "failed",
      errorMessage: "Local model reported noChanges=true but accepted suggestions remain unresolved: motion.none-detected",
      transcriptPath: "/tmp/surfaceops-local-runs/reference-target-web/runs/20260313210218/agent-trace.json",
      comparison: {
        baselineStatus: "pass",
        currentStatus: "block",
        baselineFindingCount: 0,
        currentFindingCount: 1,
        baselineBlockingCount: 0,
        currentBlockingCount: 1,
        findingCountDelta: 1,
        blockingCountDelta: 1,
        newFindingCodes: ["motion.none-detected"],
        resolvedFindingCodes: [],
      },
      suggestions: [
        {
          suggestionId: "suggestion-1",
          findingCode: "motion.none-detected",
          findingMessage: "No motion declarations detected.",
          summary: "Add contract-compliant motion declarations.",
          suggestedPath: "apps/reference-target-web/app/page.tsx",
          status: "proposed",
          rationale: "Add a bounded motion token the validator can observe.",
        },
      ],
    });

    const html = renderToStaticMarkup(React.createElement(LocalWorkbench, {
      data: buildData({
        latestRun: failedRun,
        runs: [failedRun],
        activeAcceptedSuggestions: [
          {
            findingCode: "motion.none-detected",
            findingMessage: "No motion declarations detected.",
            summary: "Add contract-compliant motion declarations.",
            suggestedPath: "apps/reference-target-web/app/page.tsx",
            sourceRunId: "20260313210000",
            acceptedAt: "2026-03-13T21:24:00.000Z",
          },
        ],
      }),
    }));

    expect(html).toContain("Run failed");
    expect(html).toContain("Latest result");
    expect(html).toContain("Next action");
    expect(html).toContain("Guidance");
    expect(html).toContain("Accepted guidance");
    expect(html).toContain("Open suggestions");
    expect(html).toContain("Add contract-compliant motion declarations.");
    expect(html).toContain("accepted suggestions remain unresolved");
    expect(html).not.toContain("Accepted guidance active");
  });

  it("renders trace inspection around the selected run without replacing the controls shell", () => {
    const tracedRun = buildRun({
      currentPhase: "current-preview",
      phaseHistory: [
        {
          phase: "compile",
          status: "succeeded",
          startedAt: "2026-03-14T16:19:04.000Z",
          completedAt: "2026-03-14T16:19:06.000Z",
          message: "Compiled successfully.",
        },
        {
          phase: "current-preview",
          status: "failed",
          startedAt: "2026-03-14T16:19:20.000Z",
          completedAt: "2026-03-14T16:19:27.000Z",
          message: "Preview server exited before screenshot capture.",
        },
      ],
      agentSummary: "Patched the hero shell and retried preview capture.",
      writeCount: 2,
      lastToolName: "screenshot_preview",
      lastError: {
        phase: "current-preview",
        message: "Preview server exited before screenshot capture.",
      },
    });

    const html = renderToStaticMarkup(React.createElement(LocalWorkbench, {
      data: buildData({
        latestRun: tracedRun,
        runs: [tracedRun],
      }),
      initialTab: "trace",
    }));

    expect(html).toContain("Trace summary");
    expect(html).toContain("Phase timeline");
    expect(html).toContain("Preview debug");
    expect(html).toContain("Last tool activity");
    expect(html).toContain("Run history");
    expect(html).toContain("Preview server exited before screenshot capture.");
    expect(html).toContain("Tool calls: 2");
    expect(html).toContain("Writes: 2");
  });

  it("keeps chat primary and hides implementation debug behind a collapsed section", () => {
    const html = renderToStaticMarkup(React.createElement(LocalWorkbench, {
      data: buildData({
        activeContractChanges: [
          {
            id: "change-1",
            field: "color.allowedValues",
            action: "add",
            value: "#8BAE3F",
            summary: "Allow color #8BAE3F in the working contract.",
            createdAt: "2026-03-13T21:00:00.000Z",
            sourceMessageId: "user-1",
          },
        ],
        activeDesignerNotes: [
          {
            id: "note-1",
            content: "Edge-to-edge layout intent should be preserved.",
            createdAt: "2026-03-13T21:00:00.000Z",
            sourceMessageId: "user-1",
          },
        ],
        latestRunAgentInput: {
          path: "/tmp/surfaceops-local-runs/reference-target-web/runs/20260313210000/agent-input.txt",
          content: "System:\nEffective working contract:\nMax content width: 2000",
        },
        chat: [
          {
            id: "contract-summary",
            role: "system",
            title: "Working contract",
            content: "reference-target-web.generated v0.1.0",
            createdAt: "1970-01-01T00:00:00.000Z",
          },
          {
            id: "user-1",
            role: "user",
            title: "Designer",
            content: "go edge-to-edge, max 2000px",
            createdAt: "2026-03-13T21:00:00.000Z",
          },
          {
            id: "assistant-1",
            role: "assistant",
            title: "Contract shaper",
            content: "Applied: Set max content width to 2000px. Designer notes: Edge-to-edge layout intent should be preserved.",
            createdAt: "2026-03-13T21:00:01.000Z",
          },
        ],
      }),
      initialTab: "chat",
    }));

    expect(html).toContain("Designer chat");
    expect(html).toContain("Send to contract shaper");
    expect(html).toContain("Active contract changes");
    expect(html).toContain("Captured designer notes");
    expect(html).toContain("Edge-to-edge layout intent should be preserved.");
    expect(html).toContain("Implementation debug");
    expect(html).toContain("Max content width: 2000");
    expect(html).not.toContain("Latest regeneration agent input");
  });

  it("prioritizes operator-note messaging when the latest run still needs another pass", () => {
    const html = renderToStaticMarkup(React.createElement(LocalWorkbench, {
      data: buildData({
        latestRun: buildRun(),
        latestRunOperatorNote:
          "The last rerun changed files, but the validator still did not observe any real motion declarations.",
      }),
    }));

    expect(html).toContain("Patch needed");
    expect(html).toContain("Needs another patch");
    expect(html).toContain("Next action");
    expect(html).not.toContain("Run failed");
  });

  it("promotes model readiness into the primary decision area when the local model is unavailable", () => {
    const html = renderToStaticMarkup(React.createElement(LocalWorkbench, {
      data: buildData({
        localModel: {
          configured: false,
          baseUrl: null,
          model: null,
        },
      }),
    }));

    expect(html).toContain("Setup required");
    expect(html).toContain("Set SURFACEOPS_LOCAL_LLM_BASE_URL and SURFACEOPS_LOCAL_LLM_MODEL to enable reruns.");
    expect(html).toContain("Next action");
    expect(html).toContain("Refine in chat");
  });
});
