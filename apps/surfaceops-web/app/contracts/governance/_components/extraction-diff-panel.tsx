"use client";

import React from "react";
import { useRouter } from "next/navigation";
import styles from "./governance.module.css";
import { useContractStore } from "./contract-provider";
import type { ExtractionDiffItem } from "../_lib/prototype-diff";

type DecisionAction = "accept" | "reject" | "evolve";

type DecisionStateMap = Record<
  string,
  {
    action: DecisionAction;
    createdAt: string;
  }
>;

function formatWhen(value: string | null): string {
  if (!value) return "pending";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toISOString();
}

export function ExtractionDiffPanel({
  items,
  canWrite,
  selectedPrototypeId,
  selectedSnapshotId,
  baselineSnapshotId,
  snapshotTimeline,
  selectedSnapshotSignals,
  onClose,
}: {
  items: ExtractionDiffItem[];
  canWrite: boolean;
  selectedPrototypeId: string;
  selectedSnapshotId: string;
  baselineSnapshotId: string;
  snapshotTimeline: Array<{ snapshotId: string; createdAt: string }>;
  selectedSnapshotSignals: { authAware: boolean; hasShell: boolean };
  onClose: () => void;
}) {
  const router = useRouter();
  const { focusTab, updateContract } = useContractStore();
  const [decisionState, setDecisionState] = React.useState<DecisionStateMap>(() =>
    Object.fromEntries(
      items
        .filter((item): item is ExtractionDiffItem & { decisionState: DecisionAction } =>
          item.decisionState !== null,
        )
        .map((item) => [item.id, { action: item.decisionState, createdAt: item.lastDecisionAt ?? "" }]),
    ),
  );
  const [busy, setBusy] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const [pendingEvolveNoteByDiffItemId, setPendingEvolveNoteByDiffItemId] = React.useState<
    Record<string, string>
  >({});

  React.useEffect(() => {
    const next = Object.fromEntries(
      items
        .filter((item): item is ExtractionDiffItem & { decisionState: DecisionAction } =>
          item.decisionState !== null,
        )
        .map((item) => [item.id, { action: item.decisionState, createdAt: item.lastDecisionAt ?? "" }]),
    );
    setDecisionState(next);
  }, [items]);

  const pending = items.filter((item) => !decisionState[item.id]);
  const latestSnapshots = snapshotTimeline.slice(0, 10);

  async function persistDecision(item: ExtractionDiffItem, action: DecisionAction, reason?: string) {
    if (!canWrite) return;
    setBusy(`${action}-${item.id}`);
    setMessage(null);
    try {
      const response = await fetch("/api/prototypes/governance/decision", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          prototypeId: selectedPrototypeId,
          snapshotId: selectedSnapshotId,
          diffItemId: item.id,
          action,
          reason: reason ?? "",
        }),
      });
      const body = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !body.ok) {
        throw new Error(body.error ?? "Decision persistence failed.");
      }
      const createdAt = new Date().toISOString();
      setDecisionState((current) => ({ ...current, [item.id]: { action, createdAt } }));
      if (action === "evolve") {
        focusTab(item.evolve.tab, item.evolve.path);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to persist decision.");
    } finally {
      setBusy(null);
    }
  }

  async function ingestSnapshot() {
    if (!canWrite) return;
    setBusy("snapshot");
    setMessage(null);
    try {
      const response = await fetch("/api/prototypes/governance/snapshot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prototypeId: selectedPrototypeId }),
      });
      const body = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !body.ok) {
        throw new Error(body.error ?? "Snapshot ingestion failed.");
      }
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Snapshot ingestion failed.");
    } finally {
      setBusy(null);
    }
  }

  async function applyAccepted() {
    if (!canWrite) return;
    setBusy("apply");
    setMessage(null);
    try {
      const response = await fetch("/api/prototypes/governance/apply-accepted", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          prototypeId: selectedPrototypeId,
          snapshotId: selectedSnapshotId,
        }),
      });
      const body = (await response.json()) as {
        ok?: boolean;
        error?: string;
        applied?: string[];
        skipped?: Array<{ diffItemId: string; reason: string }>;
      };
      if (!response.ok || !body.ok) {
        throw new Error(body.error ?? "Apply failed.");
      }
      if (Array.isArray(body.applied)) {
        for (const diffId of body.applied) {
          if (diffId === "authaware-diff") {
            updateContract((current) => ({
              ...current,
              generation: {
                ...current.generation,
                structuralChangesRequireReview: selectedSnapshotSignals.authAware,
              },
            }));
          }
          if (diffId === "hasshell-diff") {
            updateContract((current) => ({
              ...current,
              layout: {
                ...current.layout,
                requireGlobalHeader: selectedSnapshotSignals.hasShell,
              },
            }));
          }
        }
      }
      setMessage(
        `Applied ${body.applied?.length ?? 0} decision(s); skipped ${body.skipped?.length ?? 0}. Baseline updated.`,
      );
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Apply failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className={styles.modalBackdrop}>
      <section className={styles.modal}>
        <div className={styles.panelHeader}>
          <div>
            <div className={styles.h1}>Snapshot Review</div>
            <div className={styles.small}>
              Selected <span className={styles.kbd}>{selectedSnapshotId}</span> vs baseline{" "}
              <span className={styles.kbd}>{baselineSnapshotId}</span> · Pending{" "}
              <span className={styles.kbd}>{pending.length}</span>
            </div>
          </div>
          <button className={styles.tab} onClick={onClose}>
            Close
          </button>
        </div>

        <div className={styles.panelBody}>
          <div className={styles.stack}>
            <div className={styles.row}>
              <button
                className={styles.tab}
                onClick={ingestSnapshot}
                disabled={!canWrite || busy === "snapshot"}
              >
                {busy === "snapshot" ? "Ingesting..." : "Ingest latest snapshot"}
              </button>
              <button
                className={styles.tab}
                onClick={applyAccepted}
                disabled={!canWrite || busy === "apply"}
              >
                {busy === "apply" ? "Applying..." : "Apply accepted"}
              </button>
            </div>

            <div className={styles.row} style={{ flexWrap: "wrap" }}>
              {latestSnapshots.map((entry) => {
                const isSelected = entry.snapshotId === selectedSnapshotId;
                const isBaseline = entry.snapshotId === baselineSnapshotId;
                return (
                  <button
                    key={entry.snapshotId}
                    className={`${styles.tab} ${isSelected ? styles.tabActive : ""}`}
                    onClick={() =>
                      router.replace(
                        `/contracts/governance?prototype=${encodeURIComponent(
                          selectedPrototypeId,
                        )}&snapshot=${encodeURIComponent(entry.snapshotId)}&panel=review`,
                      )
                    }
                  >
                    {entry.snapshotId}
                    {isBaseline ? " (baseline)" : ""}
                  </button>
                );
              })}
            </div>

            {items.length === 0 && (
              <div className={styles.small}>No extraction differences for this snapshot.</div>
            )}

            {items.map((item) => {
              const state = decisionState[item.id];
              const stateLabel = state ? `${state.action} @ ${formatWhen(state.createdAt)}` : "pending";
              const evolveNote = pendingEvolveNoteByDiffItemId[item.id] ?? "";
              return (
                <div key={item.id} className={styles.ruleRowStacked}>
                  <div className={styles.rowBetween}>
                    <div className={styles.h1}>{item.label}</div>
                    <span className={styles.kbd}>{item.kind}</span>
                  </div>
                  <div className={styles.small}>{item.details}</div>
                  <div className={styles.small}>Decision: {stateLabel}</div>
                  <label className={styles.label} htmlFor={`evolve-note-${item.id}`}>
                    Evolve note (optional)
                  </label>
                  <input
                    id={`evolve-note-${item.id}`}
                    className={styles.input}
                    value={evolveNote}
                    onChange={(event) =>
                      setPendingEvolveNoteByDiffItemId((current) => ({
                        ...current,
                        [item.id]: event.target.value,
                      }))
                    }
                    placeholder="Why evolve this constraint?"
                  />
                  <div className={styles.row}>
                    <button
                      className={styles.tab}
                      onClick={() => persistDecision(item, "accept")}
                      disabled={!canWrite || busy !== null}
                    >
                      Accept
                    </button>
                    <button
                      className={styles.tab}
                      onClick={() => persistDecision(item, "reject")}
                      disabled={!canWrite || busy !== null}
                    >
                      Reject
                    </button>
                    <button
                      className={styles.tab}
                      onClick={() => persistDecision(item, "evolve", evolveNote)}
                      disabled={!canWrite || busy !== null}
                    >
                      Evolve constraint
                    </button>
                  </div>
                </div>
              );
            })}
            {message && (
              <div className={styles.pill}>
                <span>{message}</span>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
