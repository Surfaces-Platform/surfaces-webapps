import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { listBenchmarkReports, loadBenchmarkReport } from "@/lib/benchmark-report-docs";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

function buildVisualization() {
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

function buildComparisonArtifact() {
  return {
    surfaceId: "reference-target-web",
    baseline: {
      guidanceStrategy: "prompt-summary",
    },
    guided: {
      guidanceStrategy: "json-primary",
    },
    delta: {
      firstAttemptFindingCountDelta: -1,
      firstAttemptBlockingFindingCountDelta: -1,
      attemptsToAcceptableOutcome: {
        delta: -1,
      },
      rubric: {
        structure: { baseline: "partial", guided: "partial", delta: 0 },
        components: { baseline: "partial", guided: "partial", delta: 0 },
        boundary: { baseline: "partial", guided: "partial", delta: 0 },
        visual: { baseline: "partial", guided: "strong", delta: 1 },
        responsiveness: { baseline: "partial", guided: "partial", delta: 0 },
        platformFit: { baseline: "partial", guided: "partial", delta: 0 },
      },
    },
    heuristics: {
      delta: {
        unresolvedAcceptedSuggestionRate: -0.25,
        noChangesAfterEditFailureCount: -1,
        recoverableToolErrorCount: -2,
        touchedFilesPerResolvedFinding: 0,
        repeatedFindingCarryoverCount: 0,
        rerunsToAcceptableOutcome: -1,
      },
    },
    checks: {
      guidedFewerFirstAttemptBlockingFindings: true,
      guidedReachedAcceptableNoLater: true,
      guidedRubricAtLeastAsGood: true,
      guidedRubricBetterDimensions: ["visual"],
      meetsGoal: true,
    },
  };
}

describe("benchmark report docs", () => {
  it("lists benchmark markdown files newest-first with extracted titles and summaries", async () => {
    const archiveDir = await fs.mkdtemp(path.join(os.tmpdir(), "surfaceops-benchmark-reports-"));
    const benchmarksDir = await fs.mkdtemp(path.join(os.tmpdir(), "surfaceops-benchmark-empty-"));
    tempDirs.push(archiveDir, benchmarksDir);

    await fs.writeFile(
      path.join(archiveDir, "2026-03-15-surfaceops-expanded-benchmark-rerun.md"),
      [
        "# 2026-03-15 - SurfaceOps Expanded Benchmark Rerun",
        "",
        "This note captures the March 15, 2026 rerun of the expanded SurfaceOps benchmark fixture suite.",
        "",
        "## Scope",
        "",
        "- Bullet content should not become the summary.",
      ].join("\n"),
      "utf8",
    );

    await fs.writeFile(
      path.join(archiveDir, "2026-03-14-unrelated-runbook.md"),
      "# Unrelated\n\nIgnore this file.\n",
      "utf8",
    );

    await fs.writeFile(
      path.join(archiveDir, "2026-03-10-benchmark-older.md"),
      "# Older Benchmark Report\n\nOlder summary paragraph.\n",
      "utf8",
    );

    const reports = listBenchmarkReports({ archiveDir, benchmarksDir });
    expect(reports).toHaveLength(2);
    expect(reports[0]).toMatchObject({
      id: "archive-2026-03-15-surfaceops-expanded-benchmark-rerun",
      source: "archive",
      title: "2026-03-15 - SurfaceOps Expanded Benchmark Rerun",
      summary: "This note captures the March 15, 2026 rerun of the expanded SurfaceOps benchmark fixture suite.",
      dateLabel: "March 15, 2026",
    });
    expect(reports[1].id).toBe("archive-2026-03-10-benchmark-older");
  });

  it("loads an archive report by id, leaves visualization null, and rejects non-benchmark files", async () => {
    const archiveDir = await fs.mkdtemp(path.join(os.tmpdir(), "surfaceops-benchmark-report-load-"));
    const benchmarksDir = await fs.mkdtemp(path.join(os.tmpdir(), "surfaceops-benchmark-empty-"));
    tempDirs.push(archiveDir, benchmarksDir);

    await fs.writeFile(
      path.join(archiveDir, "2026-03-15-surfaceops-expanded-benchmark-rerun.md"),
      "# SurfaceOps report\n\nLatest summary.\n",
      "utf8",
    );
    await fs.writeFile(path.join(archiveDir, "notes.md"), "# Notes\n", "utf8");

    const report = loadBenchmarkReport("archive-2026-03-15-surfaceops-expanded-benchmark-rerun", {
      archiveDir,
      benchmarksDir,
    });
    expect(report?.markdown).toContain("Latest summary.");
    expect(report?.visualization).toBeNull();
    expect(loadBenchmarkReport("notes", { archiveDir, benchmarksDir })).toBeNull();
  });

  it("loads a v3 artifact report with embedded visualization data", async () => {
    const archiveDir = await fs.mkdtemp(path.join(os.tmpdir(), "surfaceops-benchmark-archive-v3-"));
    const benchmarksDir = await fs.mkdtemp(path.join(os.tmpdir(), "surfaceops-benchmark-artifacts-v3-"));
    tempDirs.push(archiveDir, benchmarksDir);

    const cohortId = "20260315060000";
    const cohortDir = path.join(benchmarksDir, cohortId);
    const fixtureDir = path.join(cohortDir, "fixtures", "reference-target-web");
    const briefPath = path.join(fixtureDir, "implementation-brief.md");
    const effectiveAstPath = path.join(fixtureDir, "effective-ui-ast.json");
    const preparedInputPath = path.join(fixtureDir, "prepared-input.json");
    await fs.mkdir(path.join(cohortDir, "report"), { recursive: true });
    await fs.mkdir(fixtureDir, { recursive: true });
    await fs.writeFile(briefPath, "Reference target prompt.\n", "utf8");
    await fs.writeFile(effectiveAstPath, JSON.stringify({ surface: "reference-target-web" }), "utf8");
    await fs.writeFile(preparedInputPath, JSON.stringify({ summary: { text: "Prepared guidance." } }), "utf8");
    await fs.writeFile(
      path.join(cohortDir, "report", "benchmark-report.json"),
      JSON.stringify({
        schemaVersion: 3,
        generatedAt: "2026-03-15T06:00:00.000Z",
        comparisons: [
          {
            comparisonPath: "/tmp/missing-comparison.json",
            surfaceId: "reference-target-web",
            tool: "local-llm",
            meetsGoal: true,
            baselineGuidanceStrategy: "prompt-summary",
            guidedGuidanceStrategy: "json-primary",
            guidedFewerFirstAttemptBlockingFindings: true,
            guidedReachedAcceptableNoLater: true,
            guidedRubricBetterDimensions: ["visual"],
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
        suggestions: [],
        overall: {
          surfaceCount: 1,
          surfacesMeetingGoal: 1,
          guidedFewerFirstAttemptBlockingFindings: 1,
          guidedReachedAcceptableNoLater: 1,
          acceptedSuggestionCount: 0,
          rejectedSuggestionCount: 0,
          proposedSuggestionCount: 0,
          heuristics: {
            averageDelta: {
              unresolvedAcceptedSuggestionRate: -0.25,
              noChangesAfterEditFailureCount: -1,
              recoverableToolErrorCount: -2,
              touchedFilesPerResolvedFinding: 0,
              repeatedFindingCarryoverCount: 0,
              rerunsToAcceptableOutcome: -1,
            },
          },
        },
        visualization: buildVisualization(),
      }),
      "utf8",
    );
    await fs.writeFile(
      path.join(cohortDir, "report", "benchmark-report.md"),
      "# Generation Benchmark Report\n\nGenerated at: 2026-03-15T06:00:00.000Z\n",
      "utf8",
    );
    await fs.writeFile(
      path.join(cohortDir, "run.json"),
      JSON.stringify({
        schemaVersion: 1,
        cohortId,
        generatedAt: "2026-03-15T06:00:00.000Z",
        evaluationMode: "zero-shot",
        tool: "local-llm",
        sourceSpecPath: path.join(cohortDir, "spec.json"),
        sourceRunPath: null,
        attemptBudget: 1,
        guidanceStrategies: ["prompt-summary", "json-primary"],
        comparisonPairs: [],
        fixtures: [{
          fixtureId: "reference-target-web",
          surfaceId: "reference-target-web",
          brief: {
            path: briefPath,
            sha256: "brief-hash",
          },
          platformTarget: "web",
          consumerType: "web-browser",
          capturePreset: "web-browser",
          comparisonPairs: [],
          paths: {
            effectiveAstPath,
            preparedInputPath,
          },
          sessions: [],
          comparisons: [],
        }],
        model: {
          requestedModelLabel: "gpt-oss-120b",
          resolvedModelId: "openai/gpt-oss-120b",
          baseUrl: "http://127.0.0.1:1234/v1",
          fingerprint: "test-fingerprint",
        },
        paths: {
          benchmarkDir: cohortDir,
          specPath: path.join(cohortDir, "spec.json"),
          runPath: path.join(cohortDir, "run.json"),
          reportJsonPath: path.join(cohortDir, "report", "benchmark-report.json"),
          reportMarkdownPath: path.join(cohortDir, "report", "benchmark-report.md"),
        },
      }),
      "utf8",
    );

    const reports = listBenchmarkReports({ archiveDir, benchmarksDir });
    expect(reports[0]).toMatchObject({
      id: "run-20260315060000",
      source: "artifact",
      title: "Benchmark Run 20260315060000",
      summary: "reference-target-web · prompt-summary vs json-primary · gpt-oss-120b",
      dateLabel: "March 15, 2026",
    });

    const report = loadBenchmarkReport("run-20260315060000", { archiveDir, benchmarksDir });
    expect(report?.visualization?.summary.comparisonCount).toBe(1);
    expect(report?.visualization?.comparisons[0]?.guidedRubricBetterDimensions).toEqual(["visual"]);
    expect(report?.evidence?.model.requestedModelLabel).toBe("gpt-oss-120b");
    expect(report?.evidence?.fixtures[0]?.brief.text).toContain("Reference target prompt.");
  });

  it("derives visualization data for legacy v2 artifact reports from comparison artifacts", async () => {
    const archiveDir = await fs.mkdtemp(path.join(os.tmpdir(), "surfaceops-benchmark-archive-v2-"));
    const benchmarksDir = await fs.mkdtemp(path.join(os.tmpdir(), "surfaceops-benchmark-artifacts-v2-"));
    tempDirs.push(archiveDir, benchmarksDir);

    const cohortId = "20260315070000";
    const cohortDir = path.join(benchmarksDir, cohortId);
    const comparisonDir = path.join(cohortDir, "comparisons", "prompt-summary--vs--json-primary");
    const comparisonPath = path.join(comparisonDir, "comparison.json");
    await fs.mkdir(path.join(cohortDir, "report"), { recursive: true });
    await fs.mkdir(comparisonDir, { recursive: true });
    await fs.writeFile(comparisonPath, JSON.stringify(buildComparisonArtifact()), "utf8");
    await fs.writeFile(
      path.join(cohortDir, "report", "benchmark-report.json"),
      JSON.stringify({
        schemaVersion: 2,
        generatedAt: "2026-03-15T07:00:00.000Z",
        comparisons: [
          {
            comparisonPath,
            surfaceId: "reference-target-web",
            tool: "local-llm",
            meetsGoal: true,
            baselineGuidanceStrategy: "prompt-summary",
            guidedGuidanceStrategy: "json-primary",
            guidedFewerFirstAttemptBlockingFindings: true,
            guidedReachedAcceptableNoLater: true,
            guidedRubricBetterDimensions: ["visual"],
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
        suggestions: [],
        overall: {
          surfaceCount: 1,
          surfacesMeetingGoal: 1,
          guidedFewerFirstAttemptBlockingFindings: 1,
          guidedReachedAcceptableNoLater: 1,
          acceptedSuggestionCount: 0,
          rejectedSuggestionCount: 0,
          proposedSuggestionCount: 0,
        },
      }),
      "utf8",
    );
    await fs.writeFile(
      path.join(cohortDir, "report", "benchmark-report.md"),
      "# Generation Benchmark Report\n\nGenerated at: 2026-03-15T07:00:00.000Z\n",
      "utf8",
    );
    await fs.writeFile(
      path.join(cohortDir, "manifest.json"),
      JSON.stringify({
        guidanceStrategies: ["prompt-summary", "json-primary"],
        fixtures: [{ surfaceId: "reference-target-web" }],
        model: { fingerprint: "test-fingerprint" },
      }),
      "utf8",
    );

    const report = loadBenchmarkReport("run-20260315070000", { archiveDir, benchmarksDir });
    expect(report?.visualization?.summary.guidedRubricAtLeastAsGoodCount).toBe(1);
    expect(report?.visualization?.heuristics.improvedCounts.recoverableToolErrorCount).toBe(1);
    expect(report?.visualization?.comparisons[0]?.firstAttemptBlockingFindingCountDelta).toBe(-1);
  });
});
