"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { colors } from "@surfaces/ui/tokens/colors";
import type {
  SurfaceOpsModelCatalogEntry,
  SurfaceOpsModelState,
} from "@surfaces/surfaceops-desktop-bridge";

function shellPanel() {
  return {
    backgroundColor: colors.neutral[0],
    border: `1px solid ${colors.neutral[200]}`,
    borderRadius: 18,
    boxShadow: "0 24px 56px rgba(15, 23, 42, 0.08)",
  } as const;
}

function primaryButton(disabled: boolean) {
  return {
    border: "none",
    borderRadius: 999,
    backgroundColor: colors.structure.primary,
    color: colors.neutral[0],
    padding: "12px 18px",
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
    padding: "12px 18px",
    fontSize: 14,
    fontWeight: 700,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.65 : 1,
  } as const;
}

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return "Unknown size";
  }
  const units = ["B", "KB", "MB", "GB", "TB"];
  let current = value;
  let index = 0;
  while (current >= 1024 && index < units.length - 1) {
    current /= 1024;
    index += 1;
  }
  return `${current.toFixed(index >= 2 ? 1 : 0)} ${units[index]}`;
}

function formatRecommendedRange(entry: SurfaceOpsModelCatalogEntry) {
  const { min, max } = entry.recommendedRangeGb;
  return max === null ? `${min}+ GB unified memory` : `${min}-${max} GB unified memory`;
}

type Props = {
  catalog: SurfaceOpsModelCatalogEntry[];
  initialState: SurfaceOpsModelState;
};

export function DesktopModelSetup({ catalog, initialState }: Props) {
  const router = useRouter();
  const [state, setState] = useState(initialState);
  const [selectedModelId, setSelectedModelId] = useState(
    initialState.activeModelId
      ?? initialState.hardwareProfile.recommendedModelId
      ?? catalog[0]?.id
      ?? "",
  );
  const [licenseAccepted, setLicenseAccepted] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!window.surfaceopsDesktop?.models) {
      return undefined;
    }
    return window.surfaceopsDesktop.models.onStateChange((nextState) => {
      setState(nextState);
      if (!selectedModelId) {
        setSelectedModelId(
          nextState.activeModelId
            ?? nextState.hardwareProfile.recommendedModelId
            ?? catalog[0]?.id
            ?? "",
        );
      }
    });
  }, [catalog, selectedModelId]);

  const selectedModel = catalog.find((entry) => entry.id === selectedModelId) ?? null;
  const installPhase = state.installState.phase;
  const setupComplete = Boolean(
    state.hardwareProfile.supported
    && state.installedModel
    && state.activeModelId
    && state.runtimeStatus.phase === "ready"
    && state.runtimeStatus.healthy,
  );

  const installing = installPhase === "downloading" || installPhase === "verifying" || installPhase === "warming";

  async function refreshState() {
    const modelsBridge = window.surfaceopsDesktop?.models;
    if (!modelsBridge) {
      return;
    }
    const nextState = await modelsBridge.getState();
    setState(nextState);
  }

  function handleInstall() {
    const modelsBridge = window.surfaceopsDesktop?.models;
    if (!selectedModelId || !modelsBridge) {
      return;
    }
    startTransition(async () => {
      setPendingAction("install");
      setFeedback(null);
      try {
        if (state.installedModel && state.activeModelId && state.activeModelId !== selectedModelId) {
          await modelsBridge.replaceModel(selectedModelId);
        } else {
          await modelsBridge.install(selectedModelId);
        }
        await refreshState();
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : String(error));
      } finally {
        setPendingAction(null);
      }
    });
  }

  function handleCancelInstall() {
    const modelsBridge = window.surfaceopsDesktop?.models;
    if (!modelsBridge) {
      return;
    }
    startTransition(async () => {
      setPendingAction("cancel");
      setFeedback(null);
      try {
        await modelsBridge.cancelInstall();
        await refreshState();
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : String(error));
      } finally {
        setPendingAction(null);
      }
    });
  }

  function handleOpenWorkbench() {
    router.push("/contracts/governance");
    router.refresh();
  }

  function handleRunBenchmark() {
    const modelsBridge = window.surfaceopsDesktop?.models;
    if (!modelsBridge) {
      return;
    }
    startTransition(async () => {
      setPendingAction("benchmark");
      setFeedback(null);
      try {
        await modelsBridge.runBenchmark();
        await refreshState();
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : String(error));
      } finally {
        setPendingAction(null);
      }
    });
  }

  function handleExportBenchmark() {
    const modelsBridge = window.surfaceopsDesktop?.models;
    if (!modelsBridge) {
      return;
    }
    startTransition(async () => {
      setPendingAction("export");
      setFeedback(null);
      try {
        const filePath = await modelsBridge.exportBenchmark();
        setFeedback(filePath ? `Exported benchmark to ${filePath}` : "Benchmark export cancelled.");
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : String(error));
      } finally {
        setPendingAction(null);
      }
    });
  }

  return (
    <div
      className="min-h-screen w-full"
      style={{
        backgroundColor: colors.neutral[50],
        color: colors.neutral[900],
        padding: "40px 24px 64px",
      }}
    >
      <div style={{ maxWidth: 1120, margin: "0 auto", display: "grid", gap: 24 }}>
        <section style={{ ...shellPanel(), padding: 24, display: "grid", gap: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: colors.neutral[600] }}>
            SurfaceOps Desktop
          </div>
          <h1 style={{ fontSize: 36, lineHeight: 1.05, fontWeight: 800, margin: 0 }}>
            {setupComplete ? "Manage your local model runtime" : "Finish local model setup"}
          </h1>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.8, color: colors.neutral[600], maxWidth: 780 }}>
            SurfaceOps keeps inference on this Mac. Pick a vetted open model, download it into the app container,
            warm the local runtime, then continue into the contract workbench.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div style={{ border: `1px solid ${colors.neutral[200]}`, borderRadius: 14, padding: 16 }}>
              <div style={{ fontSize: 12, color: colors.neutral[600], marginBottom: 6 }}>Chip</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{state.hardwareProfile.chip}</div>
            </div>
            <div style={{ border: `1px solid ${colors.neutral[200]}`, borderRadius: 14, padding: 16 }}>
              <div style={{ fontSize: 12, color: colors.neutral[600], marginBottom: 6 }}>Unified memory</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{state.hardwareProfile.unifiedMemoryGb} GB</div>
            </div>
            <div style={{ border: `1px solid ${colors.neutral[200]}`, borderRadius: 14, padding: 16 }}>
              <div style={{ fontSize: 12, color: colors.neutral[600], marginBottom: 6 }}>Runtime status</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>
                {state.runtimeStatus.healthy ? "Ready" : state.runtimeStatus.phase}
              </div>
            </div>
          </div>
          {!state.hardwareProfile.supported ? (
            <div style={{ border: "1px solid #fecaca", borderRadius: 14, padding: 16, backgroundColor: "#fef2f2", color: "#991b1b" }}>
              {state.hardwareProfile.reason ?? "This Mac is not supported for the managed local runtime."}
            </div>
          ) : null}
        </section>

        <section style={{ ...shellPanel(), padding: 24, display: "grid", gap: 18 }}>
          <div>
            <strong style={{ display: "block", fontSize: 18, marginBottom: 6 }}>Choose a model</strong>
            <div style={{ fontSize: 13, lineHeight: 1.7, color: colors.neutral[600] }}>
              SurfaceOps recommends a default based on available memory, but you can switch later from this same screen.
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {catalog.map((entry) => {
              const recommended = state.hardwareProfile.recommendedModelId === entry.id;
              const selected = selectedModelId === entry.id;
              const installed = state.activeModelId === entry.id;
              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setSelectedModelId(entry.id)}
                  style={{
                    textAlign: "left",
                    padding: 18,
                    borderRadius: 16,
                    border: `1px solid ${selected ? colors.structure.primary : colors.neutral[200]}`,
                    backgroundColor: selected ? "#eff6ff" : colors.neutral[0],
                    display: "grid",
                    gap: 10,
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <strong style={{ fontSize: 17 }}>{entry.label}</strong>
                    <span
                      style={{
                        borderRadius: 999,
                        padding: "4px 10px",
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        backgroundColor: installed ? "#dcfce7" : recommended ? "#dbeafe" : colors.neutral[100],
                        color: installed ? "#166534" : recommended ? "#1d4ed8" : colors.neutral[800],
                      }}
                    >
                      {installed ? "Active" : recommended ? "Recommended" : entry.performanceTier}
                    </span>
                  </div>
                  <div style={{ fontSize: 14, lineHeight: 1.7, color: colors.neutral[800] }}>{entry.summary}</div>
                  <div style={{ display: "grid", gap: 6, fontSize: 12, color: colors.neutral[600] }}>
                    <div>Download: {formatBytes(entry.sizeBytes)}</div>
                    <div>Quantization: {entry.quantization}</div>
                    <div>Target range: {formatRecommendedRange(entry)}</div>
                    <div>License: {entry.licenseLabel}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section style={{ ...shellPanel(), padding: 24, display: "grid", gap: 18 }}>
          <label style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14, lineHeight: 1.7, color: colors.neutral[800] }}>
            <input
              type="checkbox"
              checked={licenseAccepted}
              onChange={(event) => setLicenseAccepted(event.target.checked)}
              style={{ marginTop: 4 }}
            />
            <span>
              I understand SurfaceOps downloads this model from the pinned public repository and that model use is
              governed by the model’s published license.
              {" "}
              {selectedModel ? (
                <a href={selectedModel.licenseUrl} target="_blank" rel="noreferrer" style={{ color: colors.structure.primary, fontWeight: 700 }}>
                  Review license
                </a>
              ) : null}
            </span>
          </label>

          {(feedback || state.installState.errorMessage) ? (
            <div style={{ border: "1px solid #fecaca", borderRadius: 14, padding: 16, backgroundColor: "#fef2f2", color: "#991b1b" }}>
              {feedback ?? state.installState.errorMessage}
            </div>
          ) : null}

          {installing ? (
            <div style={{ border: `1px solid ${colors.neutral[200]}`, borderRadius: 14, padding: 16, display: "grid", gap: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>
                {state.installState.phase === "warming" ? "Warming local runtime..." : "Downloading model..."}
              </div>
              <div style={{ fontSize: 13, color: colors.neutral[600] }}>
                {state.installState.modelId ?? selectedModelId} · {state.installState.progressPercent ?? 0}%
              </div>
              <div style={{ width: "100%", height: 8, borderRadius: 999, backgroundColor: colors.neutral[100], overflow: "hidden" }}>
                <div
                  style={{
                    width: `${Math.max(0, Math.min(100, state.installState.progressPercent ?? 0))}%`,
                    height: "100%",
                    backgroundColor: colors.structure.primary,
                  }}
                />
              </div>
              <div style={{ fontSize: 12, color: colors.neutral[600] }}>
                {formatBytes(state.installState.bytesDownloaded)} of {formatBytes(state.installState.totalBytes ?? 0)}
              </div>
            </div>
          ) : null}

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              disabled={!licenseAccepted || !selectedModelId || installing || !state.hardwareProfile.supported || isPending}
              onClick={handleInstall}
              style={primaryButton(!licenseAccepted || !selectedModelId || installing || !state.hardwareProfile.supported || isPending)}
            >
              {pendingAction === "install"
                ? "Preparing model..."
                : state.activeModelId && state.activeModelId !== selectedModelId
                  ? "Replace active model"
                  : setupComplete
                    ? "Reinstall active model"
                    : "Download and continue"}
            </button>
            {installing ? (
              <button type="button" onClick={handleCancelInstall} style={secondaryButton(isPending)}>
                {pendingAction === "cancel" ? "Cancelling..." : "Cancel install"}
              </button>
            ) : null}
            {setupComplete ? (
              <button type="button" onClick={handleOpenWorkbench} style={secondaryButton(false)}>
                Open workbench
              </button>
            ) : null}
          </div>
        </section>

        <section style={{ ...shellPanel(), padding: 24, display: "grid", gap: 16 }}>
          <div>
            <strong style={{ display: "block", fontSize: 18, marginBottom: 6 }}>Local benchmark</strong>
            <div style={{ fontSize: 13, lineHeight: 1.7, color: colors.neutral[600] }}>
              Run a local benchmark against the active model to compare install choices on this machine. Results stay on
              device unless you export them.
            </div>
          </div>
          {state.lastBenchmarkSummary ? (
            <div style={{ border: `1px solid ${colors.neutral[200]}`, borderRadius: 14, padding: 16, display: "grid", gap: 6 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{state.lastBenchmarkSummary.label}</div>
              <div style={{ fontSize: 12, color: colors.neutral[600] }}>
                {new Date(state.lastBenchmarkSummary.createdAt).toLocaleString()}
              </div>
              <div style={{ fontSize: 12, color: colors.neutral[600] }}>
                Duration: {state.lastBenchmarkSummary.durationMs} ms
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 13, color: colors.neutral[600] }}>
              No local benchmark has been recorded yet for this installation.
            </div>
          )}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              disabled={!setupComplete || isPending}
              onClick={handleRunBenchmark}
              style={secondaryButton(!setupComplete || isPending)}
            >
              {pendingAction === "benchmark" ? "Running benchmark..." : "Run local benchmark"}
            </button>
            <button
              type="button"
              disabled={!state.lastBenchmarkSummary || isPending}
              onClick={handleExportBenchmark}
              style={secondaryButton(!state.lastBenchmarkSummary || isPending)}
            >
              {pendingAction === "export" ? "Exporting..." : "Export latest benchmark"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
