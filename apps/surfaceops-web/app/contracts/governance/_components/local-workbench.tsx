"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { colors } from "@surfaces/ui/tokens/colors";
import type {
  LocalSuggestionStatus,
  LocalWorkbenchData,
  LocalWorkbenchRun,
  LocalWorkbenchRunDetail,
  LocalWorkbenchRunPhase,
  LocalWorkbenchTab,
} from "@/lib/local-workbench/types";

function shellPanel() {
  return {
    backgroundColor: colors.neutral[0],
    border: `1px solid ${colors.neutral[200]}`,
    borderRadius: 18,
    boxShadow: "0 24px 56px rgba(15, 23, 42, 0.08)",
  } as const;
}

function pill(active: boolean) {
  return {
    borderRadius: 999,
    border: `1px solid ${active ? colors.structure.primary : colors.neutral[200]}`,
    backgroundColor: active ? colors.structure.primary : colors.neutral[0],
    color: active ? colors.neutral[0] : colors.neutral[900],
    padding: "8px 14px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  } as const;
}

function primaryButton(disabled: boolean) {
  return {
    border: "none",
    borderRadius: 999,
    backgroundColor: colors.structure.primary,
    color: colors.neutral[0],
    padding: "12px 16px",
    fontSize: 14,
    fontWeight: 700,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.65 : 1,
  } as const;
}

function secondaryButton(disabled = false) {
  return {
    borderRadius: 999,
    border: `1px solid ${colors.neutral[200]}`,
    backgroundColor: colors.neutral[0],
    color: colors.neutral[900],
    padding: "12px 16px",
    fontSize: 14,
    fontWeight: 700,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.65 : 1,
  } as const;
}

function statusTone(status: string) {
  if (status === "succeeded" || status === "pass" || status === "accepted") return "#166534";
  if (status === "failed" || status === "block" || status === "rejected") return "#b91c1c";
  if (status === "warn") return "#b45309";
  return colors.neutral[600];
}

function latestRunTitle(run: LocalWorkbenchRun | null) {
  if (!run) return "No rerun yet";
  return `${run.latestRunLabel} · ${run.status}`;
}

function compactErrorMessage(errorMessage: string | null) {
  if (!errorMessage) return null;
  return errorMessage
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean) ?? errorMessage.trim();
}

type StateTone = "critical" | "warning" | "info" | "neutral";

function toneStyles(tone: StateTone) {
  if (tone === "critical") {
    return {
      border: "1px solid #fecaca",
      backgroundColor: "#fef2f2",
      accent: "#991b1b",
      text: "#7f1d1d",
      chipBackground: "#fee2e2",
    } as const;
  }
  if (tone === "warning") {
    return {
      border: "1px solid #fcd34d",
      backgroundColor: "#fffbeb",
      accent: "#92400e",
      text: "#78350f",
      chipBackground: "#fef3c7",
    } as const;
  }
  if (tone === "info") {
    return {
      border: `1px solid ${colors.neutral[200]}`,
      backgroundColor: "#eff6ff",
      accent: "#1d4ed8",
      text: "#1e3a8a",
      chipBackground: "#dbeafe",
    } as const;
  }
  return {
    border: `1px solid ${colors.neutral[200]}`,
    backgroundColor: colors.neutral[0],
    accent: colors.neutral[900],
    text: colors.neutral[600],
    chipBackground: colors.neutral[100],
  } as const;
}

function statusChip(status: string) {
  return {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: 999,
    padding: "4px 10px",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.04em",
    textTransform: "uppercase" as const,
    backgroundColor:
      status === "failed" || status === "block" || status === "rejected"
        ? "#fee2e2"
        : status === "warn"
          ? "#fef3c7"
          : status === "succeeded" || status === "pass" || status === "accepted"
            ? "#dcfce7"
            : colors.neutral[100],
    color: statusTone(status),
  };
}

type LatestResultState = {
  tone: StateTone;
  label: string;
  title: string;
  summary: string;
  detail: string | null;
};

function deriveLatestResultState({
  latestRun,
  latestError,
  latestRunOperatorNote,
  feedback,
  modelConfigured,
  modelManagementPath,
}: {
  latestRun: LocalWorkbenchRun | null;
  latestError: string | null;
  latestRunOperatorNote: string | null;
  feedback: string | null;
  modelConfigured: boolean;
  modelManagementPath: string | null;
}): LatestResultState {
  if (latestRun?.status === "failed" && latestError) {
    return {
      tone: "critical",
      label: "Run failed",
      title: latestRunTitle(latestRun),
      summary: "The latest regeneration failed before it produced a clean result.",
      detail: compactErrorMessage(latestError),
    };
  }

  if (latestRunOperatorNote) {
    return {
      tone: "warning",
      label: "Patch needed",
      title: "Needs another patch",
      summary: "The latest rerun changed files, but one accepted problem still remains unresolved.",
      detail: latestRunOperatorNote,
    };
  }

  if (feedback) {
    return {
      tone: "info",
      label: "Recent update",
      title: latestRunTitle(latestRun),
      summary: feedback,
      detail: null,
    };
  }

  if (!modelConfigured) {
    return {
      tone: "warning",
      label: "Setup required",
      title: latestRun ? latestRunTitle(latestRun) : "Local model unavailable",
      summary: "The workbench is readable, but regeneration is blocked until the local model is configured.",
      detail: modelManagementPath
        ? "Install and warm a managed local model from SurfaceOps setup before attempting another rerun."
        : "Set SURFACEOPS_LOCAL_LLM_BASE_URL and SURFACEOPS_LOCAL_LLM_MODEL to enable reruns.",
    };
  }

  if (!latestRun) {
    return {
      tone: "neutral",
      label: "Ready",
      title: "No rerun yet",
      summary: "Review the surface and UI AST, then trigger the first regeneration when you are ready to test the flow.",
      detail: null,
    };
  }

  return {
    tone: "neutral",
    label: "Current result",
    title: latestRunTitle(latestRun),
    summary: "The latest run completed. Use the preview and evidence summary to decide whether to refine or regenerate.",
    detail: null,
  };
}

function hasSuggestionStatus(statuses: LocalSuggestionStatus[], status: LocalSuggestionStatus) {
  return statuses.includes(status);
}

function nextActionCopy({
  latestRun,
  latestRunOperatorNote,
  modelConfigured,
  openSuggestionCount,
  acceptedSuggestionCount,
}: {
  latestRun: LocalWorkbenchRun | null;
  latestRunOperatorNote: string | null;
  modelConfigured: boolean;
  openSuggestionCount: number;
  acceptedSuggestionCount: number;
}) {
  if (!modelConfigured) {
    return "Refine the UI AST in chat now, then configure the local model before attempting another regeneration.";
  }
  if (openSuggestionCount > 0) {
    return `There ${openSuggestionCount === 1 ? "is" : "are"} ${openSuggestionCount} open suggestion${openSuggestionCount === 1 ? "" : "s"}. Review them below, accept the ones that should steer the next pass, then regenerate.`;
  }
  if (latestRun?.status === "failed") {
    return "Review the latest failure, then try another regeneration or switch to chat if the UI AST needs more guidance first.";
  }
  if (latestRunOperatorNote) {
    return "The last pass made progress but still needs another targeted patch. Regenerate again after reviewing the evidence.";
  }
  if (acceptedSuggestionCount > 0) {
    return "Accepted guidance is active. Regenerate when you want to test the next implementation pass against those decisions.";
  }
  if (!latestRun) {
    return "Trigger the first regeneration when you are ready to evaluate the surface against the current UI AST.";
  }
  return "If the latest result is close, refine in chat. If you need another implementation pass, regenerate.";
}

function phaseLabel(phase: LocalWorkbenchRunPhase) {
  switch (phase) {
    case "compile":
      return "Compile";
    case "prepare":
      return "Prepare";
    case "baseline-validation":
      return "Baseline validation";
    case "baseline-preview":
      return "Baseline preview";
    case "agent":
      return "Agent loop";
    case "current-validation":
      return "Current validation";
    case "current-preview":
      return "Current preview";
    case "finalize":
      return "Finalize";
    default:
      return phase;
  }
}

function formatDuration(durationMs: number | null) {
  if (durationMs === null) {
    return "unknown";
  }
  if (durationMs < 1_000) {
    return `${durationMs}ms`;
  }
  return `${(durationMs / 1000).toFixed(durationMs >= 10_000 ? 0 : 1)}s`;
}

function formatRate(rate: number | null) {
  if (rate === null) {
    return "n/a";
  }
  return `${Math.round(rate * 100)}%`;
}

export function LocalWorkbench({
  data,
  initialTab = "controls",
}: {
  data: LocalWorkbenchData;
  initialTab?: LocalWorkbenchTab;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<"baseline" | "current">("current");
  const [tab, setTab] = useState<LocalWorkbenchTab>(initialTab);
  const [chatDraft, setChatDraft] = useState("");
  const [pendingAction, setPendingAction] = useState<"rerun" | "chat" | "suggestion" | "publish" | "benchmark" | "export" | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(data.latestRun?.runId ?? data.runs[0]?.runId ?? null);
  const [selectedDetail, setSelectedDetail] = useState<LocalWorkbenchRunDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const latestRun = data.latestRun;
  const latestError = latestRun?.errorMessage ?? null;
  const latestRunOperatorNote = data.latestRunOperatorNote;
  const activeAcceptedSuggestions = data.activeAcceptedSuggestions;
  const preview = previewMode === "baseline" ? latestRun?.baselinePreview : latestRun?.currentPreview;
  const suggestions = latestRun?.suggestions ?? [];
  const latestResult = deriveLatestResultState({
    latestRun,
    latestError,
    latestRunOperatorNote,
    feedback,
    modelConfigured: data.localModel.configured,
    modelManagementPath: data.localModel.managementPath,
  });
  const latestResultStyles = toneStyles(latestResult.tone);
  const openSuggestions = suggestions.filter((suggestion) => hasSuggestionStatus(["proposed"], suggestion.status));
  const showGuidance = activeAcceptedSuggestions.length > 0 || openSuggestions.length > 0;
  const recentRuns = data.runs.slice(0, 3);
  const promotionReadiness = data.promotionReadiness;
  const promotionReadinessSurface =
    promotionReadiness?.surfaces.find((surface) => surface.surfaceId === data.target.id)
    ?? promotionReadiness?.surfaces[0]
    ?? null;
  const generationReadinessKpi =
    promotionReadinessSurface?.sourceKpis.find((entry) => entry.source === "generation")
    ?? promotionReadinessSurface?.sourceKpis[0]
    ?? null;
  const promotionBlockingChecks = promotionReadinessSurface?.checks.filter((entry) => !entry.ready) ?? [];
  const promotionReadinessStyles = toneStyles(
    promotionReadiness
      ? (promotionReadiness.summary.readyForPromotion ? "neutral" : "warning")
      : "info",
  );
  const lifecycle = data.lifecycle;
  const review = data.review;
  const selectedRunSummary = data.runs.find((entry) => entry.runId === selectedRunId) ?? latestRun ?? null;
  const activeTraceRun = selectedDetail?.run ?? selectedRunSummary ?? null;
  const previewDebug = selectedDetail?.previewDebug ?? null;
  const showImplementationDebug = Boolean(
    data.latestRunAgentInput.path
      || data.latestRunAgentInput.content
      || latestRun?.effectiveAstPath
      || latestRun?.explainabilityPath,
  );

  useEffect(() => {
    let cancelled = false;

    async function loadDetail(runId: string) {
      setIsLoadingDetail(true);
      setDetailError(null);
      try {
        const response = await fetch(`/api/contracts/local/runs/${encodeURIComponent(runId)}`);
        const json = await response.json();
        if (!response.ok || !json.ok) {
          throw new Error(json.error ?? `Could not load run ${runId}.`);
        }
        if (!cancelled) {
          setSelectedDetail(json.run as LocalWorkbenchRunDetail);
        }
      } catch (error) {
        if (!cancelled) {
          setSelectedDetail(null);
          setDetailError(error instanceof Error ? error.message : String(error));
        }
      } finally {
        if (!cancelled) {
          setIsLoadingDetail(false);
        }
      }
    }

    if (!selectedRunId) {
      setSelectedDetail(null);
      setDetailError(null);
      setIsLoadingDetail(false);
      return () => {
        cancelled = true;
      };
    }

    void loadDetail(selectedRunId);
    return () => {
      cancelled = true;
    };
  }, [selectedRunId]);

  function openModelSetup() {
    if (!data.localModel.managementPath) {
      return;
    }
    router.push(data.localModel.managementPath);
    router.refresh();
  }

  function runDesktopBenchmark() {
    const modelsBridge = window.surfaceopsDesktop?.models;
    if (!modelsBridge) {
      return;
    }
    startTransition(async () => {
      setPendingAction("benchmark");
      try {
        await modelsBridge.runBenchmark();
        setFeedback("Local benchmark completed.");
        router.refresh();
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : String(error));
      } finally {
        setPendingAction(null);
      }
    });
  }

  function exportDesktopBenchmark() {
    const modelsBridge = window.surfaceopsDesktop?.models;
    if (!modelsBridge) {
      return;
    }
    startTransition(async () => {
      setPendingAction("export");
      try {
        const exportedPath = await modelsBridge.exportBenchmark();
        setFeedback(exportedPath ? `Exported benchmark to ${exportedPath}` : "Benchmark export cancelled.");
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : String(error));
      } finally {
        setPendingAction(null);
      }
    });
  }

  async function startRerun() {
    const response = await fetch("/api/contracts/local/rerun", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const json = await response.json();
    if (!response.ok || !json.ok) {
      throw new Error(json.error ?? "Local rerun failed.");
    }
    setSelectedRunId(json.run.runId);
    setFeedback(
      json.run.status === "failed"
        ? `Regeneration ${json.run.runId} failed. Review the latest failure details before trying again.`
        : `Regeneration ${json.run.runId} completed with ${json.run.status}.`,
    );
    router.refresh();
  }

  async function sendChatMessage() {
    const message = chatDraft.trim();
    if (!message) return;
    const response = await fetch("/api/contracts/local/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    const json = await response.json();
    if (!response.ok || !json.ok) {
      throw new Error(json.error ?? "Contract chat update failed.");
    }
    setChatDraft("");
    setFeedback("Working UI AST updated. Review the latest result and regenerate when you want to test the change.");
    router.refresh();
  }

  async function publishContract() {
    const response = await fetch("/api/contracts/local/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const json = await response.json();
    if (!response.ok || !json.ok) {
      throw new Error(json.error ?? "Local UI AST publish failed.");
    }
    setFeedback(`Published revision ${json.publish.publishId}. Runtime and generation artifacts are frozen for this UI AST snapshot.`);
    router.refresh();
  }

  async function reviewSuggestion(suggestionId: string, decision: "accepted" | "rejected") {
    if (!latestRun) return;
    const response = await fetch(
      `/api/contracts/local/suggestions/${encodeURIComponent(latestRun.runId)}/${encodeURIComponent(suggestionId)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      },
    );
    const json = await response.json();
    if (!response.ok || !json.ok) {
      throw new Error(json.error ?? "Suggestion review failed.");
    }
    setFeedback(
      decision === "accepted"
        ? "Suggestion accepted. It will keep steering future regenerations until the finding is resolved or you reject it."
        : "Suggestion rejected and removed from active rerun guidance.",
    );
    router.refresh();
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #f8fafc 0%, #eef2ff 46%, #f8fafc 100%)",
        color: colors.neutral[900],
      }}
    >
      <div style={{ maxWidth: 1500, margin: "0 auto", padding: "32px 24px 56px" }}>
        <header
          style={{
            ...shellPanel(),
            padding: "24px 28px",
            marginBottom: 18,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 24,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: colors.neutral[600] }}>
              UI AST workbench
            </div>
            <h1 style={{ fontSize: 32, lineHeight: 1.04, margin: "8px 0 10px", fontWeight: 800 }}>
              {data.target.label}
            </h1>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, color: colors.neutral[600], fontSize: 13 }}>
              <span>{data.ast.astId}</span>
              <span>v{data.ast.version}</span>
              <span>Local-only reference-target flow</span>
            </div>
          </div>

          <div style={{ display: "grid", gap: 10, justifyItems: "end" }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
              {(["controls", "trace", "chat"] as const).map((nextTab) => (
                <button key={nextTab} type="button" onClick={() => setTab(nextTab)} style={pill(tab === nextTab)}>
                  {nextTab}
                </button>
              ))}
            </div>
            {tab === "controls" ? (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                {(["baseline", "current"] as const).map((mode) => (
                  <button key={mode} type="button" onClick={() => setPreviewMode(mode)} style={pill(previewMode === mode)}>
                    {mode}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </header>

        {tab === "controls" ? (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]" style={{ alignItems: "start" }}>
            <div style={{ display: "grid", gap: 18 }}>
              <section style={{ ...shellPanel(), overflow: "hidden" }}>
                <div
                  style={{
                    borderBottom: `1px solid ${colors.neutral[200]}`,
                    padding: "14px 18px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 16,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <strong style={{ display: "block", fontSize: 15 }}>
                      {previewMode === "baseline" ? "Baseline preview" : "Current preview"}
                    </strong>
                    <span style={{ fontSize: 12, color: colors.neutral[600] }}>
                      {previewMode === "baseline"
                        ? "Clean reference-target snapshot before local agent edits."
                        : "Local LLM result after one bounded implementation pass."}
                    </span>
                  </div>
                  <span style={{ fontSize: 12, color: colors.neutral[600] }}>
                    {latestRun?.completedAt ? new Date(latestRun.completedAt).toLocaleString() : "Awaiting first rerun"}
                  </span>
                </div>
                <div style={{ minHeight: 720, backgroundColor: "#edf2f7", display: "flex", alignItems: "center", justifyContent: "center", padding: 18 }}>
                  {preview?.dataUrl ? (
                    <img
                      alt={`${previewMode} preview`}
                      src={preview.dataUrl}
                      style={{
                        width: "100%",
                        height: "auto",
                        borderRadius: 16,
                        border: `1px solid ${colors.neutral[200]}`,
                        backgroundColor: colors.neutral[0],
                      }}
                    />
                  ) : (
                    <div style={{ textAlign: "center", color: colors.neutral[600], maxWidth: 420 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Preview unavailable</div>
                      <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                        Regenerate once to capture the baseline and current screenshots for this workbench.
                      </div>
                    </div>
                  )}
                </div>
              </section>

              <section style={{ ...shellPanel(), padding: 18, display: "grid", gap: 14 }}>
                <div>
                  <strong style={{ display: "block", fontSize: 15, marginBottom: 6 }}>Evidence summary</strong>
                  <div style={{ fontSize: 12, color: colors.neutral[600] }}>
                    Compare the current output against the baseline without repeating lifecycle status.
                  </div>
                </div>
                {latestRun?.comparison ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    <div style={{ border: `1px solid ${colors.neutral[200]}`, borderRadius: 14, padding: 14 }}>
                      <div style={{ fontSize: 12, color: colors.neutral[600], marginBottom: 8 }}>Baseline vs current</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                        <span style={{ ...statusChip(latestRun.comparison.baselineStatus), width: "fit-content" }}>
                          Baseline {latestRun.comparison.baselineStatus}
                        </span>
                        <span style={{ ...statusChip(latestRun.comparison.currentStatus), width: "fit-content" }}>
                          Current {latestRun.comparison.currentStatus}
                        </span>
                      </div>
                      <div style={{ display: "grid", gap: 6, fontSize: 13, color: colors.neutral[800] }}>
                        <div>Finding delta: {latestRun.comparison.findingCountDelta}</div>
                        <div>Blocking delta: {latestRun.comparison.blockingCountDelta}</div>
                      </div>
                    </div>
                    <div style={{ border: `1px solid ${colors.neutral[200]}`, borderRadius: 14, padding: 14 }}>
                      <div style={{ fontSize: 12, color: colors.neutral[600], marginBottom: 8 }}>Finding movement</div>
                      <div style={{ display: "grid", gap: 6, fontSize: 13, color: colors.neutral[800] }}>
                        <div>New: {latestRun.comparison.newFindingCodes.join(", ") || "none"}</div>
                        <div>Resolved: {latestRun.comparison.resolvedFindingCodes.join(", ") || "none"}</div>
                        <div>Baseline findings: {latestRun.comparison.baselineFindingCount}</div>
                        <div>Current findings: {latestRun.comparison.currentFindingCount}</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: colors.neutral[600] }}>
                    Evidence summary will appear after the first rerun produces comparable validation output.
                  </div>
                )}
              </section>
            </div>

            <aside style={{ display: "grid", gap: 18 }}>
              <section
                style={{
                  ...shellPanel(),
                  padding: 18,
                  border: latestResultStyles.border,
                  backgroundColor: latestResultStyles.backgroundColor,
                  display: "grid",
                  gap: 12,
                }}
              >
                <div>
                  <strong style={{ display: "block", fontSize: 15, marginBottom: 6 }}>Latest result</strong>
                  <div style={{ fontSize: 12, color: latestResultStyles.text }}>
                    Focus on the most recent outcome before choosing the next step.
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span
                    style={{
                      ...statusChip(latestRun?.status ?? latestResult.label.toLowerCase()),
                      backgroundColor: latestResultStyles.chipBackground,
                      color: latestResultStyles.accent,
                    }}
                  >
                    {latestResult.label}
                  </span>
                  <span style={{ fontSize: 12, color: latestResultStyles.text }}>
                    {latestRun?.completedAt ? new Date(latestRun.completedAt).toLocaleString() : "Awaiting first rerun"}
                  </span>
                </div>
                <div style={{ fontSize: 24, lineHeight: 1.1, fontWeight: 800, color: latestResultStyles.accent }}>
                  {latestResult.title}
                </div>
                <div style={{ fontSize: 14, lineHeight: 1.7, color: latestResultStyles.text }}>
                  {latestResult.summary}
                </div>
                {latestResult.detail ? (
                  <div style={{ fontSize: 12, lineHeight: 1.6, color: latestResultStyles.text }}>
                    {latestResult.detail}
                  </div>
                ) : null}
              </section>

              <section style={{ ...shellPanel(), padding: 18, display: "grid", gap: 12 }}>
                <div>
                  <strong style={{ display: "block", fontSize: 15, marginBottom: 6 }}>Next action</strong>
                  <div style={{ fontSize: 13, lineHeight: 1.7, color: colors.neutral[600] }}>
                    {nextActionCopy({
                      latestRun,
                      latestRunOperatorNote,
                      modelConfigured: data.localModel.configured,
                      openSuggestionCount: openSuggestions.length,
                      acceptedSuggestionCount: activeAcceptedSuggestions.length,
                    })}
                  </div>
                </div>
                <div style={{ display: "grid", gap: 10 }}>
                  <button
                    type="button"
                    disabled={isPending || !data.localModel.configured}
                    onClick={() =>
                      startTransition(async () => {
                        setPendingAction("rerun");
                        try {
                          await startRerun();
                        } catch (error) {
                          setFeedback(error instanceof Error ? error.message : String(error));
                        } finally {
                          setPendingAction(null);
                        }
                      })
                    }
                    style={primaryButton(isPending || !data.localModel.configured)}
                  >
                    {isPending && pendingAction === "rerun" ? "Regenerating..." : "Regenerate"}
                  </button>
                  <button type="button" onClick={() => setTab("chat")} style={secondaryButton()}>
                    Refine in chat
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      startTransition(async () => {
                        setPendingAction("publish");
                        try {
                          await publishContract();
                        } catch (error) {
                          setFeedback(error instanceof Error ? error.message : String(error));
                        } finally {
                          setPendingAction(null);
                        }
                      })
                    }
                    style={secondaryButton(isPending)}
                  >
                    {isPending && pendingAction === "publish" ? "Publishing..." : "Publish current UI AST"}
                  </button>
                  {data.localModel.managementPath ? (
                    <button type="button" onClick={openModelSetup} style={secondaryButton(isPending)}>
                      Manage local model
                    </button>
                  ) : null}
                  {data.localModel.managementPath ? (
                    <button
                      type="button"
                      disabled={isPending || !data.localModel.configured}
                      onClick={runDesktopBenchmark}
                      style={secondaryButton(isPending || !data.localModel.configured)}
                    >
                      {isPending && pendingAction === "benchmark" ? "Running benchmark..." : "Run local benchmark"}
                    </button>
                  ) : null}
                  {data.localModel.managementPath ? (
                    <button
                      type="button"
                      disabled={isPending || !data.localModel.lastBenchmarkSummary}
                      onClick={exportDesktopBenchmark}
                      style={secondaryButton(isPending || !data.localModel.lastBenchmarkSummary)}
                    >
                      {isPending && pendingAction === "export" ? "Exporting..." : "Export latest benchmark"}
                    </button>
                  ) : null}
                </div>
              </section>

              <section style={{ ...shellPanel(), padding: 18, display: "grid", gap: 12 }}>
                <div>
                  <strong style={{ display: "block", fontSize: 15, marginBottom: 6 }}>Published revisions</strong>
                  <div style={{ fontSize: 12, color: colors.neutral[600] }}>
                    Local publishes freeze the effective UI AST plus the compiled generation and runtime artifacts.
                  </div>
                </div>
                {data.latestPublish ? (
                  <article style={{ border: `1px solid ${colors.neutral[200]}`, borderRadius: 12, padding: 12, display: "grid", gap: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                      <strong style={{ fontSize: 13 }}>{data.latestPublish.publishId}</strong>
                      <span style={{ ...statusChip(data.latestPublish.status), width: "fit-content" }}>{data.latestPublish.status}</span>
                    </div>
                    <div style={{ fontSize: 12, color: colors.neutral[600] }}>
                      {new Date(data.latestPublish.createdAt).toLocaleString()}
                    </div>
                    <div style={{ fontSize: 12, color: colors.neutral[600] }}>
                      Runtime payload: {data.latestPublish.runtimePayloadPath}
                    </div>
                    <div style={{ fontSize: 12, color: colors.neutral[600] }}>
                      Generation payload: {data.latestPublish.generationPayloadPath}
                    </div>
                    <div style={{ fontSize: 12, color: colors.neutral[600] }}>
                      Lifecycle stage: {data.latestPublish.lifecycleStage}
                    </div>
                    <div style={{ fontSize: 12, color: colors.neutral[600] }}>
                      Integration evidence: {data.latestPublish.integrationEvidencePath ?? "Unavailable"}
                    </div>
                    {data.latestPublish.integrationEvidence ? (
                      <div style={{ fontSize: 12, color: colors.neutral[600] }}>
                        Integration summary: {data.latestPublish.integrationEvidence.passCount} pass,{" "}
                        {data.latestPublish.integrationEvidence.warnCount} warn,{" "}
                        {data.latestPublish.integrationEvidence.blockCount} block,{" "}
                        {data.latestPublish.integrationEvidence.exceptionCount} exception
                        {data.latestPublish.integrationEvidence.exceptionCount === 1 ? "" : "s"}
                      </div>
                    ) : null}
                    <div style={{ fontSize: 12, color: colors.neutral[600] }}>
                      Promotion record: {data.latestPublish.promotionRecordPath ?? "Unavailable"}
                    </div>
                    <div style={{ fontSize: 12, color: colors.neutral[600] }}>
                      Readiness artifact: {data.latestPublish.promotionReadinessPath ?? "Unavailable"}
                    </div>
                    {data.latestPublish.promotionReadiness ? (
                      <div style={{ fontSize: 12, color: colors.neutral[600] }}>
                        Readiness summary: {data.latestPublish.promotionReadiness.summary.readySurfaces}/
                        {data.latestPublish.promotionReadiness.summary.totalSurfaces} surfaces ready
                      </div>
                    ) : null}
                  </article>
                ) : (
                  <div style={{ fontSize: 13, color: colors.neutral[600] }}>
                    No published revisions yet. Publish is gated by the current readiness artifact, not just the latest run status.
                  </div>
                )}
              </section>

              <section
                style={{
                  ...shellPanel(),
                  padding: 18,
                  display: "grid",
                  gap: 12,
                  border: promotionReadinessStyles.border,
                  backgroundColor: promotionReadinessStyles.backgroundColor,
                }}
              >
                <div>
                  <strong style={{ display: "block", fontSize: 15, marginBottom: 6 }}>Publish readiness</strong>
                  <div style={{ fontSize: 12, color: promotionReadinessStyles.text }}>
                    Publish now uses a frozen readiness artifact backed by canonical generation evidence and bundle-derived compatibility provenance.
                  </div>
                </div>
                {promotionReadiness && promotionReadinessSurface ? (
                  <>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                      <span
                        style={{
                          ...statusChip(promotionReadiness.summary.readyForPromotion ? "pass" : "block"),
                          backgroundColor: promotionReadinessStyles.chipBackground,
                          color: promotionReadinessStyles.accent,
                        }}
                      >
                        {promotionReadiness.summary.readyForPromotion ? "Ready to publish" : "Publish blocked"}
                      </span>
                      <span style={{ fontSize: 12, color: promotionReadinessStyles.text }}>
                        Updated {new Date(promotionReadiness.generatedAt).toLocaleString()}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, lineHeight: 1.7, color: promotionReadinessStyles.text }}>
                      Required sources: {promotionReadiness.requiredSources.join(", ") || "none"}
                    </div>
                    {generationReadinessKpi ? (
                      <div style={{ display: "grid", gap: 10 }}>
                        <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: promotionReadinessStyles.text }}>
                          {generationReadinessKpi.source} KPIs
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
                          <div style={{ border: `1px solid ${colors.neutral[200]}`, borderRadius: 12, padding: 12, backgroundColor: colors.neutral[0] }}>
                            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: colors.neutral[600], marginBottom: 6 }}>
                              Pass rate
                            </div>
                            <div style={{ fontSize: 20, fontWeight: 800, color: colors.neutral[900] }}>
                              {formatRate(generationReadinessKpi.passRate)}
                            </div>
                            <div style={{ fontSize: 12, color: colors.neutral[600] }}>
                              {generationReadinessKpi.passedRuns}/{generationReadinessKpi.totalRuns} passing runs
                            </div>
                          </div>
                          <div style={{ border: `1px solid ${colors.neutral[200]}`, borderRadius: 12, padding: 12, backgroundColor: colors.neutral[0] }}>
                            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: colors.neutral[600], marginBottom: 6 }}>
                              Blocking rate
                            </div>
                            <div style={{ fontSize: 20, fontWeight: 800, color: colors.neutral[900] }}>
                              {formatRate(generationReadinessKpi.blockingRate)}
                            </div>
                            <div style={{ fontSize: 12, color: colors.neutral[600] }}>
                              {generationReadinessKpi.blockingRuns}/{generationReadinessKpi.totalRuns} blocked runs
                            </div>
                          </div>
                          <div style={{ border: `1px solid ${colors.neutral[200]}`, borderRadius: 12, padding: 12, backgroundColor: colors.neutral[0] }}>
                            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: colors.neutral[600], marginBottom: 6 }}>
                              Time to green
                            </div>
                            <div style={{ fontSize: 20, fontWeight: 800, color: colors.neutral[900] }}>
                              {formatDuration(generationReadinessKpi.timeToGreen.latestMs)}
                            </div>
                            <div style={{ fontSize: 12, color: colors.neutral[600] }}>
                              Avg {formatDuration(generationReadinessKpi.timeToGreen.averageMs)} across {generationReadinessKpi.timeToGreen.samples} sample(s)
                            </div>
                          </div>
                          <div style={{ border: `1px solid ${colors.neutral[200]}`, borderRadius: 12, padding: 12, backgroundColor: colors.neutral[0] }}>
                            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: colors.neutral[600], marginBottom: 6 }}>
                              Recurring findings
                            </div>
                            <div style={{ fontSize: 13, lineHeight: 1.7, color: colors.neutral[900] }}>
                              {generationReadinessKpi.recurringFindingCodes.length > 0
                                ? generationReadinessKpi.recurringFindingCodes
                                    .map((entry) => `${entry.code} (${entry.count})`)
                                    .join(", ")
                                : "None"}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}
                    {promotionBlockingChecks.length > 0 ? (
                      <div style={{ display: "grid", gap: 10 }}>
                        <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: promotionReadinessStyles.text }}>
                          Blocking checks
                        </div>
                        {promotionBlockingChecks.map((check) => (
                          <article
                            key={`${check.source}:${check.code}`}
                            style={{ border: `1px solid ${colors.neutral[200]}`, borderRadius: 12, padding: 12, backgroundColor: colors.neutral[0] }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", marginBottom: 6 }}>
                              <strong style={{ fontSize: 13 }}>{check.code}</strong>
                              <span style={{ ...statusChip("block"), width: "fit-content" }}>{check.source}</span>
                            </div>
                            <div style={{ fontSize: 13, color: colors.neutral[800], lineHeight: 1.6 }}>{check.message}</div>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: 13, color: promotionReadinessStyles.text }}>
                        Current generation evidence is fresh, UI-AST-matched, and ready to freeze into a publish.
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ fontSize: 13, color: promotionReadinessStyles.text }}>
                    Readiness evidence is not available yet. Run a regeneration to seed canonical publish evidence.
                  </div>
                )}
              </section>

              {showGuidance ? (
                <section style={{ ...shellPanel(), padding: 18, display: "grid", gap: 16 }}>
                  <div>
                    <strong style={{ display: "block", fontSize: 15, marginBottom: 6 }}>Guidance</strong>
                    <div style={{ fontSize: 12, color: colors.neutral[600] }}>
                      Only the guidance that can affect the next pass stays visible here.
                    </div>
                  </div>

                  {activeAcceptedSuggestions.length > 0 ? (
                    <div style={{ display: "grid", gap: 10 }}>
                      <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: colors.neutral[600] }}>
                        Accepted guidance
                      </div>
                      {activeAcceptedSuggestions.map((suggestion) => (
                        <article key={suggestion.findingCode} style={{ border: `1px solid ${colors.neutral[200]}`, borderRadius: 12, padding: 12 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
                            <strong style={{ fontSize: 13 }}>{suggestion.findingCode}</strong>
                            <span style={{ ...statusChip("accepted"), width: "fit-content" }}>accepted</span>
                          </div>
                          <div style={{ fontSize: 13, color: colors.neutral[800], marginBottom: 8 }}>{suggestion.summary}</div>
                          <div style={{ fontSize: 12, color: colors.neutral[600] }}>{suggestion.suggestedPath}</div>
                          {suggestion.rationale ? (
                            <div style={{ marginTop: 8, fontSize: 12, color: colors.neutral[600] }}>{suggestion.rationale}</div>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  ) : null}

                  {openSuggestions.length > 0 ? (
                    <div style={{ display: "grid", gap: 10 }}>
                      <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: colors.neutral[600] }}>
                        Open suggestions
                      </div>
                      {openSuggestions.map((suggestion) => (
                        <article key={suggestion.suggestionId} style={{ border: `1px solid ${colors.neutral[200]}`, borderRadius: 12, padding: 12 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
                            <strong style={{ fontSize: 13 }}>{suggestion.findingCode}</strong>
                            <span style={{ ...statusChip(suggestion.status), width: "fit-content" }}>{suggestion.status}</span>
                          </div>
                          <div style={{ fontSize: 13, color: colors.neutral[800], marginBottom: 8 }}>{suggestion.summary}</div>
                          <div style={{ fontSize: 12, color: colors.neutral[600], marginBottom: 10 }}>{suggestion.suggestedPath}</div>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <button
                              type="button"
                              onClick={() =>
                                startTransition(async () => {
                                  setPendingAction("suggestion");
                                  try {
                                    await reviewSuggestion(suggestion.suggestionId, "accepted");
                                  } catch (error) {
                                    setFeedback(error instanceof Error ? error.message : String(error));
                                  } finally {
                                    setPendingAction(null);
                                  }
                                })
                              }
                              style={pill(false)}
                            >
                              Accept
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                startTransition(async () => {
                                  setPendingAction("suggestion");
                                  try {
                                    await reviewSuggestion(suggestion.suggestionId, "rejected");
                                  } catch (error) {
                                    setFeedback(error instanceof Error ? error.message : String(error));
                                  } finally {
                                    setPendingAction(null);
                                  }
                                })
                              }
                              style={pill(false)}
                            >
                              Reject
                            </button>
                          </div>
                          {suggestion.rationale ? (
                            <div style={{ marginTop: 8, fontSize: 12, color: colors.neutral[600] }}>{suggestion.rationale}</div>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  ) : null}
                </section>
              ) : null}

              <details data-testid="local-workbench-technical-context" style={{ ...shellPanel(), padding: 18 }}>
                <summary style={{ cursor: "pointer", fontSize: 15, fontWeight: 700 }}>Technical context</summary>
                <div style={{ display: "grid", gap: 14, marginTop: 14 }}>
                  <section style={{ border: `1px solid ${colors.neutral[200]}`, borderRadius: 14, padding: 14 }}>
                    <strong style={{ display: "block", marginBottom: 10 }}>UI AST summary</strong>
                    <div style={{ display: "grid", gap: 6, fontSize: 13, color: colors.neutral[800] }}>
                      <div>ID: {data.ast.astId}</div>
                      <div>Version: {data.ast.version}</div>
                      <div>Platforms: {data.ast.platformIds.join(", ") || "none"}</div>
                      <div>Max width: {data.ast.maxContentWidth ?? "not specified"}</div>
                      <div>Color policy: {data.ast.colorPolicy}</div>
                      <div>Sections: {data.ast.requiredSections.join(", ") || "none"}</div>
                      <div>Fonts: {data.ast.allowedFonts.join(", ") || "none"}</div>
                      <div>Owner: {data.ast.owner ?? "unassigned"}</div>
                      <div>Governance status: {data.ast.governanceStatus ?? "draft"}</div>
                      <div>Runtime policy: {data.ast.runtimePolicy}</div>
                      <div>Mutation mode: {data.ast.mutationMode ?? "unspecified"}</div>
                    </div>
                  </section>

                  <section style={{ border: `1px solid ${colors.neutral[200]}`, borderRadius: 14, padding: 14 }}>
                    <strong style={{ display: "block", marginBottom: 10 }}>Lifecycle and review</strong>
                    <div style={{ display: "grid", gap: 6, fontSize: 13, color: colors.neutral[800] }}>
                      <div>Lifecycle stage: {lifecycle.stage}</div>
                      <div>Validation status: {lifecycle.validationStatus}</div>
                      <div>Approval status: {lifecycle.approvalStatus}</div>
                      <div>Publication status: {lifecycle.publicationStatus}</div>
                      <div>Observation status: {lifecycle.observationStatus}</div>
                      <div>Required roles: {lifecycle.requiredRoles.join(", ") || "none"}</div>
                      <div>Review status: {review.status}</div>
                      <div>Requires human review: {review.requiresHumanReview ? "yes" : "no"}</div>
                      <div>Total changes: {review.changeCount}</div>
                      <div>Node changes: {review.nodeChangeCount}</div>
                      <div>Governance changes: {review.governanceChangeCount}</div>
                      <div>Platform changes: {review.platformChangeCount}</div>
                    </div>
                  </section>

                  <section style={{ border: `1px solid ${colors.neutral[200]}`, borderRadius: 14, padding: 14 }}>
                    <strong style={{ display: "block", marginBottom: 10 }}>Model readiness</strong>
                    <div style={{ display: "grid", gap: 6, fontSize: 13, color: colors.neutral[800] }}>
                      <div>Configured: {data.localModel.configured ? "yes" : "no"}</div>
                      <div>Model: {data.localModel.model ?? "Unavailable"}</div>
                      <div>Base URL: {data.localModel.baseUrl ?? "Unavailable"}</div>
                      <div>Runtime: {data.localModel.runtimeStatus?.phase ?? "Unavailable"}</div>
                      {data.localModel.lastBenchmarkSummary ? (
                        <div>
                          Last benchmark: {new Date(data.localModel.lastBenchmarkSummary.createdAt).toLocaleString()}
                        </div>
                      ) : null}
                    </div>
                  </section>
                </div>
              </details>

              <section style={{ ...shellPanel(), padding: 18, display: "grid", gap: 14 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <strong style={{ display: "block", fontSize: 15, marginBottom: 6 }}>Recent runs</strong>
                    <div style={{ fontSize: 12, color: colors.neutral[600] }}>
                      Use the trace tab to inspect the full local run history without leaving the workbench.
                    </div>
                  </div>
                </div>

                {recentRuns.length === 0 ? (
                  <div style={{ fontSize: 13, color: colors.neutral[600] }}>No local reruns recorded yet.</div>
                ) : (
                  <div style={{ display: "grid", gap: 10 }}>
                    {recentRuns.map((run) => (
                      <article
                        key={run.runId}
                        data-testid="local-workbench-recent-run"
                        style={{ border: `1px solid ${colors.neutral[200]}`, borderRadius: 12, padding: 12 }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 4, alignItems: "center" }}>
                          <strong style={{ fontSize: 13 }}>{run.latestRunLabel}</strong>
                          <span style={{ ...statusChip(run.status), width: "fit-content" }}>{run.status}</span>
                        </div>
                        <div style={{ fontSize: 12, color: colors.neutral[600] }}>
                          {new Date(run.createdAt).toLocaleString()}
                        </div>
                        <div style={{ fontSize: 12, color: colors.neutral[600], marginTop: 4 }}>
                          {run.touchedFiles.join(", ") || "No touched files"}
                        </div>
                        {run.errorMessage ? (
                          <div style={{ fontSize: 12, color: colors.neutral[600], marginTop: 8, lineHeight: 1.5 }}>
                            {compactErrorMessage(run.errorMessage)}
                          </div>
                        ) : null}
                        <div style={{ marginTop: 10 }}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRunId(run.runId);
                              setTab("trace");
                            }}
                            style={secondaryButton()}
                          >
                            Inspect trace
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </aside>
          </div>
        ) : tab === "trace" ? (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]" style={{ alignItems: "start" }}>
            <section style={{ display: "grid", gap: 18 }}>
              {!activeTraceRun ? (
                <section style={{ ...shellPanel(), padding: 18, fontSize: 13, color: colors.neutral[600] }}>
                  Run the local LLM once to populate the trace timeline and preview debug details.
                </section>
              ) : (
                <>
                  <section style={{ ...shellPanel(), padding: 18, display: "grid", gap: 14 }}>
                    <div>
                      <strong style={{ display: "block", fontSize: 15, marginBottom: 6 }}>Trace summary</strong>
                      <div style={{ fontSize: 12, color: colors.neutral[600] }}>
                        Inspect the selected run without changing the decision-first controls flow.
                      </div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div style={{ border: `1px solid ${colors.neutral[200]}`, borderRadius: 14, padding: 14 }}>
                        <div style={{ display: "grid", gap: 6, fontSize: 13, color: colors.neutral[800] }}>
                          <div>Run: {activeTraceRun.latestRunLabel}</div>
                          <div>Status: <span style={{ color: statusTone(activeTraceRun.status), fontWeight: 700 }}>{activeTraceRun.status}</span></div>
                          <div>Model: {activeTraceRun.model ?? data.localModel.model ?? "unknown"}</div>
                          <div>Duration: {formatDuration(selectedDetail?.durationMs ?? null)}</div>
                          <div>Tool calls: {activeTraceRun.toolCallCount}</div>
                          <div>Writes: {activeTraceRun.writeCount}</div>
                          <div>Last tool: {activeTraceRun.lastToolName ?? "none recorded"}</div>
                        </div>
                      </div>
                      <div style={{ border: `1px solid ${colors.neutral[200]}`, borderRadius: 14, padding: 14 }}>
                        <div style={{ display: "grid", gap: 6, fontSize: 13, color: colors.neutral[800] }}>
                          <div>Created: {new Date(activeTraceRun.createdAt).toLocaleString()}</div>
                          <div>Completed: {activeTraceRun.completedAt ? new Date(activeTraceRun.completedAt).toLocaleString() : "still running"}</div>
                          <div>UI AST snapshot: {activeTraceRun.effectiveAstPath ?? "Unavailable"}</div>
                          <div>Explainability artifact: {activeTraceRun.explainabilityPath ?? "Unavailable"}</div>
                          <div>Agent input path: {activeTraceRun.agentInputPath ?? "Unavailable"}</div>
                          {activeTraceRun.agentSummary ? <div>Finish summary: {activeTraceRun.agentSummary}</div> : null}
                        </div>
                      </div>
                    </div>
                    {activeTraceRun.lastError ? (
                      <div style={{ fontSize: 13, color: "#b91c1c" }}>
                        Failure: {activeTraceRun.lastError.phase === "unknown" ? "Unknown phase" : phaseLabel(activeTraceRun.lastError.phase)} · {activeTraceRun.lastError.message}
                      </div>
                    ) : null}
                  </section>

                  <section style={{ ...shellPanel(), padding: 18, display: "grid", gap: 14 }}>
                    <div>
                      <strong style={{ display: "block", fontSize: 15, marginBottom: 6 }}>Phase timeline</strong>
                      <div style={{ fontSize: 12, color: colors.neutral[600] }}>
                        The full trace stays attached to the selected run, including failed preview phases.
                      </div>
                    </div>
                    <div style={{ display: "grid", gap: 10 }}>
                      {activeTraceRun.phaseHistory.length === 0 ? (
                        <div style={{ fontSize: 13, color: colors.neutral[600] }}>No phase history recorded for this run.</div>
                      ) : (
                        activeTraceRun.phaseHistory.map((entry) => (
                          <article key={`${entry.phase}-${entry.startedAt}`} style={{ border: `1px solid ${colors.neutral[200]}`, borderRadius: 12, padding: 12 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 4, alignItems: "center" }}>
                              <strong style={{ fontSize: 13 }}>{phaseLabel(entry.phase)}</strong>
                              <span style={{ ...statusChip(entry.status), width: "fit-content" }}>{entry.status}</span>
                            </div>
                            <div style={{ fontSize: 12, color: colors.neutral[600] }}>
                              {new Date(entry.startedAt).toLocaleString()}
                              {entry.completedAt ? ` → ${new Date(entry.completedAt).toLocaleTimeString()}` : ""}
                            </div>
                            {entry.message ? (
                              <div style={{ fontSize: 12, color: colors.neutral[600], marginTop: 6 }}>{entry.message}</div>
                            ) : null}
                          </article>
                        ))
                      )}
                    </div>
                  </section>

                  <section style={{ ...shellPanel(), padding: 18, display: "grid", gap: 14 }}>
                    <div>
                      <strong style={{ display: "block", fontSize: 15, marginBottom: 6 }}>Preview debug</strong>
                      <div style={{ fontSize: 12, color: colors.neutral[600] }}>
                        These server logs help explain preview startup and capture failures.
                      </div>
                    </div>
                    {isLoadingDetail ? (
                      <div style={{ fontSize: 13, color: colors.neutral[600] }}>Loading preview debug...</div>
                    ) : detailError ? (
                      <div style={{ fontSize: 13, color: "#b91c1c" }}>{detailError}</div>
                    ) : previewDebug ? (
                      <div className="grid gap-3 md:grid-cols-2">
                        {(["baseline", "current"] as const).map((label) => {
                          const details = previewDebug[label];
                          const hasDebug = details.url || details.stdoutPath || details.stderrPath || details.stderrTail.length > 0;
                          return (
                            <article key={label} style={{ border: `1px solid ${colors.neutral[200]}`, borderRadius: 12, padding: 12 }}>
                              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
                                {label === "baseline" ? "Baseline preview" : "Current preview"}
                              </div>
                              {hasDebug ? (
                                <div style={{ display: "grid", gap: 6, fontSize: 12, color: colors.neutral[800] }}>
                                  <div>URL: {details.url ?? "not recorded"}</div>
                                  <div>stdout log: {details.stdoutPath ?? "not recorded"}</div>
                                  <div>stderr log: {details.stderrPath ?? "not recorded"}</div>
                                  <div>stderr tail:</div>
                                  <pre style={{ margin: 0, padding: 12, fontSize: 12, lineHeight: 1.6, whiteSpace: "pre-wrap", backgroundColor: "#f8fafc", borderRadius: 12, overflowX: "auto" }}>
                                    {details.stderrTail.length > 0 ? details.stderrTail.join("\n") : "No stderr output recorded."}
                                  </pre>
                                </div>
                              ) : (
                                <div style={{ fontSize: 13, color: colors.neutral[600] }}>
                                  No preview-server debug details were recorded for this run.
                                </div>
                              )}
                            </article>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{ fontSize: 13, color: colors.neutral[600] }}>
                        No preview debug information is available for this run yet.
                      </div>
                    )}
                  </section>

                  <section style={{ ...shellPanel(), padding: 18, display: "grid", gap: 14 }}>
                    <div>
                      <strong style={{ display: "block", fontSize: 15, marginBottom: 6 }}>Last tool activity</strong>
                      <div style={{ fontSize: 12, color: colors.neutral[600] }}>
                        The most recent tool payload helps explain the final agent step before completion or failure.
                      </div>
                    </div>
                    {isLoadingDetail ? (
                      <div style={{ fontSize: 13, color: colors.neutral[600] }}>Loading run detail...</div>
                    ) : detailError ? (
                      <div style={{ fontSize: 13, color: "#b91c1c" }}>{detailError}</div>
                    ) : selectedDetail?.lastToolCall ? (
                      <div className="grid gap-3 md:grid-cols-2">
                        <div style={{ border: `1px solid ${colors.neutral[200]}`, borderRadius: 12, padding: 12 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
                            Last tool: {selectedDetail.lastToolCall.name}
                          </div>
                          <pre style={{ margin: 0, padding: 12, fontSize: 12, lineHeight: 1.6, whiteSpace: "pre-wrap", backgroundColor: "#f8fafc", borderRadius: 12, overflowX: "auto" }}>
                            {JSON.stringify(selectedDetail.lastToolCall.args, null, 2)}
                          </pre>
                        </div>
                        <div style={{ border: `1px solid ${colors.neutral[200]}`, borderRadius: 12, padding: 12 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Tool result</div>
                          <pre style={{ margin: 0, padding: 12, fontSize: 12, lineHeight: 1.6, whiteSpace: "pre-wrap", backgroundColor: "#f8fafc", borderRadius: 12, overflowX: "auto" }}>
                            {JSON.stringify(selectedDetail.lastToolCall.result, null, 2)}
                          </pre>
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: 13, color: colors.neutral[600] }}>
                        No tool activity was recorded for this run yet.
                      </div>
                    )}
                  </section>
                </>
              )}
            </section>

            <aside style={{ display: "grid", gap: 18 }}>
              <section style={{ ...shellPanel(), padding: 18, display: "grid", gap: 14 }}>
                <div>
                  <strong style={{ display: "block", fontSize: 15, marginBottom: 6 }}>Run history</strong>
                  <div style={{ fontSize: 12, color: colors.neutral[600] }}>
                    Pick any run to inspect its phase history and preview debug artifacts.
                  </div>
                </div>
                {data.runs.length === 0 ? (
                  <div style={{ fontSize: 13, color: colors.neutral[600] }}>No local reruns recorded yet.</div>
                ) : (
                  <div style={{ display: "grid", gap: 10 }}>
                    {data.runs.map((run) => {
                      const isSelected = run.runId === activeTraceRun?.runId;
                      return (
                        <button
                          key={run.runId}
                          type="button"
                          onClick={() => setSelectedRunId(run.runId)}
                          style={{
                            textAlign: "left",
                            border: `1px solid ${isSelected ? colors.structure.primary : colors.neutral[200]}`,
                            backgroundColor: isSelected ? "#eef2ff" : colors.neutral[0],
                            borderRadius: 12,
                            padding: 12,
                            cursor: "pointer",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                            <strong style={{ fontSize: 13 }}>{run.latestRunLabel}</strong>
                            <span style={{ fontSize: 12, color: statusTone(run.status) }}>{run.status}</span>
                          </div>
                          <div style={{ fontSize: 12, color: colors.neutral[600] }}>
                            {new Date(run.createdAt).toLocaleString()}
                          </div>
                          <div style={{ fontSize: 12, color: colors.neutral[600], marginTop: 4 }}>
                            {run.currentPhase ? `${phaseLabel(run.currentPhase)} · ` : ""}
                            {run.touchedFiles.join(", ") || "No touched files"}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>

              <details style={{ ...shellPanel(), padding: 18 }}>
                <summary style={{ cursor: "pointer", fontSize: 15, fontWeight: 700 }}>Trace context</summary>
                <div style={{ display: "grid", gap: 10, marginTop: 14, fontSize: 12, color: colors.neutral[600] }}>
                  <div>Configured: {data.localModel.configured ? "yes" : "no"}</div>
                  <div>Model: {data.localModel.model ?? "Unavailable"}</div>
                  <div>Base URL: {data.localModel.baseUrl ?? "Unavailable"}</div>
                  <div>Runtime: {data.localModel.runtimeStatus?.phase ?? "Unavailable"}</div>
                  <div>Run root: {data.runRoot}</div>
                </div>
              </details>
            </aside>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]" style={{ alignItems: "start" }}>
            <section style={{ ...shellPanel(), padding: 18 }}>
              <section style={{ border: `1px solid ${colors.neutral[200]}`, borderRadius: 16, overflow: "hidden" }}>
                <div style={{ padding: "14px 16px", borderBottom: `1px solid ${colors.neutral[200]}` }}>
                  <strong style={{ display: "block", fontSize: 15 }}>Designer chat</strong>
                  <div style={{ fontSize: 12, color: colors.neutral[600], marginTop: 4 }}>
                    Refine the UI AST here, then return to controls when you want to evaluate the next implementation pass.
                  </div>
                </div>
                <div style={{ display: "grid", gap: 12, padding: 16, maxHeight: 560, overflowY: "auto" }}>
                  {data.chat.map((message) => (
                    <section
                      key={message.id}
                      style={{
                        borderRadius: 16,
                        border: `1px solid ${message.role === "user" ? "#bfdbfe" : message.role === "assistant" ? colors.neutral[200] : "#c7d2fe"}`,
                        backgroundColor: message.role === "user" ? "#eff6ff" : message.role === "assistant" ? colors.neutral[0] : "#eef2ff",
                        padding: 14,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
                        <div style={{ fontSize: 12, color: colors.neutral[600] }}>{message.title}</div>
                        <div style={{ fontSize: 11, color: colors.neutral[400] }}>{new Date(message.createdAt).toLocaleString()}</div>
                      </div>
                      <div style={{ fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap", color: colors.neutral[800] }}>
                        {message.content}
                      </div>
                    </section>
                  ))}
                </div>
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    startTransition(async () => {
                      setPendingAction("chat");
                      try {
                        await sendChatMessage();
                      } catch (error) {
                        setFeedback(error instanceof Error ? error.message : String(error));
                      } finally {
                        setPendingAction(null);
                      }
                    });
                  }}
                  style={{ padding: 16, borderTop: `1px solid ${colors.neutral[200]}`, display: "grid", gap: 10 }}
                >
                  <textarea
                    value={chatDraft}
                    onChange={(event) => setChatDraft(event.target.value)}
                    placeholder='Try: "We need a highlight color for our gray UI, here is the hex value #8BAE3F"'
                    rows={4}
                    style={{
                      width: "100%",
                      borderRadius: 12,
                      border: `1px solid ${colors.neutral[200]}`,
                      padding: 12,
                      resize: "vertical",
                      font: "inherit",
                      color: colors.neutral[900],
                    }}
                  />
                  <button
                    type="submit"
                    disabled={isPending || chatDraft.trim().length === 0}
                    style={primaryButton(isPending || chatDraft.trim().length === 0)}
                  >
                    {isPending && pendingAction === "chat" ? "Updating UI AST..." : "Send to UI AST shaper"}
                  </button>
                </form>
              </section>
            </section>

            <aside style={{ display: "grid", gap: 18 }}>
              <section style={{ ...shellPanel(), padding: 16, display: "grid", gap: 14 }}>
                <div>
                  <strong style={{ display: "block", fontSize: 15, marginBottom: 8 }}>Active UI AST changes</strong>
                  <div style={{ display: "grid", gap: 10 }}>
                    {data.activeAstChanges.length === 0 ? (
                      <div style={{ fontSize: 13, color: colors.neutral[600] }}>No working UI AST deltas yet.</div>
                    ) : (
                      data.activeAstChanges.map((change) => (
                        <article key={change.id} style={{ border: `1px solid ${colors.neutral[200]}`, borderRadius: 12, padding: 12 }}>
                          <div style={{ fontSize: 12, color: colors.neutral[600], marginBottom: 6 }}>{change.path}</div>
                          <div style={{ fontSize: 13, color: colors.neutral[900], marginBottom: 6 }}>{change.summary}</div>
                          <div style={{ fontSize: 12, color: colors.neutral[600] }}>Value: {String(change.value)}</div>
                        </article>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <strong style={{ display: "block", fontSize: 15, marginBottom: 8 }}>Captured designer notes</strong>
                  <div style={{ display: "grid", gap: 10 }}>
                    {data.activeDesignerNotes.length === 0 ? (
                      <div style={{ fontSize: 13, color: colors.neutral[600] }}>No captured designer notes are active.</div>
                    ) : (
                      data.activeDesignerNotes.map((note) => (
                        <article key={note.id} style={{ border: `1px solid ${colors.neutral[200]}`, borderRadius: 12, padding: 12 }}>
                          <div style={{ fontSize: 13, color: colors.neutral[900] }}>{note.content}</div>
                        </article>
                      ))
                    )}
                  </div>
                </div>
              </section>

              <details data-testid="local-workbench-implementation-debug" style={{ ...shellPanel(), padding: 16 }}>
                <summary style={{ cursor: "pointer", fontSize: 15, fontWeight: 700 }}>Implementation debug</summary>
                <div style={{ display: "grid", gap: 8, marginTop: 14 }}>
                  {showImplementationDebug ? (
                    <>
                      <div style={{ fontSize: 12, color: colors.neutral[600] }}>
                        Agent input path: {data.latestRunAgentInput.path ?? "Unavailable"}
                      </div>
                      <div style={{ fontSize: 12, color: colors.neutral[600] }}>
                        Effective UI AST snapshot: {latestRun?.effectiveAstPath ?? "Unavailable"}
                      </div>
                      <div style={{ fontSize: 12, color: colors.neutral[600] }}>
                        Explainability artifact: {latestRun?.explainabilityPath ?? "Unavailable"}
                      </div>
                      <pre
                        style={{
                          margin: 0,
                          padding: 12,
                          borderRadius: 12,
                          backgroundColor: "#0f172a",
                          color: "#e2e8f0",
                          fontSize: 12,
                          lineHeight: 1.6,
                          whiteSpace: "pre-wrap",
                          overflowX: "auto",
                        }}
                      >
                        {data.latestRunAgentInput.content ?? "No implementation debug content captured yet."}
                      </pre>
                    </>
                  ) : (
                    <div style={{ fontSize: 13, color: colors.neutral[600] }}>No implementation debug artifacts have been captured yet.</div>
                  )}
                </div>
              </details>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
