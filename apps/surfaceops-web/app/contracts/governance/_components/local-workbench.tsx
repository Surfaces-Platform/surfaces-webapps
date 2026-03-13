"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { colors } from "@surfaces/ui/tokens/colors";
import type { LocalWorkbenchData, LocalWorkbenchRun, LocalWorkbenchTab } from "@/lib/local-workbench/types";

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

function statusTone(status: string) {
  if (status === "succeeded" || status === "pass") return "#166534";
  if (status === "failed" || status === "block") return "#b91c1c";
  if (status === "warn") return "#b45309";
  return colors.neutral[600];
}

function latestRunTitle(run: LocalWorkbenchRun | null) {
  if (!run) return "No rerun yet";
  return `${run.latestRunLabel} · ${run.status}`;
}

export function LocalWorkbench({ data }: { data: LocalWorkbenchData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<"baseline" | "current">("current");
  const [tab, setTab] = useState<LocalWorkbenchTab>("controls");
  const latestRun = data.latestRun;
  const preview = previewMode === "baseline" ? latestRun?.baselinePreview : latestRun?.currentPreview;
  const suggestions = useMemo(() => latestRun?.suggestions ?? [], [latestRun]);

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
    setFeedback(`Local rerun ${json.run.runId} completed with ${json.run.status}.`);
    router.refresh();
  }

  async function reviewSuggestion(suggestionId: string, decision: "accepted" | "rejected") {
    if (!latestRun) return;
    const response = await fetch(`/api/contracts/local/suggestions/${encodeURIComponent(latestRun.runId)}/${encodeURIComponent(suggestionId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision }),
    });
    const json = await response.json();
    if (!response.ok || !json.ok) {
      throw new Error(json.error ?? "Suggestion review failed.");
    }
    setFeedback(`Suggestion ${decision}.`);
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
      <div style={{ maxWidth: 1600, margin: "0 auto", padding: "32px 24px 56px" }}>
        <header
          style={{
            ...shellPanel(),
            padding: "28px 32px",
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
              Contract workbench
            </div>
            <h1 style={{ fontSize: 32, lineHeight: 1.04, margin: "8px 0 10px", fontWeight: 800 }}>
              {data.target.label}
            </h1>
            <p style={{ margin: 0, color: colors.neutral[600], maxWidth: 720 }}>
              Local-only reference-target workbench. Contract guidance comes from {data.contract.contractId} v{data.contract.version}.
            </p>
          </div>
          <div style={{ display: "grid", gap: 8, justifyItems: "end" }}>
            <div style={{ fontSize: 13, color: statusTone(latestRun?.status ?? "idle"), fontWeight: 700 }}>
              {latestRunTitle(latestRun)}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {(["baseline", "current"] as const).map((mode) => (
                <button key={mode} type="button" onClick={() => setPreviewMode(mode)} style={pill(previewMode === mode)}>
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </header>

        {feedback ? (
          <div style={{ ...shellPanel(), padding: "12px 16px", marginBottom: 18, color: colors.neutral[800] }}>{feedback}</div>
        ) : null}

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 426px", gap: 18, alignItems: "start" }}>
          <section style={{ ...shellPanel(), overflow: "hidden" }}>
            <div
              style={{
                borderBottom: `1px solid ${colors.neutral[200]}`,
                padding: "14px 18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
              }}
            >
              <div>
                <strong style={{ display: "block", fontSize: 14 }}>{previewMode === "baseline" ? "Baseline preview" : "Current preview"}</strong>
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
                    Run the local LLM once to capture the baseline and current screenshots for this workbench.
                  </div>
                </div>
              )}
            </div>
          </section>

          <aside style={{ ...shellPanel(), overflow: "hidden" }}>
            <div style={{ display: "flex", gap: 8, padding: 16, borderBottom: `1px solid ${colors.neutral[200]}` }}>
              {(["controls", "chat"] as const).map((nextTab) => (
                <button key={nextTab} type="button" onClick={() => setTab(nextTab)} style={pill(tab === nextTab)}>
                  {nextTab}
                </button>
              ))}
            </div>

            {tab === "controls" ? (
              <div style={{ display: "grid", gap: 18, padding: 18 }}>
                <section style={{ display: "grid", gap: 12 }}>
                  <button
                    type="button"
                    disabled={isPending || !data.localModel.configured}
                    onClick={() =>
                      startTransition(async () => {
                        try {
                          await startRerun();
                        } catch (error) {
                          setFeedback(error instanceof Error ? error.message : String(error));
                        }
                      })
                    }
                    style={{
                      border: "none",
                      borderRadius: 999,
                      backgroundColor: colors.structure.primary,
                      color: colors.neutral[0],
                      padding: "12px 16px",
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: isPending || !data.localModel.configured ? "not-allowed" : "pointer",
                      opacity: isPending || !data.localModel.configured ? 0.65 : 1,
                    }}
                  >
                    {isPending ? "Running..." : "Run local LLM"}
                  </button>
                  <div style={{ fontSize: 12, color: colors.neutral[600], lineHeight: 1.6 }}>
                    {data.localModel.configured
                      ? `Model: ${data.localModel.model} · ${data.localModel.baseUrl}`
                      : "Set SURFACEOPS_LOCAL_LLM_BASE_URL and SURFACEOPS_LOCAL_LLM_MODEL to enable reruns."}
                  </div>
                </section>

                <section style={{ border: `1px solid ${colors.neutral[200]}`, borderRadius: 14, padding: 14 }}>
                  <strong style={{ display: "block", marginBottom: 10 }}>Contract summary</strong>
                  <div style={{ display: "grid", gap: 6, fontSize: 13, color: colors.neutral[800] }}>
                    <div>ID: {data.contract.contractId}</div>
                    <div>Version: {data.contract.version}</div>
                    <div>Max width: {data.contract.maxContentWidth ?? "not specified"}</div>
                    <div>Color policy: {data.contract.colorPolicy}</div>
                    <div>Sections: {data.contract.requiredSections.join(", ") || "none"}</div>
                    <div>Fonts: {data.contract.allowedFonts.join(", ") || "none"}</div>
                  </div>
                </section>

                <section style={{ border: `1px solid ${colors.neutral[200]}`, borderRadius: 14, padding: 14 }}>
                  <strong style={{ display: "block", marginBottom: 10 }}>Comparison</strong>
                  {latestRun?.comparison ? (
                    <div style={{ display: "grid", gap: 6, fontSize: 13, color: colors.neutral[800] }}>
                      <div>Baseline: {latestRun.comparison.baselineStatus}</div>
                      <div>Current: {latestRun.comparison.currentStatus}</div>
                      <div>Finding delta: {latestRun.comparison.findingCountDelta}</div>
                      <div>Blocking delta: {latestRun.comparison.blockingCountDelta}</div>
                      <div>New finding codes: {latestRun.comparison.newFindingCodes.join(", ") || "none"}</div>
                    </div>
                  ) : (
                    <div style={{ fontSize: 13, color: colors.neutral[600] }}>Comparison metrics will appear after the first rerun.</div>
                  )}
                </section>

                <section style={{ border: `1px solid ${colors.neutral[200]}`, borderRadius: 14, padding: 14 }}>
                  <strong style={{ display: "block", marginBottom: 10 }}>Suggestions</strong>
                  <div style={{ display: "grid", gap: 12 }}>
                    {suggestions.length === 0 ? (
                      <div style={{ fontSize: 13, color: colors.neutral[600] }}>
                        No suggestion summaries yet. They appear when validation produces findings.
                      </div>
                    ) : (
                      suggestions.map((suggestion) => (
                        <article key={suggestion.suggestionId} style={{ border: `1px solid ${colors.neutral[200]}`, borderRadius: 12, padding: 12 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
                            <strong style={{ fontSize: 13 }}>{suggestion.findingCode}</strong>
                            <span style={{ fontSize: 12, color: colors.neutral[600] }}>{suggestion.status}</span>
                          </div>
                          <div style={{ fontSize: 13, color: colors.neutral[800], marginBottom: 8 }}>{suggestion.summary}</div>
                          <div style={{ fontSize: 12, color: colors.neutral[600], marginBottom: 10 }}>{suggestion.suggestedPath}</div>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              type="button"
                              onClick={() =>
                                startTransition(async () => {
                                  try {
                                    await reviewSuggestion(suggestion.suggestionId, "accepted");
                                  } catch (error) {
                                    setFeedback(error instanceof Error ? error.message : String(error));
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
                                  try {
                                    await reviewSuggestion(suggestion.suggestionId, "rejected");
                                  } catch (error) {
                                    setFeedback(error instanceof Error ? error.message : String(error));
                                  }
                                })
                              }
                              style={pill(false)}
                            >
                              Reject
                            </button>
                          </div>
                          {suggestion.rationale ? (
                            <div style={{ marginTop: 8, fontSize: 12, color: colors.neutral[600] }}>
                              {suggestion.rationale}
                            </div>
                          ) : null}
                        </article>
                      ))
                    )}
                  </div>
                </section>

                <section style={{ border: `1px solid ${colors.neutral[200]}`, borderRadius: 14, padding: 14 }}>
                  <strong style={{ display: "block", marginBottom: 10 }}>Run history</strong>
                  <div style={{ display: "grid", gap: 10 }}>
                    {data.runs.length === 0 ? (
                      <div style={{ fontSize: 13, color: colors.neutral[600] }}>No local reruns recorded yet.</div>
                    ) : (
                      data.runs.map((run) => (
                        <div key={run.runId} style={{ border: `1px solid ${colors.neutral[200]}`, borderRadius: 12, padding: 12 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                            <strong style={{ fontSize: 13 }}>{run.latestRunLabel}</strong>
                            <span style={{ fontSize: 12, color: statusTone(run.status) }}>{run.status}</span>
                          </div>
                          <div style={{ fontSize: 12, color: colors.neutral[600] }}>
                            {new Date(run.createdAt).toLocaleString()}
                          </div>
                          <div style={{ fontSize: 12, color: colors.neutral[600], marginTop: 4 }}>
                            {run.touchedFiles.join(", ") || "No touched files"}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 14, padding: 18 }}>
                {data.chat.map((message) => (
                  <section
                    key={message.id}
                    style={{
                      borderRadius: 16,
                      border: `1px solid ${message.role === "assistant" ? colors.neutral[200] : "#c7d2fe"}`,
                      backgroundColor: message.role === "assistant" ? colors.neutral[0] : "#eef2ff",
                      padding: 14,
                    }}
                  >
                    <div style={{ fontSize: 12, color: colors.neutral[600], marginBottom: 8 }}>{message.title}</div>
                    <div style={{ fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap", color: colors.neutral[800] }}>
                      {message.content}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
