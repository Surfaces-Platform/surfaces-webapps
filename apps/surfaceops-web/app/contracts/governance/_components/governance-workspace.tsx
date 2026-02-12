"use client";

import styles from "./governance.module.css";
import { ContractPanel } from "./contract-panel";
import { ContractProvider } from "./contract-provider";
import { GovernanceCanvas } from "./governance-canvas";
import { LeftRail } from "./left-rail";
import type { ExtractionDiffItem } from "../_lib/prototype-diff";
import type { PrototypeStatus } from "../_lib/prototype-registry";
import type { SurfaceContract } from "../_lib/types";

export interface GovernanceWorkspaceProps {
  initialContract: SurfaceContract;
  prototypeOptions: Array<{ id: string; title: string; status: PrototypeStatus }>;
  selectedPrototypeId: string;
  selectedPrototypeTitle: string;
  selectedPrototypeStatus: PrototypeStatus;
  selectedPrototypeSummary: string;
  extractionSummary: { routes: number; designSystemComponents: number; authAware: boolean };
  previewRoutes: string[];
  previewBaseUrl: string;
  diffItems: ExtractionDiffItem[];
  latestExtractionUpdatedAt: string;
  usedFallback: boolean;
}

export function GovernanceWorkspace({
  initialContract,
  prototypeOptions,
  selectedPrototypeId,
  selectedPrototypeTitle,
  selectedPrototypeStatus,
  selectedPrototypeSummary,
  extractionSummary,
  previewRoutes,
  previewBaseUrl,
  diffItems,
  latestExtractionUpdatedAt,
  usedFallback,
}: GovernanceWorkspaceProps) {
  return (
    <ContractProvider initialContract={initialContract}>
      <main className={styles.root}>
        <header className={styles.header}>
          <h1 className={styles.title}>Governance Workspace</h1>
          <p className={styles.subtitle}>
            Define UI governance constraints visually and keep a synchronized contract artifact.
          </p>
          <p className={styles.subtitle}>
            Prototype <span className={styles.kbd}>{selectedPrototypeId}</span> · {selectedPrototypeTitle}
          </p>
          {usedFallback && (
            <p className={styles.subtitle}>
              Requested prototype was not found. Loaded active prototype instead.
            </p>
          )}
          {selectedPrototypeStatus === "archived" && (
            <p className={styles.subtitle}>
              This prototype is archived and shown for historical review.
            </p>
          )}
          <p className={styles.subtitle}>
            Extraction snapshot: {extractionSummary.routes} routes ·{" "}
            {extractionSummary.designSystemComponents} design-system components · authAware{" "}
            {String(extractionSummary.authAware)}
          </p>
          <p className={styles.subtitle}>
            Latest extraction seen at {latestExtractionUpdatedAt}. Pull refresh with{" "}
            <span className={styles.kbd}>pnpm prototype:governance:snapshot -- --prototype {selectedPrototypeId}</span>
          </p>
          <p className={styles.subtitle}>{selectedPrototypeSummary}</p>
        </header>
        <section className={styles.container}>
          <LeftRail
            prototypeOptions={prototypeOptions}
            selectedPrototypeId={selectedPrototypeId}
          />
          <GovernanceCanvas previewBaseUrl={previewBaseUrl} previewRoutes={previewRoutes} />
          <ContractPanel diffItems={diffItems} />
        </section>
      </main>
    </ContractProvider>
  );
}
