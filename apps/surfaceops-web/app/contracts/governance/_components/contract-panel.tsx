"use client";

import React from "react";
import styles from "./governance.module.css";
import { ExtractionDiffPanel } from "./extraction-diff-panel";
import { FindingsPanel } from "./findings-panel";
import { JsonContractView } from "./json-contract-view";
import { StructuredContractView } from "./structured-contract-view";
import type { ExtractionDiffItem } from "../_lib/prototype-diff";

type PanelTab = "structured" | "json";

export function ContractPanel({ diffItems }: { diffItems: ExtractionDiffItem[] }) {
  const [tab, setTab] = React.useState<PanelTab>("structured");

  return (
    <section className={`${styles.panel} ${styles.split}`}>
      <div>
        <div className={styles.panelHeader}>
          <div>
            <div className={styles.h1}>Contract Panel</div>
            <div className={styles.small}>Structured and JSON contract views stay synchronized.</div>
          </div>
        </div>

        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${tab === "structured" ? styles.tabActive : ""}`}
            onClick={() => setTab("structured")}
          >
            Structured
          </button>
          <button
            className={`${styles.tab} ${tab === "json" ? styles.tabActive : ""}`}
            onClick={() => setTab("json")}
          >
            JSON
          </button>
        </div>

        <div className={styles.panelBody}>
          <div className={styles.stack}>
            {tab === "structured" && <StructuredContractView />}
            {tab === "json" && <JsonContractView />}
            <ExtractionDiffPanel items={diffItems} />
            <FindingsPanel />
          </div>
        </div>
      </div>

      <div className={styles.footer}>
        <div className={styles.small}>Impact simulation predicts violations if this surface is generated now.</div>
      </div>
    </section>
  );
}
