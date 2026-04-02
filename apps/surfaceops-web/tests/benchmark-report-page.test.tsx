import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import BenchmarkReportPage from "@/app/benchmarks/[reportId]/page";
import type { BenchmarkReportDocument, BenchmarkReportListItem, BenchmarkReportRunEvidence, BenchmarkReportVisualizationData } from "@/lib/benchmark-report-docs";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("notFound");
  }),
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

const listBenchmarkReports = vi.fn();
const loadBenchmarkReport = vi.fn();

vi.mock("@/lib/benchmark-report-docs", () => ({
  listBenchmarkReports: (...args: unknown[]) => listBenchmarkReports(...args),
  loadBenchmarkReport: (...args: unknown[]) => loadBenchmarkReport(...args),
}));

function buildVisualization(): BenchmarkReportVisualizationData {
  return {
    summary: {
      comparisonCount: 1,
      meetsGoalCount: 1,
      guidedReachedAcceptableNoLaterCount: 1,
      guidedFewerFirstAttemptBlockingFindingsCount: 1,
      guidedRubricAtLeastAsGoodCount: 1,
    },
    rubric: {
      structure: { improved: 1, same: 0, regressed: 0 },
      components: { improved: 0, same: 1, regressed: 0 },
      boundary: { improved: 0, same: 1, regressed: 0 },
      visual: { improved: 1, same: 0, regressed: 0 },
      responsiveness: { improved: 0, same: 1, regressed: 0 },
      platformFit: { improved: 0, same: 1, regressed: 0 },
    },
    heuristics: {
      improvedCounts: {
        unresolvedAcceptedSuggestionRate: 1,
        noChangesAfterEditFailureCount: 1,
        recoverableToolErrorCount: 1,
        touchedFilesPerResolvedFinding: 0,
        repeatedFindingCarryoverCount: 0,
        rerunsToAcceptableOutcome: 1,
      },
      averageDelta: {
        unresolvedAcceptedSuggestionRate: -0.25,
        noChangesAfterEditFailureCount: -1,
        recoverableToolErrorCount: -2,
        touchedFilesPerResolvedFinding: 0,
        repeatedFindingCarryoverCount: 0,
        rerunsToAcceptableOutcome: -1,
      },
    },
    comparisons: [
      {
        surfaceId: "reference-target-web",
        baselineGuidanceStrategy: "prompt-summary",
        guidedGuidanceStrategy: "json-primary",
        meetsGoal: true,
        guidedReachedAcceptableNoLater: true,
        guidedFewerFirstAttemptBlockingFindings: true,
        guidedRubricAtLeastAsGood: true,
        guidedRubricBetterDimensions: ["visual"],
        firstAttemptFindingCountDelta: -1,
        firstAttemptBlockingFindingCountDelta: -1,
        attemptsToAcceptableOutcomeDelta: -1,
        rubric: {
          structure: { baseline: "partial", guided: "partial", delta: 0 },
          components: { baseline: "partial", guided: "partial", delta: 0 },
          boundary: { baseline: "partial", guided: "partial", delta: 0 },
          visual: { baseline: "partial", guided: "strong", delta: 1 },
          responsiveness: { baseline: "partial", guided: "partial", delta: 0 },
          platformFit: { baseline: "partial", guided: "partial", delta: 0 },
        },
        heuristics: {
          unresolvedAcceptedSuggestionRate: -0.25,
          noChangesAfterEditFailureCount: -1,
          recoverableToolErrorCount: -2,
          touchedFilesPerResolvedFinding: 0,
          repeatedFindingCarryoverCount: 0,
          rerunsToAcceptableOutcome: -1,
        },
      },
    ],
  };
}

function buildListItem(overrides: Partial<BenchmarkReportListItem> = {}): BenchmarkReportListItem {
  return {
    id: "run-20260315060000",
    source: "artifact",
    sourceLabel: "Run",
    sourceId: "20260315060000",
    fileName: "benchmark-report.md",
    filePath: "/tmp/benchmark-report.md",
    title: "Benchmark Run 20260315060000",
    summary: "reference-target-web · prompt-summary vs json-primary",
    dateLabel: "March 15, 2026",
    generatedAt: "2026-03-15T06:00:00.000Z",
    ...overrides,
  };
}

function buildEvidence(): BenchmarkReportRunEvidence {
  return {
    cohortId: "20260315060000",
    evaluationMode: "zero-shot",
    tool: "local-llm",
    sourceSpecPath: "/tmp/spec.json",
    sourceRunPath: null,
    guidanceStrategies: ["unguided", "baseline-primary", "json-primary"],
    attemptBudget: 1,
    model: {
      requestedModelLabel: "gpt-oss-120b",
      resolvedModelId: "openai/gpt-oss-120b",
      baseUrl: "http://127.0.0.1:1234/v1",
      fingerprint: "fingerprint",
    },
    fixtures: [
      {
        fixtureId: "reference-target-web",
        surfaceId: "reference-target-web",
        platformTarget: "web",
        consumerType: "web-browser",
        capturePreset: "web-browser",
        brief: {
          path: "/tmp/implementation-brief.md",
          sha256: "brief-hash",
          text: "Benchmark prompt body.",
        },
        contracts: [],
        inputs: [],
        sessions: [
          {
            guidanceStrategy: "unguided",
            sessionId: "run/unguided",
            latestStatus: "warn",
            latestOutcome: "warn",
            summaryPath: "/tmp/summary.json",
            guidanceHandoffPath: "/tmp/guidance.json",
            guidanceHandoffText: "{\"surface\":\"reference-target-web\"}",
            agentInputPath: "/tmp/agent-input.txt",
            agentInputText: "Implement the zero-shot surface.",
            preview: null,
          },
        ],
        comparisons: [
          {
            baselineGuidanceStrategy: "unguided",
            guidedGuidanceStrategy: "json-primary",
            comparisonPath: "/tmp/comparison.json",
          },
        ],
      },
    ],
  };
}

function buildDocument(overrides: Partial<BenchmarkReportDocument> = {}): BenchmarkReportDocument {
  return {
    ...buildListItem(),
    markdown: "# Generation Benchmark Report\n\nBody copy.\n",
    visualization: buildVisualization(),
    evidence: buildEvidence(),
    ...overrides,
  };
}

describe("BenchmarkReportPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the top selector pattern and live benchmark visualization above the markdown body", async () => {
    const reports = [
      buildListItem(),
      buildListItem({
        id: "archive-2026-03-15-surfaceops-expanded-benchmark-rerun",
        source: "archive",
        sourceLabel: "Archive",
        sourceId: "2026-03-15-surfaceops-expanded-benchmark-rerun",
        title: "2026-03-15 - SurfaceOps Expanded Benchmark Rerun",
        summary: "Archived summary.",
        fileName: "2026-03-15-surfaceops-expanded-benchmark-rerun.md",
      }),
    ];
    listBenchmarkReports.mockReturnValue(reports);
    loadBenchmarkReport.mockReturnValue(buildDocument());

    const view = await BenchmarkReportPage({
      params: Promise.resolve({ reportId: "run-20260315060000" }),
    });
    const html = renderToStaticMarkup(view);

    expect(html).toContain("Choose report");
    expect(html).toContain("SurfaceOps benchmark archive");
    expect(html).toContain("data-testid=\"benchmark-report-visualization\"");
    expect(html).toContain("data-testid=\"benchmark-report-evidence\"");
    expect(html).toContain("Comparison snapshot");
    expect(html).toContain("Run prompt, contract, and screenshot evidence");
    expect(html).toContain("gpt-oss-120b");
    expect(html).toContain("Generation Benchmark Report");
  });

  it("omits the visualization block for archive markdown reports", async () => {
    const archiveReport = buildDocument({
      id: "archive-2026-03-15-surfaceops-expanded-benchmark-rerun",
      source: "archive",
      sourceLabel: "Archive",
      sourceId: "2026-03-15-surfaceops-expanded-benchmark-rerun",
      title: "2026-03-15 - SurfaceOps Expanded Benchmark Rerun",
      fileName: "2026-03-15-surfaceops-expanded-benchmark-rerun.md",
      visualization: null,
      evidence: null,
    });
    listBenchmarkReports.mockReturnValue([buildListItem(), archiveReport]);
    loadBenchmarkReport.mockReturnValue(archiveReport);

    const view = await BenchmarkReportPage({
      params: Promise.resolve({ reportId: archiveReport.id }),
    });
    const html = renderToStaticMarkup(view);

    expect(html).not.toContain("data-testid=\"benchmark-report-visualization\"");
    expect(html).not.toContain("data-testid=\"benchmark-report-evidence\"");
    expect(html).toContain("Generation Benchmark Report");
  });
});
