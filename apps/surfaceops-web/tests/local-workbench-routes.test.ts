import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as POSTChat } from "@/app/api/contracts/local/chat/route";
import { POST as POSTPublish } from "@/app/api/contracts/local/publish/route";
import { POST as POSTRerun } from "@/app/api/contracts/local/rerun/route";
import { GET as GETRun } from "@/app/api/contracts/local/runs/[runId]/route";
import { POST as POSTSuggestion } from "@/app/api/contracts/local/suggestions/[runId]/[suggestionId]/route";

const mocked = vi.hoisted(() => ({
  appendLocalWorkbenchChatMessage: vi.fn(),
  publishLocalWorkbenchContract: vi.fn(),
  startLocalWorkbenchRerun: vi.fn(),
  loadLocalWorkbenchRunDetail: vi.fn(),
  reviewLocalWorkbenchSuggestion: vi.fn(),
}));

vi.mock("@/lib/local-workbench/service", () => ({
  appendLocalWorkbenchChatMessage: mocked.appendLocalWorkbenchChatMessage,
  publishLocalWorkbenchContract: mocked.publishLocalWorkbenchContract,
  startLocalWorkbenchRerun: mocked.startLocalWorkbenchRerun,
  loadLocalWorkbenchRunDetail: mocked.loadLocalWorkbenchRunDetail,
  reviewLocalWorkbenchSuggestion: mocked.reviewLocalWorkbenchSuggestion,
}));

describe("local workbench routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts a local rerun", async () => {
    mocked.startLocalWorkbenchRerun.mockResolvedValue({ runId: "run-1", status: "succeeded" });
    const response = await POSTRerun();
    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      run: { runId: "run-1", status: "succeeded" },
    });
  });

  it("appends a local contract chat message", async () => {
    mocked.appendLocalWorkbenchChatMessage.mockResolvedValue(undefined);
    const response = await POSTChat(
      new Request("http://localhost/api/contracts/local/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "add highlight color #8BAE3F" }),
      }),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(mocked.appendLocalWorkbenchChatMessage).toHaveBeenCalledWith({
      message: "add highlight color #8BAE3F",
    });
  });

  it("publishes the local working UI AST", async () => {
    mocked.publishLocalWorkbenchContract.mockResolvedValue({
      publishId: "publish-1",
      status: "published",
      createdAt: "2026-03-16T18:00:00.000Z",
      sourceRunId: "run-1",
      astPath: "/tmp/publish-1/published-ui-ast.json",
      bundleRoot: "/tmp/publish-1/bundle",
      manifestPath: "/tmp/publish-1/bundle/manifest.json",
      generationPayloadPath: "/tmp/publish-1/generation.json",
      runtimePayloadPath: "/tmp/publish-1/runtime.json",
      lifecycleStage: "published",
      integrationEvidencePath: "/tmp/publish-1/integration-evidence.json",
      promotionRecordPath: "/tmp/publish-1/promotion-record.json",
      integrationEvidence: {
        consumer: "surfaceops-workbench",
        platform: "web",
        integratedAt: "2026-03-16T18:00:00.000Z",
        passCount: 2,
        warnCount: 0,
        blockCount: 0,
        exceptionCount: 0,
      },
      promotionReadinessPath: "/tmp/publish-1/promotion-readiness.json",
      promotionReadiness: null,
    });
    const response = await POSTPublish();
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      publish: {
        publishId: "publish-1",
        status: "published",
      },
    });
  });

  it("reviews a local suggestion", async () => {
    mocked.reviewLocalWorkbenchSuggestion.mockResolvedValue(undefined);
    const response = await POSTSuggestion(
      new Request("http://localhost/api/contracts/local/suggestions/run-1/suggestion-1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: "accepted" }),
      }),
      { params: Promise.resolve({ runId: "run-1", suggestionId: "suggestion-1" }) },
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it("loads structured run detail", async () => {
    mocked.loadLocalWorkbenchRunDetail.mockResolvedValue({
      run: {
        runId: "run-1",
        status: "succeeded",
        createdAt: "2026-03-13T12:00:00.000Z",
        completedAt: "2026-03-13T12:00:10.000Z",
        latestRunLabel: "Run run-1",
        model: "openai/gpt-oss-20b",
        currentPhase: null,
        phaseHistory: [],
        agentSummary: "Completed a bounded pass.",
        noChanges: false,
        toolCallCount: 2,
        writeCount: 1,
        lastToolName: "finish",
        lastError: null,
        transcriptPath: "/tmp/run-1/agent-trace.json",
        touchedFiles: ["apps/reference-target-web/app/page.tsx"],
        errorMessage: null,
        baselinePreview: { path: null, dataUrl: null },
        currentPreview: { path: null, dataUrl: null },
        baselineSummaryPath: null,
        currentSummaryPath: null,
        suggestionsPath: null,
        comparison: null,
        suggestions: [],
      },
      transcript: [],
      durationMs: 10_000,
      previewDebug: {
        baseline: {
          url: "http://127.0.0.1:4010",
          stdoutPath: "/tmp/run-1/baseline.preview.stdout.log",
          stderrPath: "/tmp/run-1/baseline.preview.stderr.log",
          stderrTail: ["ready"],
        },
        current: {
          url: null,
          stdoutPath: null,
          stderrPath: null,
          stderrTail: [],
        },
      },
      lastToolCall: null,
    });
    const response = await GETRun(
      new Request("http://localhost/api/contracts/local/runs/run-1"),
      { params: Promise.resolve({ runId: "run-1" }) },
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      run: {
        run: {
          runId: "run-1",
          status: "succeeded",
        },
        previewDebug: {
          baseline: {
            url: "http://127.0.0.1:4010",
          },
        },
      },
    });
  });

  it("returns 404 for missing run detail", async () => {
    mocked.loadLocalWorkbenchRunDetail.mockResolvedValue(null);
    const response = await GETRun(
      new Request("http://localhost/api/contracts/local/runs/missing"),
      { params: Promise.resolve({ runId: "missing" }) },
    );
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "Run missing not found.",
    });
  });
});
