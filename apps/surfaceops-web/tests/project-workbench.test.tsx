import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ProjectWorkbench } from "@/app/contracts/governance/_components/project-workbench";
import type { ProjectWorkspaceData } from "@/lib/contract-workbench/types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
    push: vi.fn(),
  }),
}));

const ONE_PIXEL_PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4////fwAJ+wP9KobjigAAAABJRU5ErkJggg==";

function buildWorkspaceData(): ProjectWorkspaceData {
  return {
    project: {
      workspaceId: "ws-test",
      projectId: "proj-123",
      name: "SurfaceOps Demo",
      githubOwner: "Surfaces-Platform",
      githubRepo: "surfaces-webapps",
      githubDefaultBranch: "main",
      contractPath: "contracts/surfaces.web.contract.json",
      surfaces: [
        { id: "surfaces-web", label: "Surfaces Web", implementationBrief: "Implement the core marketing surface." },
      ],
      previewTargets: [
        {
          surfaceId: "surfaces-web",
          url: "https://preview.example.com",
          authSessionKey: "preview-default",
        },
      ],
      createdAt: "2026-03-13T00:00:00.000Z",
      updatedAt: "2026-03-13T00:05:00.000Z",
      latestRunId: "run-123",
      latestPublishId: null,
    },
    draft: {
      text: "{\n  \"contractId\": \"surfaces.web\"\n}\n",
      sha256: "a".repeat(64),
      updatedAt: "2026-03-13T00:05:00.000Z",
    },
    selectedSurfaceId: "surfaces-web",
    selectedRunId: "run-123",
    selectedPanel: "compare",
    attemptView: "latest",
    runs: [
      {
        workspaceId: "ws-test",
        projectId: "proj-123",
        runId: "run-123",
        surfaceId: "surfaces-web",
        status: "succeeded",
        tool: "codex",
        baseBranch: "main",
        baselineBranch: "surfaceops-baseline",
        guidedBranch: "surfaceops-guided",
        previewUrl: "https://preview.example.com",
        artifactRootRef: "ws-test/proj-123/runs/run-123/benchmark",
        summaryJson: { overall: { surfacesMeetingGoal: 1, surfaceCount: 1 } },
        errorMessage: null,
        createdAt: "2026-03-13T00:10:00.000Z",
        updatedAt: "2026-03-13T00:12:00.000Z",
        completedAt: "2026-03-13T00:12:00.000Z",
      },
    ],
    publishes: [],
    surfaces: [
      { id: "surfaces-web", label: "Surfaces Web", implementationBrief: "Implement the core marketing surface." },
    ],
    previewTargets: [
      {
        surfaceId: "surfaces-web",
        url: "https://preview.example.com",
        authSessionKey: "preview-default",
      },
    ],
    selectedRunWorkbench: {
      benchmarksDir: "/tmp/benchmarks",
      benchmarkId: "run-123",
      benchmarkDir: "/tmp/benchmarks/run-123",
      report: {
        generatedAt: "2026-03-13T00:12:00.000Z",
        comparisons: [],
        suggestions: [],
        overall: {
          surfaceCount: 1,
          surfacesMeetingGoal: 1,
          guidedFewerFirstAttemptBlockingFindings: 1,
          guidedReachedAcceptableNoLater: 1,
          acceptedSuggestionCount: 0,
          rejectedSuggestionCount: 0,
          proposedSuggestionCount: 1,
        },
      },
      surfaces: [],
      selectedSurfaceId: "surfaces-web",
      attemptView: "latest",
      comparison: {
        surfaceId: "surfaces-web",
        tool: "codex",
        brief: { sha256: "b".repeat(64), baselinePath: "/tmp/baseline.md", guidedPath: "/tmp/guided.md" },
        baseline: {
          sessionId: "baseline",
          sessionDir: "/tmp/baseline",
          guidanceMode: "unguided",
          attemptCount: 1,
          firstAcceptableAttempt: 1,
          latestOutcome: "accepted-warn",
          firstAttempt: {
            attemptNumber: 1,
            status: "warn",
            outcome: "accepted-warn",
            findingCount: 2,
            blockingFindingCount: 1,
            warningFindingCount: 1,
            findingCodes: ["layout.mismatch"],
            assessment: { structure: "partial", components: "partial", boundary: "partial", visual: "partial", responsiveness: "partial", notes: "Baseline" },
            preview: { imagePath: "/tmp/baseline.png", metadataPath: "/tmp/baseline.json", url: "https://preview.example.com", finalUrl: "https://preview.example.com", capturedAt: "2026-03-13T00:11:00.000Z" },
          },
          latestAttempt: {
            attemptNumber: 1,
            status: "warn",
            outcome: "accepted-warn",
            findingCount: 2,
            blockingFindingCount: 1,
            warningFindingCount: 1,
            findingCodes: ["layout.mismatch"],
            assessment: { structure: "partial", components: "partial", boundary: "partial", visual: "partial", responsiveness: "partial", notes: "Baseline" },
            preview: { imagePath: "/tmp/baseline.png", metadataPath: "/tmp/baseline.json", url: "https://preview.example.com", finalUrl: "https://preview.example.com", capturedAt: "2026-03-13T00:11:00.000Z" },
          },
          recurringFindingCodes: [],
          recurringRepairCodes: [],
        },
        guided: {
          sessionId: "guided",
          sessionDir: "/tmp/guided",
          guidanceMode: "prepared",
          attemptCount: 1,
          firstAcceptableAttempt: 1,
          latestOutcome: "pass",
          firstAttempt: {
            attemptNumber: 1,
            status: "pass",
            outcome: "pass",
            findingCount: 0,
            blockingFindingCount: 0,
            warningFindingCount: 0,
            findingCodes: [],
            assessment: { structure: "strong", components: "strong", boundary: "strong", visual: "strong", responsiveness: "strong", notes: "Guided" },
            preview: { imagePath: "/tmp/guided.png", metadataPath: "/tmp/guided.json", url: "https://preview.example.com", finalUrl: "https://preview.example.com", capturedAt: "2026-03-13T00:11:30.000Z" },
          },
          latestAttempt: {
            attemptNumber: 1,
            status: "pass",
            outcome: "pass",
            findingCount: 0,
            blockingFindingCount: 0,
            warningFindingCount: 0,
            findingCodes: [],
            assessment: { structure: "strong", components: "strong", boundary: "strong", visual: "strong", responsiveness: "strong", notes: "Guided" },
            preview: { imagePath: "/tmp/guided.png", metadataPath: "/tmp/guided.json", url: "https://preview.example.com", finalUrl: "https://preview.example.com", capturedAt: "2026-03-13T00:11:30.000Z" },
          },
          recurringFindingCodes: [],
          recurringRepairCodes: [],
        },
        delta: {
          firstAttemptVerdict: { baseline: "warn", guided: "pass" },
          firstAttemptFindingCountDelta: -2,
          firstAttemptBlockingFindingCountDelta: -1,
          firstAttemptWarningFindingCountDelta: -1,
          latestFindingCountDelta: -2,
          attemptsToAcceptableOutcome: { baseline: 1, guided: 1, delta: 0 },
          rubric: {},
        },
        checks: {
          guidedFewerFirstAttemptBlockingFindings: true,
          guidedReachedAcceptableNoLater: true,
          guidedRubricAtLeastAsGood: true,
          guidedRubricBetterDimensions: ["components", "visual"],
          meetsGoal: true,
        },
        paths: {
          baselineSessionDir: "/tmp/baseline",
          guidedSessionDir: "/tmp/guided",
        },
      },
      selectedAttemptSnapshots: {
        baseline: {
          attemptNumber: 1,
          status: "warn",
          outcome: "accepted-warn",
          findingCount: 2,
          blockingFindingCount: 1,
          warningFindingCount: 1,
          findingCodes: ["layout.mismatch"],
          assessment: { structure: "partial", components: "partial", boundary: "partial", visual: "partial", responsiveness: "partial", notes: "Baseline" },
          preview: { imagePath: "/tmp/baseline.png", metadataPath: "/tmp/baseline.json", url: "https://preview.example.com", finalUrl: "https://preview.example.com", capturedAt: "2026-03-13T00:11:00.000Z" },
        },
        guided: {
          attemptNumber: 1,
          status: "pass",
          outcome: "pass",
          findingCount: 0,
          blockingFindingCount: 0,
          warningFindingCount: 0,
          findingCodes: [],
          assessment: { structure: "strong", components: "strong", boundary: "strong", visual: "strong", responsiveness: "strong", notes: "Guided" },
          preview: { imagePath: "/tmp/guided.png", metadataPath: "/tmp/guided.json", url: "https://preview.example.com", finalUrl: "https://preview.example.com", capturedAt: "2026-03-13T00:11:30.000Z" },
        },
      },
      baselineSummary: {
        surfaceId: "surfaces-web",
        sessionId: "baseline",
        tool: "codex",
        guidanceMode: "unguided",
        attemptCount: 1,
        firstPassAttempt: null,
        firstAcceptableAttempt: 1,
        latestStatus: "warn",
        latestOutcome: "accepted-warn",
        latestAssessment: { structure: "partial", components: "partial", boundary: "partial", visual: "partial", responsiveness: "partial", notes: "Baseline" },
        latestReview: { status: "accepted", rationale: "Accepted", findingCodes: ["layout.mismatch"] },
        paths: { sessionPath: "/tmp/baseline/session.json", bundleRoot: "/tmp/bundle", preparedInputPath: null },
        attempts: [],
      },
      guidedSummary: {
        surfaceId: "surfaces-web",
        sessionId: "guided",
        tool: "codex",
        guidanceMode: "prepared",
        attemptCount: 1,
        firstPassAttempt: 1,
        firstAcceptableAttempt: 1,
        latestStatus: "pass",
        latestOutcome: "pass",
        latestAssessment: { structure: "strong", components: "strong", boundary: "strong", visual: "strong", responsiveness: "strong", notes: "Guided" },
        latestReview: null,
        paths: { sessionPath: "/tmp/guided/session.json", bundleRoot: "/tmp/bundle", preparedInputPath: "/tmp/prepared.json" },
        attempts: [],
      },
      guidedPrepared: {
        summary: {
          text: "Prepared guidance summary for surfaces-web.",
          focusOrder: ["boundary", "sections"],
          requiredSectionIds: ["landing.hero"],
          checklist: [],
        },
      },
      suggestions: {
        suggestions: [
          {
            suggestionId: "suggest-1",
            findingCode: "layout.mismatch",
            findingMessage: "Layout still drifts at the page frame.",
            status: "proposed",
            confidence: 0.82,
            repeatedFailureCount: 2,
            repair: { priority: "high", category: "layout", actionType: "tighten" },
            proposedChange: {
              path: "surfaces[0].layout.pageFrame",
              actionType: "update",
              summary: "Tighten page frame guidance.",
              valueHints: ["maxWidthPx: 1280"],
            },
          },
        ],
      },
      briefText: "Build the updated surface.",
      previews: {
        baseline: { dataUrl: ONE_PIXEL_PNG, ref: { imagePath: "/tmp/baseline.png", metadataPath: "/tmp/baseline.json", url: "https://preview.example.com", finalUrl: "https://preview.example.com", capturedAt: "2026-03-13T00:11:00.000Z" } },
        guided: { dataUrl: ONE_PIXEL_PNG, ref: { imagePath: "/tmp/guided.png", metadataPath: "/tmp/guided.json", url: "https://preview.example.com", finalUrl: "https://preview.example.com", capturedAt: "2026-03-13T00:11:30.000Z" } },
      },
      timelines: {
        baseline: [{ attemptNumber: 1, status: "warn", outcome: "accepted-warn", findingCodes: ["layout.mismatch"], notes: "Baseline", touchedFiles: ["app/page.tsx"] }],
        guided: [{ attemptNumber: 1, status: "pass", outcome: "pass", findingCodes: [], notes: "Guided", touchedFiles: ["app/page.tsx"] }],
      },
    },
    selectedRunSuggestionsPath: "/tmp/suggestions.json",
    hasStoredAuthSession: true,
  };
}

describe("ProjectWorkbench", () => {
  it("renders the project workspace with editor, rerun controls, previews, suggestions, and history", () => {
    const html = renderToStaticMarkup(React.createElement(ProjectWorkbench, { data: buildWorkspaceData() }));
    expect(html).toContain("Contract workbench");
    expect(html).toContain("Run Codex rerun");
    expect(html).toContain("Current working copy");
    expect(html).toContain("Latest baseline vs guided run");
    expect(html).toContain("Accept + apply");
    expect(html).toContain("Runs and publishes");
  });
});
