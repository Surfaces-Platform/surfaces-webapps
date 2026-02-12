"use client";

import React from "react";
import styles from "./governance.module.css";
import { useContractStore } from "./contract-provider";
import type { ExtractionDiffItem } from "../_lib/prototype-diff";

export function ExtractionDiffPanel({
  items,
}: {
  items: ExtractionDiffItem[];
}) {
  const { focusTab } = useContractStore();
  const [accepted, setAccepted] = React.useState<Record<string, true>>({});
  const [rejected, setRejected] = React.useState<Record<string, true>>({});

  const pending = items.filter((item) => !accepted[item.id] && !rejected[item.id]);

  return (
    <div className={styles.card}>
      <div className={styles.rowBetween}>
        <div>
          <div className={styles.h2}>Extraction Compare</div>
          <div className={styles.small}>
            Compare prototype snapshot against latest extraction and decide how to evolve constraints.
          </div>
        </div>
        <div className={styles.small}>
          Pending <span className={styles.kbd}>{pending.length}</span>
        </div>
      </div>

      <div className={styles.stack} style={{ marginTop: 10 }}>
        {pending.length === 0 && (
          <div className={styles.small}>No unresolved extraction differences.</div>
        )}

        {pending.map((item) => (
          <div key={item.id} className={styles.ruleRowStacked}>
            <div className={styles.rowBetween}>
              <div className={styles.h1}>{item.label}</div>
              <span className={styles.kbd}>{item.kind}</span>
            </div>
            <div className={styles.small}>{item.details}</div>
            <div className={styles.row}>
              <button
                className={styles.tab}
                onClick={() => setAccepted((prev) => ({ ...prev, [item.id]: true }))}
              >
                Accept
              </button>
              <button
                className={styles.tab}
                onClick={() => setRejected((prev) => ({ ...prev, [item.id]: true }))}
              >
                Reject
              </button>
              <button
                className={styles.tab}
                onClick={() => focusTab(item.evolve.tab, item.evolve.path)}
              >
                Evolve constraint
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
