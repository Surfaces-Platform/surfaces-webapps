"use client";

import React from "react";
import styles from "./governance.module.css";
import { ContractPanel } from "./contract-panel";
import { ContractProvider, useContractStore } from "./contract-provider";
import { ExtractionDiffPanel } from "./extraction-diff-panel";
import { GovernanceCanvas } from "./governance-canvas";
import { GovernanceSummaryPanel } from "./governance-summary-panel";
import { GovernanceSettingsPopover } from "./left-rail";
import type { ExtractionDiffItem } from "../_lib/prototype-diff";
import type { PrototypeStatus } from "../_lib/prototype-registry";
import type { SurfaceContract } from "../_lib/types";

type WorkspacePanel = "editor" | "snapshotModal" | "contractDrawer";

export interface GovernanceWorkspaceProps {
  initialContract: SurfaceContract;
  prototypeOptions: Array<{ id: string; title: string; status: PrototypeStatus }>;
  selectedPrototypeId: string;
  selectedPrototypeTitle: string;
  selectedPrototypeStatus: PrototypeStatus;
  previewRoutes: string[];
  previewBaseUrl: string;
  diffItems: ExtractionDiffItem[];
  latestExtractionUpdatedAt: string;
  canWrite: boolean;
  selectedSnapshotId: string;
  baselineSnapshotId: string;
  snapshotTimeline: Array<{ snapshotId: string; createdAt: string }>;
  selectedSnapshotSignals: { authAware: boolean; hasShell: boolean };
  initialPanel: WorkspacePanel;
}

function HeaderActions({
  canWrite,
  selectedPrototypeId,
  selectedSnapshotId,
  baselineSnapshotId,
  latestExtractionUpdatedAt,
  diffItems,
  prototypeOptions,
  activePanel,
  setActivePanel,
  isSettingsOpen,
  setIsSettingsOpen,
}: {
  canWrite: boolean;
  selectedPrototypeId: string;
  selectedSnapshotId: string;
  baselineSnapshotId: string;
  latestExtractionUpdatedAt: string;
  diffItems: ExtractionDiffItem[];
  prototypeOptions: Array<{ id: string; title: string; status: PrototypeStatus }>;
  activePanel: WorkspacePanel;
  setActivePanel: (panel: WorkspacePanel) => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (value: boolean) => void;
}) {
  const { findings, isValidForPublish } = useContractStore();
  const unresolvedDiffCount = diffItems.filter((item) => item.decisionState === null).length;
  const blockingFinding = findings.find((finding) => finding.level === "danger");

  return (
    <header className={styles.taskHeader}>
      <div>
        <h1 className={styles.title}>Governance Workspace</h1>
        <p className={styles.subtitle}>Edit draft rules first. Review and apply snapshot changes only when needed.</p>
      </div>
      <div className={styles.headerMeta}>
        <span className={styles.kbd}>Prototype {selectedPrototypeId}</span>
        <span className={styles.kbd}>Selected {selectedSnapshotId}</span>
        <span className={styles.kbd}>Baseline {baselineSnapshotId}</span>
        <span className={styles.kbd}>Needs review {unresolvedDiffCount}</span>
        <span className={styles.small}>Updated {latestExtractionUpdatedAt}</span>
      </div>
      <div className={styles.headerActions}>
        <button
          className={`${styles.tab} ${activePanel === "snapshotModal" ? styles.tabActive : ""}`}
          onClick={() =>
            setActivePanel(activePanel === "snapshotModal" ? "editor" : "snapshotModal")
          }
        >
          Review Snapshot
        </button>
        <button
          className={`${styles.tab} ${activePanel === "contractDrawer" ? styles.tabActive : ""}`}
          onClick={() =>
            setActivePanel(activePanel === "contractDrawer" ? "editor" : "contractDrawer")
          }
        >
          View Draft Contract
        </button>
        <button
          className={`${styles.tab} ${isSettingsOpen ? styles.tabActive : ""}`}
          onClick={() => setIsSettingsOpen(!isSettingsOpen)}
        >
          Settings
        </button>
        <button className={styles.btn} disabled={!isValidForPublish || !canWrite}>
          Publish Contract
        </button>
      </div>
      {(!isValidForPublish || !canWrite) && (
        <div className={styles.small}>
          Publish unavailable:{" "}
          {!canWrite
            ? "historical prototype is read-only."
            : blockingFinding?.message ?? "resolve blocking validation findings."}
        </div>
      )}
      {isSettingsOpen && (
        <GovernanceSettingsPopover
          prototypeOptions={prototypeOptions}
          selectedPrototypeId={selectedPrototypeId}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
    </header>
  );
}

export function GovernanceWorkspace({
  initialContract,
  prototypeOptions,
  selectedPrototypeId,
  selectedPrototypeTitle,
  selectedPrototypeStatus,
  previewRoutes,
  previewBaseUrl,
  diffItems,
  latestExtractionUpdatedAt,
  canWrite,
  selectedSnapshotId,
  baselineSnapshotId,
  snapshotTimeline,
  selectedSnapshotSignals,
  initialPanel,
}: GovernanceWorkspaceProps) {
  const [activePanel, setActivePanel] = React.useState<WorkspacePanel>(initialPanel);
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);

  return (
    <ContractProvider initialContract={initialContract}>
      <main className={styles.root}>
        <HeaderActions
          canWrite={canWrite}
          selectedPrototypeId={selectedPrototypeId}
          selectedSnapshotId={selectedSnapshotId}
          baselineSnapshotId={baselineSnapshotId}
          latestExtractionUpdatedAt={latestExtractionUpdatedAt}
          diffItems={diffItems}
          prototypeOptions={prototypeOptions}
          activePanel={activePanel}
          setActivePanel={setActivePanel}
          isSettingsOpen={isSettingsOpen}
          setIsSettingsOpen={setIsSettingsOpen}
        />

        <section className={styles.editorLayout}>
          <div className={styles.editorMain}>
            <GovernanceCanvas previewBaseUrl={previewBaseUrl} previewRoutes={previewRoutes} />
          </div>
          <GovernanceSummaryPanel />
        </section>

        {activePanel === "snapshotModal" && (
          <ExtractionDiffPanel
            items={diffItems}
            canWrite={canWrite}
            selectedPrototypeId={selectedPrototypeId}
            selectedSnapshotId={selectedSnapshotId}
            baselineSnapshotId={baselineSnapshotId}
            snapshotTimeline={snapshotTimeline}
            selectedSnapshotSignals={selectedSnapshotSignals}
            onClose={() => setActivePanel("editor")}
          />
        )}

        {activePanel === "contractDrawer" && (
          <ContractPanel onClose={() => setActivePanel("editor")} />
        )}

        {!canWrite && selectedPrototypeStatus === "archived" && (
          <div className={styles.small} style={{ marginTop: 10 }}>
            {selectedPrototypeTitle} is archived and shown for historical review.
          </div>
        )}
      </main>
    </ContractProvider>
  );
}
