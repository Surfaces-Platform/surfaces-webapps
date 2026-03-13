"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { colors } from "@surfaces/ui/tokens/colors";
import type { ProjectWorkspaceData } from "@/lib/contract-workbench/types";

function panelStyle() {
  return {
    backgroundColor: colors.neutral[0],
    border: `1px solid ${colors.neutral[200]}`,
    borderRadius: 18,
    padding: 20,
    boxShadow: "0 16px 40px rgba(15, 23, 42, 0.08)",
  } as const;
}

function badgeStyle(active: boolean) {
  return {
    padding: "8px 12px",
    borderRadius: 999,
    textDecoration: "none",
    border: `1px solid ${active ? colors.neutral[900] : colors.neutral[200]}`,
    backgroundColor: active ? colors.neutral[900] : colors.neutral[0],
    color: active ? colors.neutral[0] : colors.neutral[800],
    fontSize: 13,
    fontWeight: 700,
  } as const;
}

export function ProjectWorkbench({ data }: { data: ProjectWorkspaceData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [draftText, setDraftText] = useState(data.draft.text);
  const [authSessionKey, setAuthSessionKey] = useState(
    data.previewTargets[0]?.authSessionKey ?? "surfaceops-governance-preview",
  );
  const [authStorageState, setAuthStorageState] = useState("{\n  \"cookies\": [],\n  \"origins\": []\n}");
  const [feedback, setFeedback] = useState<string | null>(null);
  const selectedWorkbench = data.selectedRunWorkbench;
  const selectedSuggestions = selectedWorkbench?.suggestions?.suggestions ?? [];
  const selectedSurface = data.surfaces.find((surface) => surface.id === data.selectedSurfaceId) ?? data.surfaces[0];

  const selectedPreviewTarget = useMemo(
    () => data.previewTargets.find((target) => target.surfaceId === data.selectedSurfaceId) ?? data.previewTargets[0] ?? null,
    [data.previewTargets, data.selectedSurfaceId],
  );

  function refreshWorkspace() {
    router.refresh();
  }

  async function saveDraft() {
    const response = await fetch(`/api/contracts/projects/${encodeURIComponent(data.project.projectId)}/draft`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: draftText }),
    });
    const json = await response.json();
    if (!response.ok || !json.ok) {
      throw new Error(json.error ?? "Draft save failed.");
    }
    setFeedback(`Draft saved at ${json.draft.updatedAt}`);
    refreshWorkspace();
  }

  async function startRerun() {
    const response = await fetch(`/api/contracts/projects/${encodeURIComponent(data.project.projectId)}/reruns`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ surfaceId: data.selectedSurfaceId }),
    });
    const json = await response.json();
    if (!response.ok || !json.ok) {
      throw new Error(json.error ?? "Rerun failed.");
    }
    setFeedback(`Rerun started for ${data.selectedSurfaceId}.`);
    refreshWorkspace();
  }

  async function saveAuthSession() {
    const storageState = JSON.parse(authStorageState);
    const response = await fetch(`/api/contracts/projects/${encodeURIComponent(data.project.projectId)}/auth-sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        authSessionKey,
        surfaceId: data.selectedSurfaceId,
        environmentId: "preview",
        previewOrigin: selectedPreviewTarget?.url ?? "",
        storageState,
      }),
    });
    const json = await response.json();
    if (!response.ok || !json.ok) {
      throw new Error(json.error ?? "Auth session save failed.");
    }
    setFeedback(`Stored auth session ${authSessionKey}.`);
    refreshWorkspace();
  }

  async function publishDraft() {
    const response = await fetch(`/api/contracts/projects/${encodeURIComponent(data.project.projectId)}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const json = await response.json();
    if (!response.ok || !json.ok) {
      throw new Error(json.error ?? "Publish failed.");
    }
    setFeedback(json.publish.pullRequestUrl ? `Opened ${json.publish.pullRequestUrl}` : "Publish started.");
    refreshWorkspace();
  }

  async function reviewSuggestion(suggestionId: string, decision: "accepted" | "rejected") {
    if (!data.selectedRunId) {
      throw new Error("No run selected.");
    }
    const rationale = decision === "accepted"
      ? "Accepted in SurfaceOps and applied to the working draft."
      : "Rejected in SurfaceOps after review.";
    const response = await fetch(
      `/api/contracts/projects/${encodeURIComponent(data.project.projectId)}/reruns/${encodeURIComponent(data.selectedRunId)}/suggestions/${encodeURIComponent(suggestionId)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, rationale }),
      },
    );
    const json = await response.json();
    if (!response.ok || !json.ok) {
      throw new Error(json.error ?? "Suggestion review failed.");
    }
    setFeedback(decision === "accepted" ? "Suggestion applied to the working draft." : "Suggestion rejected.");
    refreshWorkspace();
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(180deg, rgba(248,250,252,1) 0%, rgba(241,245,249,0.92) 48%, rgba(226,232,240,0.76) 100%)",
        color: colors.neutral[900],
      }}
    >
      <div style={{ maxWidth: 1480, margin: "0 auto", padding: "34px 24px 56px" }}>
        <header style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 12, color: colors.neutral[600], textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Contract workbench
            </div>
            <h1 style={{ fontSize: 34, lineHeight: 1.05, fontWeight: 800, margin: "8px 0 10px" }}>{data.project.name}</h1>
            <p style={{ margin: 0, color: colors.neutral[600], maxWidth: 760 }}>
              {data.project.githubOwner}/{data.project.githubRepo} · {data.project.contractPath}
            </p>
          </div>
          <div style={{ display: "grid", gap: 8, fontSize: 13, color: colors.neutral[600] }}>
            <div>Draft sha: {data.draft.sha256.slice(0, 12)}</div>
            <div>Latest run: {data.project.latestRunId ?? "none"}</div>
            <div>Latest publish: {data.project.latestPublishId ?? "none"}</div>
          </div>
        </header>

        <section style={{ ...panelStyle(), marginBottom: 24 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {data.surfaces.map((surface) => (
                <Link
                  key={surface.id}
                  href={`/contracts/governance/${encodeURIComponent(data.project.projectId)}?surface=${encodeURIComponent(surface.id)}&run=${encodeURIComponent(data.selectedRunId ?? "latest")}&panel=${encodeURIComponent(data.selectedPanel)}&attempt=${encodeURIComponent(data.attemptView)}`}
                  style={badgeStyle(surface.id === data.selectedSurfaceId)}
                >
                  {surface.label ?? surface.id}
                </Link>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {(["editor", "compare", "history"] as const).map((panel) => (
                <Link
                  key={panel}
                  href={`/contracts/governance/${encodeURIComponent(data.project.projectId)}?surface=${encodeURIComponent(data.selectedSurfaceId)}&run=${encodeURIComponent(data.selectedRunId ?? "latest")}&panel=${encodeURIComponent(panel)}&attempt=${encodeURIComponent(data.attemptView)}`}
                  style={badgeStyle(panel === data.selectedPanel)}
                >
                  {panel}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {feedback ? (
          <section style={{ ...panelStyle(), marginBottom: 24, backgroundColor: "#eff6ff", borderColor: "#bfdbfe" }}>
            <strong style={{ display: "block", marginBottom: 4 }}>SurfaceOps</strong>
            <span style={{ color: colors.neutral[800], fontSize: 14 }}>{feedback}</span>
          </section>
        ) : null}

        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 2fr", gap: 24 }}>
          <div style={{ display: "grid", gap: 24, alignContent: "start" }}>
            <section style={panelStyle()}>
              <div style={{ fontSize: 12, color: colors.neutral[600], textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Runner controls
              </div>
              <h2 style={{ fontSize: 21, fontWeight: 700, marginTop: 6, marginBottom: 16 }}>
                {selectedSurface?.label ?? selectedSurface?.id ?? data.selectedSurfaceId}
              </h2>
              <div style={{ display: "grid", gap: 12 }}>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => startTransition(async () => {
                    try {
                      await saveDraft();
                    } catch (error) {
                      setFeedback(error instanceof Error ? error.message : String(error));
                    }
                  })}
                  style={{ ...badgeStyle(false), textAlign: "center", cursor: isPending ? "progress" : "pointer" }}
                >
                  Save contract draft
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => startTransition(async () => {
                    try {
                      await startRerun();
                    } catch (error) {
                      setFeedback(error instanceof Error ? error.message : String(error));
                    }
                  })}
                  style={{
                    padding: "12px 14px",
                    borderRadius: 999,
                    border: "none",
                    backgroundColor: colors.structure.primary,
                    color: colors.neutral[0],
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: isPending ? "progress" : "pointer",
                  }}
                >
                  Run Codex rerun
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => startTransition(async () => {
                    try {
                      await publishDraft();
                    } catch (error) {
                      setFeedback(error instanceof Error ? error.message : String(error));
                    }
                  })}
                  style={{ ...badgeStyle(false), textAlign: "center", cursor: isPending ? "progress" : "pointer" }}
                >
                  Publish branch + PR
                </button>
              </div>
              <div style={{ marginTop: 16, fontSize: 13, color: colors.neutral[600], lineHeight: 1.6 }}>
                Preview target: {selectedPreviewTarget?.urlTemplate ?? selectedPreviewTarget?.url ?? "not configured"}
              </div>
            </section>

            <section style={panelStyle()}>
              <div style={{ fontSize: 12, color: colors.neutral[600], textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Preview auth session
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginTop: 6, marginBottom: 12 }}>Captured browser state</h3>
              <div style={{ display: "grid", gap: 10 }}>
                <input
                  value={authSessionKey}
                  onChange={(event) => setAuthSessionKey(event.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: `1px solid ${colors.neutral[200]}`,
                    fontSize: 14,
                  }}
                />
                <textarea
                  value={authStorageState}
                  onChange={(event) => setAuthStorageState(event.target.value)}
                  style={{
                    minHeight: 160,
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: 12,
                    border: `1px solid ${colors.neutral[200]}`,
                    fontSize: 13,
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                  }}
                />
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => startTransition(async () => {
                    try {
                      await saveAuthSession();
                    } catch (error) {
                      setFeedback(error instanceof Error ? error.message : String(error));
                    }
                  })}
                  style={{ ...badgeStyle(false), textAlign: "center", cursor: isPending ? "progress" : "pointer" }}
                >
                  Save auth session
                </button>
              </div>
              <div style={{ marginTop: 12, fontSize: 12, color: colors.neutral[600] }}>
                Stored for reruns: {data.hasStoredAuthSession ? "yes" : "not yet"}
              </div>
            </section>
          </div>

          <div style={{ display: "grid", gap: 24 }}>
            <section style={panelStyle()}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 12, color: colors.neutral[600], textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Contract editor
                  </div>
                  <h2 style={{ fontSize: 22, fontWeight: 700, marginTop: 6 }}>Current working copy</h2>
                </div>
                <div style={{ fontSize: 13, color: colors.neutral[600] }}>Updated {new Date(data.draft.updatedAt).toLocaleString()}</div>
              </div>
              <textarea
                value={draftText}
                onChange={(event) => setDraftText(event.target.value)}
                style={{
                  width: "100%",
                  minHeight: 340,
                  padding: "14px 16px",
                  borderRadius: 14,
                  border: `1px solid ${colors.neutral[200]}`,
                  fontSize: 13,
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                  backgroundColor: colors.neutral[50],
                }}
              />
            </section>

            <section style={panelStyle()}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 12, color: colors.neutral[600], textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Comparison
                  </div>
                  <h2 style={{ fontSize: 22, fontWeight: 700, marginTop: 6 }}>Latest baseline vs guided run</h2>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {(["first", "latest"] as const).map((attempt) => (
                    <Link
                      key={attempt}
                      href={`/contracts/governance/${encodeURIComponent(data.project.projectId)}?surface=${encodeURIComponent(data.selectedSurfaceId)}&run=${encodeURIComponent(data.selectedRunId ?? "latest")}&panel=${encodeURIComponent(data.selectedPanel)}&attempt=${encodeURIComponent(attempt)}`}
                      style={badgeStyle(attempt === data.attemptView)}
                    >
                      {attempt}
                    </Link>
                  ))}
                </div>
              </div>

              {selectedWorkbench ? (
                <div style={{ display: "grid", gap: 18 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                    {([
                      ["Baseline", selectedWorkbench.previews.baseline],
                      ["Guided", selectedWorkbench.previews.guided],
                    ] as const).map(([label, preview]) => (
                      <div key={label} style={{ border: `1px solid ${colors.neutral[200]}`, borderRadius: 14, padding: 12 }}>
                        <div style={{ marginBottom: 8, fontSize: 13, fontWeight: 700 }}>{label}</div>
                        {preview.dataUrl ? (
                          <img
                            alt={`${label} preview`}
                            src={preview.dataUrl}
                            style={{ width: "100%", height: "auto", borderRadius: 12, border: `1px solid ${colors.neutral[200]}` }}
                          />
                        ) : (
                          <div style={{ minHeight: 220, display: "flex", alignItems: "center", justifyContent: "center", color: colors.neutral[600] }}>
                            Preview unavailable
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                    <div style={{ border: `1px solid ${colors.neutral[200]}`, borderRadius: 14, padding: 14 }}>
                      <strong style={{ display: "block", marginBottom: 8 }}>Prepared guidance</strong>
                      <p style={{ margin: 0, color: colors.neutral[800], fontSize: 14 }}>
                        {selectedWorkbench.guidedPrepared?.summary?.text ?? "No prepared guidance found."}
                      </p>
                    </div>
                    <div style={{ border: `1px solid ${colors.neutral[200]}`, borderRadius: 14, padding: 14 }}>
                      <strong style={{ display: "block", marginBottom: 8 }}>Comparison metrics</strong>
                      <div style={{ display: "grid", gap: 6, fontSize: 14, color: colors.neutral[800] }}>
                        <div>First-attempt blocker delta: {selectedWorkbench.comparison.delta.firstAttemptBlockingFindingCountDelta}</div>
                        <div>First-attempt finding delta: {selectedWorkbench.comparison.delta.firstAttemptFindingCountDelta}</div>
                        <div>Latest finding delta: {selectedWorkbench.comparison.delta.latestFindingCountDelta}</div>
                        <div>Goal met: {selectedWorkbench.comparison.checks.meetsGoal ? "yes" : "no"}</div>
                      </div>
                    </div>
                  </div>

                  <div style={{ border: `1px solid ${colors.neutral[200]}`, borderRadius: 14, padding: 14 }}>
                    <strong style={{ display: "block", marginBottom: 12 }}>Suggestions</strong>
                    <div style={{ display: "grid", gap: 12 }}>
                      {selectedSuggestions.length === 0 ? (
                        <div style={{ color: colors.neutral[600], fontSize: 14 }}>No contract delta suggestions for this run.</div>
                      ) : (
                        selectedSuggestions.map((suggestion) => (
                          <article key={suggestion.suggestionId} style={{ padding: 12, borderRadius: 12, border: `1px solid ${colors.neutral[200]}` }}>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
                              <strong>{suggestion.findingCode}</strong>
                              <span style={{ fontSize: 12, color: colors.neutral[600] }}>{suggestion.status}</span>
                            </div>
                            <p style={{ margin: "0 0 8px 0", color: colors.neutral[800], fontSize: 14 }}>{suggestion.findingMessage}</p>
                            <div style={{ fontSize: 13, color: colors.neutral[600], marginBottom: 10 }}>
                              {suggestion.proposedChange.summary} · {suggestion.proposedChange.path}
                            </div>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() => startTransition(async () => {
                                  try {
                                    await reviewSuggestion(suggestion.suggestionId, "accepted");
                                  } catch (error) {
                                    setFeedback(error instanceof Error ? error.message : String(error));
                                  }
                                })}
                                style={{ ...badgeStyle(false), cursor: isPending ? "progress" : "pointer" }}
                              >
                                Accept + apply
                              </button>
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() => startTransition(async () => {
                                  try {
                                    await reviewSuggestion(suggestion.suggestionId, "rejected");
                                  } catch (error) {
                                    setFeedback(error instanceof Error ? error.message : String(error));
                                  }
                                })}
                                style={{ ...badgeStyle(false), cursor: isPending ? "progress" : "pointer" }}
                              >
                                Reject
                              </button>
                            </div>
                            {"decision" in suggestion && suggestion.decision ? (
                              <div style={{ marginTop: 10, fontSize: 12, color: colors.neutral[600] }}>
                                Decision: {suggestion.decision.rationale}
                              </div>
                            ) : null}
                          </article>
                        ))
                      )}
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                    {([
                      ["Baseline history", selectedWorkbench.timelines.baseline],
                      ["Guided history", selectedWorkbench.timelines.guided],
                    ] as const).map(([label, attempts]) => (
                      <div key={label} style={{ border: `1px solid ${colors.neutral[200]}`, borderRadius: 14, padding: 14 }}>
                        <strong style={{ display: "block", marginBottom: 12 }}>{label}</strong>
                        <div style={{ display: "grid", gap: 10 }}>
                          {attempts.map((attempt) => (
                            <article key={`${label}-${attempt.attemptNumber}`} style={{ padding: 12, borderRadius: 12, backgroundColor: colors.neutral[50] }}>
                              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
                                <span>Attempt {attempt.attemptNumber}</span>
                                <span>{attempt.outcome}</span>
                              </div>
                              <div style={{ fontSize: 13, color: colors.neutral[800] }}>{attempt.notes}</div>
                              <div style={{ fontSize: 12, color: colors.neutral[600], marginTop: 4 }}>
                                {attempt.touchedFiles.join(", ") || "No touched files recorded"}
                              </div>
                            </article>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ color: colors.neutral[600], fontSize: 14 }}>
                  No rerun history yet. Save the draft and start a Codex rerun to populate previews, findings, and suggestions.
                </div>
              )}
            </section>

            <section style={panelStyle()}>
              <div style={{ fontSize: 12, color: colors.neutral[600], textTransform: "uppercase", letterSpacing: "0.08em" }}>
                History
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 700, marginTop: 6, marginBottom: 12 }}>Runs and publishes</h2>
              <div style={{ display: "grid", gap: 12 }}>
                {data.runs.map((run) => (
                  <Link
                    key={run.runId}
                    href={`/contracts/governance/${encodeURIComponent(data.project.projectId)}?surface=${encodeURIComponent(run.surfaceId)}&run=${encodeURIComponent(run.runId)}&panel=history&attempt=${encodeURIComponent(data.attemptView)}`}
                    style={{
                      display: "grid",
                      gap: 4,
                      padding: 14,
                      borderRadius: 14,
                      border: `1px solid ${run.runId === data.selectedRunId ? colors.structure.primary : colors.neutral[200]}`,
                      textDecoration: "none",
                      color: colors.neutral[900],
                      backgroundColor: run.runId === data.selectedRunId ? "#eff6ff" : colors.neutral[0],
                    }}
                  >
                    <strong>{run.runId}</strong>
                    <span style={{ fontSize: 13, color: colors.neutral[600] }}>
                      {run.surfaceId} · {run.status} · {new Date(run.createdAt).toLocaleString()}
                    </span>
                    {run.previewUrl ? (
                      <span style={{ fontSize: 12, color: colors.neutral[600] }}>{run.previewUrl}</span>
                    ) : null}
                  </Link>
                ))}
                {data.runs.length === 0 ? (
                  <div style={{ color: colors.neutral[600], fontSize: 14 }}>No reruns recorded yet.</div>
                ) : null}
              </div>
              <div style={{ marginTop: 18, display: "grid", gap: 10 }}>
                {data.publishes.map((publish) => (
                  <div key={publish.publishId} style={{ padding: 12, borderRadius: 12, border: `1px solid ${colors.neutral[200]}` }}>
                    <strong style={{ display: "block", marginBottom: 4 }}>{publish.branchName}</strong>
                    <div style={{ fontSize: 13, color: colors.neutral[600] }}>{publish.status}</div>
                    {publish.pullRequestUrl ? (
                      <a href={publish.pullRequestUrl} style={{ fontSize: 13, color: colors.structure.primary }}>
                        {publish.pullRequestUrl}
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
