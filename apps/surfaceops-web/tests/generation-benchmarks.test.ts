import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  listGenerationBenchmarks,
  loadGenerationWorkbenchFromRoot,
} from "@/lib/generation-benchmarks";

describe("generation benchmarks reader", () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(tempDirs.map((dir) => fs.rm(dir, { recursive: true, force: true })));
  });

  it("loads benchmark manifests and surfaces strategy metadata", async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "surfaceops-generation-benchmarks-"));
    tempDirs.push(tempRoot);

    const benchmarkDir = path.join(tempRoot, "20260314183000");
    const reportDir = path.join(benchmarkDir, "report");
    const comparisonDir = path.join(benchmarkDir, "comparisons", "prompt-summary--vs--json-primary");
    const baselineSessionDir = path.join(tempRoot, "sessions", "reference-target-web", "20260314183000", "prompt-summary");
    const guidedSessionDir = path.join(tempRoot, "sessions", "reference-target-web", "20260314183000", "json-primary");
    const baselineAttemptsDir = path.join(baselineSessionDir, "attempts");
    const guidedAttemptsDir = path.join(guidedSessionDir, "attempts");
    const preparedInputPath = path.join(benchmarkDir, "prepared-input.json");
    const briefPath = path.join(benchmarkDir, "implementation-brief.md");
    const comparisonPath = path.join(comparisonDir, "comparison.json");

    await fs.mkdir(reportDir, { recursive: true });
    await fs.mkdir(comparisonDir, { recursive: true });
    await fs.mkdir(baselineAttemptsDir, { recursive: true });
    await fs.mkdir(guidedAttemptsDir, { recursive: true });

    await fs.writeFile(preparedInputPath, JSON.stringify({ summary: { text: "Prepared guidance." } }), "utf8");
    await fs.writeFile(briefPath, "Reference target benchmark brief.\n", "utf8");
    await fs.writeFile(
      path.join(baselineAttemptsDir, "001.assessment.json"),
      JSON.stringify({
        structure: "partial",
        components: "partial",
        boundary: "partial",
        visual: "partial",
        responsiveness: "partial",
        notes: "Prompt summary attempt.",
        touchedFiles: ["apps/reference-target-web/app/page.tsx"],
      }),
      "utf8",
    );
    await fs.writeFile(path.join(guidedAttemptsDir, "001.assessment.json"), JSON.stringify({
      structure: "strong",
      components: "strong",
      boundary: "strong",
      visual: "strong",
      responsiveness: "strong",
      notes: "JSON primary attempt.",
      touchedFiles: ["apps/reference-target-web/app/page.tsx"],
    }), "utf8");

    await fs.writeFile(
      path.join(baselineSessionDir, "summary.json"),
      JSON.stringify({
        surfaceId: "reference-target-web",
        sessionId: "20260314183000/prompt-summary",
        tool: "local-llm",
        guidanceStrategy: "prompt-summary",
        attemptCount: 1,
        firstPassAttempt: null,
        firstAcceptableAttempt: 1,
        latestStatus: "warn",
        latestOutcome: "warn",
        latestAssessment: null,
        latestReview: null,
        heuristics: {
          latestAttempt: {
            unresolvedAcceptedSuggestionRate: 0.5,
          },
          repeatedFindingCarryoverCount: 0,
          rerunsToAcceptableOutcome: 1,
        },
        paths: {
          sessionPath: path.join(baselineSessionDir, "session.json"),
          bundleRoot: path.join(benchmarkDir, "bundle"),
          preparedInputPath,
        },
        attempts: [
          {
            attemptNumber: 1,
            status: "warn",
            outcome: "warn",
            findingCodes: ["token.normalization-skipped"],
            assessmentPath: path.join(baselineAttemptsDir, "001.assessment.json"),
            metadataPath: path.join(baselineAttemptsDir, "001.metadata.json"),
            validatePath: path.join(baselineAttemptsDir, "001.validate.json"),
          },
        ],
      }),
      "utf8",
    );
    await fs.writeFile(
      path.join(guidedSessionDir, "summary.json"),
      JSON.stringify({
        surfaceId: "reference-target-web",
        sessionId: "20260314183000/json-primary",
        tool: "local-llm",
        guidanceStrategy: "json-primary",
        attemptCount: 1,
        firstPassAttempt: 1,
        firstAcceptableAttempt: 1,
        latestStatus: "pass",
        latestOutcome: "pass",
        latestAssessment: null,
        latestReview: null,
        heuristics: {
          latestAttempt: {
            unresolvedAcceptedSuggestionRate: 0,
          },
          repeatedFindingCarryoverCount: 0,
          rerunsToAcceptableOutcome: 1,
        },
        paths: {
          sessionPath: path.join(guidedSessionDir, "session.json"),
          bundleRoot: path.join(benchmarkDir, "bundle"),
          preparedInputPath,
        },
        attempts: [
          {
            attemptNumber: 1,
            status: "pass",
            outcome: "pass",
            findingCodes: [],
            assessmentPath: path.join(guidedAttemptsDir, "001.assessment.json"),
            metadataPath: path.join(guidedAttemptsDir, "001.metadata.json"),
            validatePath: path.join(guidedAttemptsDir, "001.validate.json"),
          },
        ],
      }),
      "utf8",
    );

    await fs.writeFile(
      comparisonPath,
      JSON.stringify({
        surfaceId: "reference-target-web",
        tool: "local-llm",
        brief: {
          sha256: "brief-hash",
          baselinePath: briefPath,
          guidedPath: briefPath,
        },
        baseline: {
          sessionId: "20260314183000/prompt-summary",
          sessionDir: baselineSessionDir,
          guidanceStrategy: "prompt-summary",
          attemptCount: 1,
          firstAcceptableAttempt: 1,
          latestOutcome: "warn",
          firstAttempt: {
            attemptNumber: 1,
            status: "warn",
            outcome: "warn",
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
              notes: "Prompt summary attempt.",
            },
          },
          latestAttempt: {
            attemptNumber: 1,
            status: "warn",
            outcome: "warn",
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
              notes: "Prompt summary attempt.",
            },
          },
          recurringFindingCodes: [],
          recurringRepairCodes: [],
        },
        guided: {
          sessionId: "20260314183000/json-primary",
          sessionDir: guidedSessionDir,
          guidanceStrategy: "json-primary",
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
            assessment: {
              structure: "strong",
              components: "strong",
              boundary: "strong",
              visual: "strong",
              responsiveness: "strong",
              notes: "JSON primary attempt.",
            },
          },
          latestAttempt: {
            attemptNumber: 1,
            status: "pass",
            outcome: "pass",
            findingCount: 0,
            blockingFindingCount: 0,
            warningFindingCount: 0,
            findingCodes: [],
            assessment: {
              structure: "strong",
              components: "strong",
              boundary: "strong",
              visual: "strong",
              responsiveness: "strong",
              notes: "JSON primary attempt.",
            },
          },
          recurringFindingCodes: [],
          recurringRepairCodes: [],
        },
        delta: {
          firstAttemptVerdict: { baseline: "warn", guided: "pass" },
          firstAttemptFindingCountDelta: -1,
          firstAttemptBlockingFindingCountDelta: 0,
          firstAttemptWarningFindingCountDelta: -1,
          latestFindingCountDelta: -1,
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
          meetsGoal: true,
        },
        paths: {
          baselineSessionDir,
          guidedSessionDir,
        },
      }),
      "utf8",
    );

    await fs.writeFile(
      path.join(reportDir, "benchmark-report.json"),
      JSON.stringify({
        generatedAt: "2026-03-14T18:30:00.000Z",
        comparisons: [
          {
            comparisonPath,
            surfaceId: "reference-target-web",
            tool: "local-llm",
            meetsGoal: true,
            baselineGuidanceStrategy: "prompt-summary",
            guidedGuidanceStrategy: "json-primary",
            guidedFewerFirstAttemptBlockingFindings: false,
            guidedReachedAcceptableNoLater: true,
            guidedRubricBetterDimensions: ["structure"],
          },
        ],
        suggestions: [],
        overall: {
          surfaceCount: 1,
          surfacesMeetingGoal: 1,
          guidedFewerFirstAttemptBlockingFindings: 0,
          guidedReachedAcceptableNoLater: 1,
          acceptedSuggestionCount: 0,
          rejectedSuggestionCount: 0,
          proposedSuggestionCount: 0,
        },
      }),
      "utf8",
    );
    await fs.writeFile(
      path.join(benchmarkDir, "manifest.json"),
      JSON.stringify({
        schemaVersion: 1,
        cohortId: "20260314183000",
        generatedAt: "2026-03-14T18:30:00.000Z",
        profileId: "reference-target-web/default",
        profileName: "Reference Target Web Default",
        surfaceId: "reference-target-web",
        tool: "local-llm",
        guidanceStrategies: ["prompt-summary", "json-primary"],
        comparisonPairs: [
          {
            baselineGuidanceStrategy: "prompt-summary",
            guidedGuidanceStrategy: "json-primary",
          },
        ],
        brief: {
          path: briefPath,
          sha256: "brief-hash",
        },
        model: {
          baseUrl: "http://127.0.0.1:1234/v1",
          model: "openai/gpt-oss-120b",
          fingerprint: "model-fingerprint",
        },
        paths: {
          benchmarkDir,
          effectiveContractPath: path.join(benchmarkDir, "effective-contract.json"),
          preparedInputPath,
          reportJsonPath: path.join(reportDir, "benchmark-report.json"),
          reportMarkdownPath: path.join(reportDir, "benchmark-report.md"),
        },
        sessions: [],
        comparisons: [
          {
            baselineGuidanceStrategy: "prompt-summary",
            guidedGuidanceStrategy: "json-primary",
            comparisonDir,
            comparisonPath,
          },
        ],
      }),
      "utf8",
    );

    const benchmarks = listGenerationBenchmarks(tempRoot);
    expect(benchmarks).toHaveLength(1);
    expect(benchmarks[0]).toEqual(expect.objectContaining({
      profileName: "Reference Target Web Default",
      guidanceStrategies: ["prompt-summary", "json-primary"],
      modelFingerprint: "model-fingerprint",
    }));

    const workbench = loadGenerationWorkbenchFromRoot({
      benchmarkDir,
      benchmarkId: "20260314183000",
    });
    expect(workbench.manifest?.profileName).toBe("Reference Target Web Default");
    expect(workbench.comparisonLabels).toEqual({
      baseline: "prompt-summary",
      guided: "json-primary",
    });
    expect(workbench.guidedPrepared).toEqual({ summary: { text: "Prepared guidance." } });
    expect(workbench.briefText).toContain("Reference target benchmark brief.");
  });

  it("loads schema v2 suite manifests while remaining surface-selectable", async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "surfaceops-generation-benchmarks-v2-"));
    tempDirs.push(tempRoot);

    const benchmarkDir = path.join(tempRoot, "20260315020000");
    const reportDir = path.join(benchmarkDir, "report");
    const fixtureDir = path.join(benchmarkDir, "fixtures", "benchmark-shared-shell-web");
    const comparisonDir = path.join(fixtureDir, "comparisons", "prompt-summary--vs--json-primary");
    const baselineSessionDir = path.join(tempRoot, "sessions", "benchmark-shared-shell-web", "20260315020000", "prompt-summary");
    const guidedSessionDir = path.join(tempRoot, "sessions", "benchmark-shared-shell-web", "20260315020000", "json-primary");
    const baselineAttemptsDir = path.join(baselineSessionDir, "attempts");
    const guidedAttemptsDir = path.join(guidedSessionDir, "attempts");
    const preparedInputPath = path.join(fixtureDir, "prepared-input.json");
    const briefPath = path.join(fixtureDir, "implementation-brief.md");
    const comparisonPath = path.join(comparisonDir, "comparison.json");

    await fs.mkdir(reportDir, { recursive: true });
    await fs.mkdir(comparisonDir, { recursive: true });
    await fs.mkdir(baselineAttemptsDir, { recursive: true });
    await fs.mkdir(guidedAttemptsDir, { recursive: true });

    await fs.writeFile(preparedInputPath, JSON.stringify({ summary: { text: "Shared shell guidance." } }), "utf8");
    await fs.writeFile(briefPath, "Shared shell benchmark brief.\n", "utf8");
    await fs.writeFile(
      path.join(baselineAttemptsDir, "001.assessment.json"),
      JSON.stringify({
        structure: "partial",
        components: "partial",
        boundary: "partial",
        visual: "partial",
        responsiveness: "partial",
        notes: "Prompt summary shared-shell attempt.",
        touchedFiles: ["apps/benchmark-shared-shell-web/app/reports/page.tsx"],
      }),
      "utf8",
    );
    await fs.writeFile(
      path.join(guidedAttemptsDir, "001.assessment.json"),
      JSON.stringify({
        structure: "strong",
        components: "strong",
        boundary: "strong",
        visual: "strong",
        responsiveness: "strong",
        notes: "JSON primary shared-shell attempt.",
        touchedFiles: ["apps/benchmark-shared-shell-web/app/reports/page.tsx"],
      }),
      "utf8",
    );
    await fs.writeFile(
      path.join(baselineSessionDir, "summary.json"),
      JSON.stringify({
        surfaceId: "benchmark-shared-shell-web",
        sessionId: "20260315020000/prompt-summary",
        tool: "local-llm",
        guidanceStrategy: "prompt-summary",
        attemptCount: 1,
        firstPassAttempt: null,
        firstAcceptableAttempt: 1,
        latestStatus: "warn",
        latestOutcome: "warn",
        latestAssessment: null,
        latestReview: null,
        heuristics: {
          latestAttempt: {
            unresolvedAcceptedSuggestionRate: 1,
          },
          repeatedFindingCarryoverCount: 0,
          rerunsToAcceptableOutcome: 1,
        },
        paths: {
          sessionPath: path.join(baselineSessionDir, "session.json"),
          bundleRoot: path.join(fixtureDir, "bundle"),
          preparedInputPath,
        },
        attempts: [
          {
            attemptNumber: 1,
            status: "warn",
            outcome: "warn",
            findingCodes: ["section.missing"],
            assessmentPath: path.join(baselineAttemptsDir, "001.assessment.json"),
            metadataPath: path.join(baselineAttemptsDir, "001.metadata.json"),
            validatePath: path.join(baselineAttemptsDir, "001.validate.json"),
          },
        ],
      }),
      "utf8",
    );
    await fs.writeFile(
      path.join(guidedSessionDir, "summary.json"),
      JSON.stringify({
        surfaceId: "benchmark-shared-shell-web",
        sessionId: "20260315020000/json-primary",
        tool: "local-llm",
        guidanceStrategy: "json-primary",
        attemptCount: 1,
        firstPassAttempt: 1,
        firstAcceptableAttempt: 1,
        latestStatus: "pass",
        latestOutcome: "pass",
        latestAssessment: null,
        latestReview: null,
        heuristics: {
          latestAttempt: {
            unresolvedAcceptedSuggestionRate: 0,
          },
          repeatedFindingCarryoverCount: 0,
          rerunsToAcceptableOutcome: 1,
        },
        paths: {
          sessionPath: path.join(guidedSessionDir, "session.json"),
          bundleRoot: path.join(fixtureDir, "bundle"),
          preparedInputPath,
        },
        attempts: [
          {
            attemptNumber: 1,
            status: "pass",
            outcome: "pass",
            findingCodes: [],
            assessmentPath: path.join(guidedAttemptsDir, "001.assessment.json"),
            metadataPath: path.join(guidedAttemptsDir, "001.metadata.json"),
            validatePath: path.join(guidedAttemptsDir, "001.validate.json"),
          },
        ],
      }),
      "utf8",
    );
    await fs.writeFile(
      comparisonPath,
      JSON.stringify({
        surfaceId: "benchmark-shared-shell-web",
        tool: "local-llm",
        brief: {
          sha256: "shared-shell-brief-hash",
          baselinePath: briefPath,
          guidedPath: briefPath,
        },
        baseline: {
          sessionId: "20260315020000/prompt-summary",
          sessionDir: baselineSessionDir,
          guidanceStrategy: "prompt-summary",
          attemptCount: 1,
          firstAcceptableAttempt: 1,
          latestOutcome: "warn",
          firstAttempt: {
            attemptNumber: 1,
            status: "warn",
            outcome: "warn",
            findingCount: 1,
            blockingFindingCount: 0,
            warningFindingCount: 1,
            findingCodes: ["section.missing"],
            assessment: {
              structure: "partial",
              components: "partial",
              boundary: "partial",
              visual: "partial",
              responsiveness: "partial",
              notes: "Prompt summary shared-shell attempt.",
            },
          },
          latestAttempt: {
            attemptNumber: 1,
            status: "warn",
            outcome: "warn",
            findingCount: 1,
            blockingFindingCount: 0,
            warningFindingCount: 1,
            findingCodes: ["section.missing"],
            assessment: {
              structure: "partial",
              components: "partial",
              boundary: "partial",
              visual: "partial",
              responsiveness: "partial",
              notes: "Prompt summary shared-shell attempt.",
            },
          },
          recurringFindingCodes: [],
          recurringRepairCodes: [],
        },
        guided: {
          sessionId: "20260315020000/json-primary",
          sessionDir: guidedSessionDir,
          guidanceStrategy: "json-primary",
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
            assessment: {
              structure: "strong",
              components: "strong",
              boundary: "strong",
              visual: "strong",
              responsiveness: "strong",
              notes: "JSON primary shared-shell attempt.",
            },
          },
          latestAttempt: {
            attemptNumber: 1,
            status: "pass",
            outcome: "pass",
            findingCount: 0,
            blockingFindingCount: 0,
            warningFindingCount: 0,
            findingCodes: [],
            assessment: {
              structure: "strong",
              components: "strong",
              boundary: "strong",
              visual: "strong",
              responsiveness: "strong",
              notes: "JSON primary shared-shell attempt.",
            },
          },
          recurringFindingCodes: [],
          recurringRepairCodes: [],
        },
        delta: {
          firstAttemptVerdict: { baseline: "warn", guided: "pass" },
          firstAttemptFindingCountDelta: -1,
          firstAttemptBlockingFindingCountDelta: 0,
          firstAttemptWarningFindingCountDelta: -1,
          latestFindingCountDelta: -1,
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
          meetsGoal: true,
        },
        paths: {
          baselineSessionDir,
          guidedSessionDir,
        },
      }),
      "utf8",
    );
    await fs.writeFile(
      path.join(reportDir, "benchmark-report.json"),
      JSON.stringify({
        generatedAt: "2026-03-15T02:00:00.000Z",
        comparisons: [
          {
            comparisonPath,
            surfaceId: "benchmark-shared-shell-web",
            tool: "local-llm",
            meetsGoal: true,
            baselineGuidanceStrategy: "prompt-summary",
            guidedGuidanceStrategy: "json-primary",
            guidedFewerFirstAttemptBlockingFindings: false,
            guidedReachedAcceptableNoLater: true,
            guidedRubricBetterDimensions: ["structure"],
          },
        ],
        suggestions: [],
        overall: {
          surfaceCount: 1,
          surfacesMeetingGoal: 1,
          guidedFewerFirstAttemptBlockingFindings: 0,
          guidedReachedAcceptableNoLater: 1,
          acceptedSuggestionCount: 0,
          rejectedSuggestionCount: 0,
          proposedSuggestionCount: 0,
        },
      }),
      "utf8",
    );
    await fs.writeFile(
      path.join(benchmarkDir, "manifest.json"),
      JSON.stringify({
        schemaVersion: 2,
        cohortId: "20260315020000",
        generatedAt: "2026-03-15T02:00:00.000Z",
        suiteId: "surfaceops-benchmark-suite/default",
        suiteName: "SurfaceOps Benchmark Fixture Suite",
        tool: "local-llm",
        guidanceStrategies: ["prompt-summary", "json-primary"],
        model: {
          baseUrl: "http://127.0.0.1:1234/v1",
          model: "openai/gpt-oss-120b",
          fingerprint: "suite-model-fingerprint",
        },
        paths: {
          benchmarkDir,
          reportJsonPath: path.join(reportDir, "benchmark-report.json"),
          reportMarkdownPath: path.join(reportDir, "benchmark-report.md"),
        },
        fixtures: [
          {
            fixtureId: "benchmark-shared-shell-web",
            profileId: "benchmark-shared-shell-web/default",
            profileName: "Benchmark Shared Shell Web Default",
            surfaceId: "benchmark-shared-shell-web",
            tool: "local-llm",
            comparisonPairs: [
              {
                baselineGuidanceStrategy: "prompt-summary",
                guidedGuidanceStrategy: "json-primary",
              },
            ],
            brief: {
              path: briefPath,
              sha256: "shared-shell-brief-hash",
            },
            paths: {
              fixtureDir,
              effectiveContractPath: path.join(fixtureDir, "effective-contract.json"),
              preparedInputPath,
              acceptedSuggestionsPath: path.join(fixtureDir, "accepted-suggestions.runtime.json"),
              designerNotesPath: path.join(fixtureDir, "designer-notes.runtime.json"),
              baselineValidatePath: path.join(fixtureDir, "baseline-seed", "attempt.validate.json"),
            },
            sessions: [
              {
                guidanceStrategy: "prompt-summary",
                sessionId: "20260315020000/prompt-summary",
                sessionDir: baselineSessionDir,
                transcriptPath: path.join(baselineSessionDir, "transcript.json"),
                guidanceHandoffPath: path.join(baselineSessionDir, "guidance.json"),
                agentInputPath: path.join(baselineSessionDir, "agent-input.txt"),
                explainabilityPath: path.join(baselineSessionDir, "explainability.json"),
                summaryPath: path.join(baselineSessionDir, "summary.json"),
                previewPath: path.join(baselineAttemptsDir, "001.preview.png"),
              },
              {
                guidanceStrategy: "json-primary",
                sessionId: "20260315020000/json-primary",
                sessionDir: guidedSessionDir,
                transcriptPath: path.join(guidedSessionDir, "transcript.json"),
                guidanceHandoffPath: path.join(guidedSessionDir, "guidance.json"),
                agentInputPath: path.join(guidedSessionDir, "agent-input.txt"),
                explainabilityPath: path.join(guidedSessionDir, "explainability.json"),
                summaryPath: path.join(guidedSessionDir, "summary.json"),
                previewPath: path.join(guidedAttemptsDir, "001.preview.png"),
              },
            ],
            comparisons: [
              {
                baselineGuidanceStrategy: "prompt-summary",
                guidedGuidanceStrategy: "json-primary",
                comparisonDir,
                comparisonPath,
              },
            ],
          },
        ],
      }),
      "utf8",
    );

    const benchmarks = listGenerationBenchmarks(tempRoot);
    expect(benchmarks).toHaveLength(1);
    expect(benchmarks[0]).toEqual(expect.objectContaining({
      profileName: "SurfaceOps Benchmark Fixture Suite",
      surfaceIds: ["benchmark-shared-shell-web"],
      guidanceStrategies: ["prompt-summary", "json-primary"],
      modelFingerprint: "suite-model-fingerprint",
    }));

    const workbench = loadGenerationWorkbenchFromRoot({
      benchmarkDir,
      benchmarkId: "20260315020000",
      surfaceId: "benchmark-shared-shell-web",
    });
    expect(workbench.manifest?.suiteName).toBe("SurfaceOps Benchmark Fixture Suite");
    expect(workbench.selectedSurfaceId).toBe("benchmark-shared-shell-web");
    expect(workbench.guidedPrepared).toEqual({ summary: { text: "Shared shell guidance." } });
    expect(workbench.briefText).toContain("Shared shell benchmark brief.");
  });
});
