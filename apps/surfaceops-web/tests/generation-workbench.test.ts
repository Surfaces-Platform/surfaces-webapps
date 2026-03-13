import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import { BenchmarkWorkbench } from "@/app/contracts/governance/_components/benchmark-workbench";
import {
  listGenerationBenchmarks,
  loadGenerationWorkbench,
  loadLatestBenchmarkId,
} from "@/lib/generation-benchmarks";

const ONE_PIXEL_PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4////fwAJ+wP9KobjigAAAABJRU5ErkJggg==";

async function writeJson(filePath: string, value: unknown) {
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  await fsp.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function writeText(filePath: string, value: string) {
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  await fsp.writeFile(filePath, value, "utf8");
}

async function writePng(filePath: string) {
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  await fsp.writeFile(filePath, Buffer.from(ONE_PIXEL_PNG, "base64"));
}

async function createBenchmarkFixture(rootDir: string, benchmarkId: string, generatedAt: string) {
  const benchmarkDir = path.join(rootDir, benchmarkId);
  const reportPath = path.join(benchmarkDir, "report", "benchmark-report.json");
  const comparisonPath = path.join(benchmarkDir, "comparisons", "reference-target-web", "comparison.json");
  const secondComparisonPath = path.join(benchmarkDir, "comparisons", "surfaces-web", "comparison.json");
  const suggestionsPath = path.join(benchmarkDir, "suggestions", "reference-target-web.reviewed.json");
  const secondSuggestionsPath = path.join(benchmarkDir, "suggestions", "surfaces-web.reviewed.json");
  const baselineSessionDir = path.join(benchmarkDir, "sessions", "reference-target-web", "baseline");
  const guidedSessionDir = path.join(benchmarkDir, "sessions", "reference-target-web", "guided");
  const secondBaselineSessionDir = path.join(benchmarkDir, "sessions", "surfaces-web", "baseline");
  const secondGuidedSessionDir = path.join(benchmarkDir, "sessions", "surfaces-web", "guided");

  for (const [sessionDir, surfaceId] of [
    [baselineSessionDir, "reference-target-web"],
    [guidedSessionDir, "reference-target-web"],
    [secondBaselineSessionDir, "surfaces-web"],
    [secondGuidedSessionDir, "surfaces-web"],
  ] as const) {
    const attemptsDir = path.join(sessionDir, "attempts");
    const previewPng = path.join(attemptsDir, "001.preview.png");
    const previewJson = path.join(attemptsDir, "001.preview.json");
    await writePng(previewPng);
    await writeJson(previewJson, {
      schemaVersion: 1,
      surfaceId,
      sessionId: path.basename(sessionDir),
      attemptNumber: 1,
      url: `http://localhost/${surfaceId}`,
      finalUrl: `http://localhost/${surfaceId}`,
      imagePath: previewPng,
      capturedAt: generatedAt,
      viewport: { width: 1440, height: 1024 },
    });
    await writeJson(path.join(attemptsDir, "001.assessment.json"), {
      structure: "strong",
      components: "strong",
      boundary: "strong",
      visual: "strong",
      responsiveness: "strong",
      notes: `${surfaceId} attempt one`,
      touchedFiles: [`apps/${surfaceId}/app/page.tsx`],
    });
    await writeJson(path.join(sessionDir, "summary.json"), {
      schemaVersion: 3,
      surfaceId,
      sessionId: path.basename(sessionDir),
      tool: "codex",
      guidanceMode: sessionDir.includes("guided") ? "prepared" : "unguided",
      attemptCount: 1,
      firstPassAttempt: null,
      firstAcceptableAttempt: 1,
      latestStatus: "warn",
      latestOutcome: "accepted-warn",
      recurringFindingCodes: [],
      recurringRepairCodes: [],
      latestAssessment: {
        structure: "strong",
        components: "strong",
        boundary: "strong",
        visual: "strong",
        responsiveness: "strong",
        notes: `${surfaceId} latest`,
      },
      latestReview: {
        schemaVersion: 1,
        surfaceId,
        sessionId: path.basename(sessionDir),
        attemptNumber: 1,
        status: "accepted",
        findingCodes: ["token.normalization-skipped"],
        rationale: "Accepted for benchmark display.",
        reviewedAt: generatedAt,
      },
      successRule: { finalStatus: "pass-or-reviewed-warn" },
      paths: {
        sessionPath: path.join(sessionDir, "session.json"),
        bundleRoot: path.join(sessionDir, "bundle"),
        preparedInputPath: sessionDir.includes("guided") ? path.join(sessionDir, "prepared-input.json") : null,
      },
      attempts: [
        {
          attemptNumber: 1,
          status: "warn",
          outcome: "accepted-warn",
          findingCodes: ["token.normalization-skipped"],
          validatePath: path.join(attemptsDir, "001.validate.json"),
          assessmentPath: path.join(attemptsDir, "001.assessment.json"),
          metadataPath: path.join(attemptsDir, "001.metadata.json"),
          reviewPath: path.join(attemptsDir, "001.review.json"),
          reviewStatus: "accepted",
          createdAt: generatedAt,
          preview: {
            imagePath: previewPng,
            metadataPath: previewJson,
            url: `http://localhost/${surfaceId}`,
            finalUrl: `http://localhost/${surfaceId}`,
            capturedAt: generatedAt,
          },
        },
      ],
    });
    await writeJson(path.join(sessionDir, "prepared-input.json"), {
      summary: {
        text: `Prepared summary for ${surfaceId}.`,
        focusOrder: ["boundary", "sections", "layout", "visual"],
        requiredSectionIds: ["landing.hero"],
        checklist: [
          {
            id: "sections",
            label: "Include every required section",
            detail: `Render landing.hero for ${surfaceId}.`,
          },
        ],
      },
    });
  }

  const comparison = {
    schemaVersion: 2,
    surfaceId: "reference-target-web",
    tool: "codex",
    brief: {
      sha256: "abc123",
      baselinePath: path.join(benchmarkDir, "briefs", "reference-target-web.baseline.md"),
      guidedPath: path.join(benchmarkDir, "briefs", "reference-target-web.guided.md"),
    },
    baseline: {
      sessionId: "baseline",
      sessionDir: baselineSessionDir,
      guidanceMode: "unguided",
      attemptCount: 1,
      firstAcceptableAttempt: 1,
      latestOutcome: "accepted-warn",
      firstAttempt: {
        attemptNumber: 1,
        status: "warn",
        outcome: "accepted-warn",
        findingCount: 1,
        blockingFindingCount: 0,
        warningFindingCount: 1,
        findingCodes: ["token.normalization-skipped"],
        assessment: {
          structure: "partial",
          components: "partial",
          boundary: "partial",
          visual: "partial",
          responsiveness: "partial",
          notes: "Baseline first attempt.",
        },
        preview: {
          imagePath: path.join(baselineSessionDir, "attempts", "001.preview.png"),
          metadataPath: path.join(baselineSessionDir, "attempts", "001.preview.json"),
          url: "http://localhost/reference-target-web",
          finalUrl: "http://localhost/reference-target-web",
          capturedAt: generatedAt,
        },
      },
      latestAttempt: {
        attemptNumber: 1,
        status: "warn",
        outcome: "accepted-warn",
        findingCount: 1,
        blockingFindingCount: 0,
        warningFindingCount: 1,
        findingCodes: ["token.normalization-skipped"],
        assessment: {
          structure: "partial",
          components: "partial",
          boundary: "partial",
          visual: "partial",
          responsiveness: "partial",
          notes: "Baseline latest attempt.",
        },
      },
      recurringFindingCodes: [],
      recurringRepairCodes: [],
    },
    guided: {
      sessionId: "guided",
      sessionDir: guidedSessionDir,
      guidanceMode: "prepared",
      attemptCount: 1,
      firstAcceptableAttempt: 1,
      latestOutcome: "accepted-warn",
      firstAttempt: {
        attemptNumber: 1,
        status: "warn",
        outcome: "accepted-warn",
        findingCount: 1,
        blockingFindingCount: 0,
        warningFindingCount: 1,
        findingCodes: ["token.normalization-skipped"],
        assessment: {
          structure: "strong",
          components: "strong",
          boundary: "strong",
          visual: "strong",
          responsiveness: "strong",
          notes: "Guided first attempt.",
        },
        preview: {
          imagePath: path.join(guidedSessionDir, "attempts", "001.preview.png"),
          metadataPath: path.join(guidedSessionDir, "attempts", "001.preview.json"),
          url: "http://localhost/reference-target-web-guided",
          finalUrl: "http://localhost/reference-target-web-guided",
          capturedAt: generatedAt,
        },
      },
      latestAttempt: {
        attemptNumber: 1,
        status: "warn",
        outcome: "accepted-warn",
        findingCount: 1,
        blockingFindingCount: 0,
        warningFindingCount: 1,
        findingCodes: ["token.normalization-skipped"],
        assessment: {
          structure: "strong",
          components: "strong",
          boundary: "strong",
          visual: "strong",
          responsiveness: "strong",
          notes: "Guided latest attempt.",
        },
      },
      recurringFindingCodes: [],
      recurringRepairCodes: [],
    },
    delta: {
      firstAttemptVerdict: { baseline: "accepted-warn", guided: "accepted-warn" },
      firstAttemptFindingCountDelta: 0,
      firstAttemptBlockingFindingCountDelta: -1,
      firstAttemptWarningFindingCountDelta: 0,
      latestFindingCountDelta: 0,
      attemptsToAcceptableOutcome: { baseline: 1, guided: 1, delta: 0 },
      rubric: {
        structure: { baseline: "partial", guided: "strong", delta: 1 },
        components: { baseline: "partial", guided: "strong", delta: 1 },
        boundary: { baseline: "partial", guided: "strong", delta: 1 },
        visual: { baseline: "partial", guided: "strong", delta: 1 },
        responsiveness: { baseline: "partial", guided: "strong", delta: 1 },
      },
    },
    checks: {
      guidedFewerFirstAttemptBlockingFindings: true,
      guidedReachedAcceptableNoLater: true,
      guidedRubricAtLeastAsGood: true,
      guidedRubricBetterDimensions: ["components", "visual"],
      meetsGoal: true,
    },
    paths: {
      baselineSessionDir,
      guidedSessionDir,
    },
  };

  const secondComparison = {
    ...comparison,
    surfaceId: "surfaces-web",
    brief: {
      sha256: "def456",
      baselinePath: path.join(benchmarkDir, "briefs", "surfaces-web.baseline.md"),
      guidedPath: path.join(benchmarkDir, "briefs", "surfaces-web.guided.md"),
    },
    baseline: {
      ...comparison.baseline,
      sessionDir: secondBaselineSessionDir,
    },
    guided: {
      ...comparison.guided,
      sessionDir: secondGuidedSessionDir,
    },
    paths: {
      baselineSessionDir: secondBaselineSessionDir,
      guidedSessionDir: secondGuidedSessionDir,
    },
  };

  await writeJson(comparisonPath, comparison);
  await writeJson(secondComparisonPath, secondComparison);
  await writeText(path.join(benchmarkDir, "briefs", "reference-target-web.guided.md"), "# Reference target guided\n");
  await writeText(path.join(benchmarkDir, "briefs", "reference-target-web.baseline.md"), "# Reference target baseline\n");
  await writeText(path.join(benchmarkDir, "briefs", "surfaces-web.guided.md"), "# Surfaces guided\n");
  await writeText(path.join(benchmarkDir, "briefs", "surfaces-web.baseline.md"), "# Surfaces baseline\n");
  await writeJson(suggestionsPath, {
    suggestions: [
      {
        suggestionId: "suggestion:token.normalization-skipped",
        findingCode: "token.normalization-skipped",
        status: "accepted",
        confidence: 0.6,
        findingMessage: "Could not normalize typography token.",
        repeatedFailureCount: 1,
        proposedChange: {
          path: "surfaces[id=reference-target-web]",
          actionType: "review-contract",
          summary: "Review typography normalization.",
          valueHints: [],
        },
        repair: {
          priority: "medium",
          category: "visual",
          actionType: "review-contract",
        },
        decision: {
          rationale: "Follow up on the fixture typography token gap.",
          decidedAt: generatedAt,
        },
      },
    ],
  });
  await writeJson(secondSuggestionsPath, { suggestions: [] });
  await writeJson(reportPath, {
    schemaVersion: 1,
    generatedAt,
    comparisons: [
      {
        comparisonPath,
        surfaceId: "reference-target-web",
        tool: "codex",
        meetsGoal: true,
        guidedFewerFirstAttemptBlockingFindings: true,
        guidedReachedAcceptableNoLater: true,
        guidedRubricBetterDimensions: ["components", "visual"],
      },
      {
        comparisonPath: secondComparisonPath,
        surfaceId: "surfaces-web",
        tool: "codex",
        meetsGoal: true,
        guidedFewerFirstAttemptBlockingFindings: true,
        guidedReachedAcceptableNoLater: true,
        guidedRubricBetterDimensions: ["components"],
      },
    ],
    suggestions: [
      {
        suggestionsPath,
        surfaceId: "reference-target-web",
        sessionId: "guided",
        acceptedCount: 1,
        rejectedCount: 0,
        proposedCount: 0,
      },
      {
        suggestionsPath: secondSuggestionsPath,
        surfaceId: "surfaces-web",
        sessionId: "guided",
        acceptedCount: 0,
        rejectedCount: 0,
        proposedCount: 0,
      },
    ],
    overall: {
      surfaceCount: 2,
      surfacesMeetingGoal: 2,
      guidedFewerFirstAttemptBlockingFindings: 2,
      guidedReachedAcceptableNoLater: 2,
      acceptedSuggestionCount: 1,
      rejectedSuggestionCount: 0,
      proposedSuggestionCount: 0,
    },
  });

  return { benchmarkDir };
}

const tempDirs: string[] = [];

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      await fsp.rm(dir, { recursive: true, force: true });
    }
  }
});

describe("generation benchmark workbench", () => {
  it("discovers the latest benchmark and preserves report ordering", async () => {
    const benchmarksRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "surfaceops-benchmarks-"));
    tempDirs.push(benchmarksRoot);

    await createBenchmarkFixture(benchmarksRoot, "2026-03-12-proof", "2026-03-12T10:00:00.000Z");
    await createBenchmarkFixture(benchmarksRoot, "2026-03-13-proof", "2026-03-13T10:00:00.000Z");

    const benchmarks = listGenerationBenchmarks(benchmarksRoot);
    expect(benchmarks.map((item) => item.id)).toEqual(["2026-03-13-proof", "2026-03-12-proof"]);
    expect(loadLatestBenchmarkId(benchmarksRoot)).toBe("2026-03-13-proof");
  });

  it("loads a benchmark, resolves surface selection, and keeps preview fallback explicit", async () => {
    const benchmarksRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "surfaceops-benchmarks-"));
    tempDirs.push(benchmarksRoot);

    const { benchmarkDir } = await createBenchmarkFixture(
      benchmarksRoot,
      "2026-03-13-proof",
      "2026-03-13T10:00:00.000Z",
    );
    await fsp.rm(
      path.join(benchmarkDir, "sessions", "reference-target-web", "guided", "attempts", "001.preview.png"),
      { force: true },
    );

    const workbench = loadGenerationWorkbench({
      benchmarksDir: benchmarksRoot,
      benchmarkId: "2026-03-13-proof",
      surfaceId: "reference-target-web",
      attemptView: "first",
    });

    expect(workbench.selectedSurfaceId).toBe("reference-target-web");
    expect(workbench.attemptView).toBe("first");
    expect(workbench.previews.baseline.dataUrl?.startsWith("data:image/png;base64,")).toBe(true);
    expect(workbench.previews.guided.dataUrl).toBeNull();
    expect(workbench.guidedPrepared?.summary?.text).toContain("Prepared summary");
    expect(workbench.suggestions?.suggestions[0].decision?.rationale).toContain("typography token");
  });

  it("renders the benchmark workbench with metrics, suggestions, and preview fallback copy", async () => {
    const benchmarksRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "surfaceops-benchmarks-"));
    tempDirs.push(benchmarksRoot);

    const { benchmarkDir } = await createBenchmarkFixture(
      benchmarksRoot,
      "2026-03-13-proof",
      "2026-03-13T10:00:00.000Z",
    );
    await fsp.rm(
      path.join(benchmarkDir, "sessions", "reference-target-web", "guided", "attempts", "001.preview.png"),
      { force: true },
    );

    const data = loadGenerationWorkbench({
      benchmarksDir: benchmarksRoot,
      benchmarkId: "2026-03-13-proof",
      surfaceId: "reference-target-web",
      attemptView: "first",
    });
    const html = renderToStaticMarkup(React.createElement(BenchmarkWorkbench, { data }));

    expect(html).toContain("Generation Workbench");
    expect(html).toContain("Baseline vs guided");
    expect(html).toContain("Preview unavailable");
    expect(html).toContain("Follow up on the fixture typography token gap.");
    expect(html).toContain("First attempt");
    expect(html).toContain("reference-target-web");
  });
});
