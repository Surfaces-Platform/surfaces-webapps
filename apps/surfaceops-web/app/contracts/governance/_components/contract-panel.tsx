"use client";

import React from "react";
import styles from "./governance.module.css";
import { JsonContractView } from "./json-contract-view";
import { StructuredContractView } from "./structured-contract-view";

type PanelTab = "structured" | "json";

export function ContractPanel({
  onClose,
}: {
  onClose: () => void;
}) {
  const [tab, setTab] = React.useState<PanelTab>("structured");

  return (
    <aside className={styles.drawer}>
      <div className={styles.panelHeader}>
        <div>
          <div className={styles.h1}>Draft Contract</div>
          <div className={styles.small}>Inspect and edit structured/JSON artifact on demand.</div>
        </div>
        <button className={styles.tab} onClick={onClose}>
          Close
        </button>
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
        </div>
      </div>
    </aside>
  );
}
