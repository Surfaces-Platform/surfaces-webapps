"use client";

import styles from "./governance.module.css";
import { useContractStore } from "./contract-provider";

function indicator(level: string): { dotClass: string; label: string } {
  if (level === "danger") {
    return { dotClass: styles.dotDanger, label: "Blocking" };
  }
  if (level === "warn") {
    return { dotClass: styles.dotWarn, label: "Warning" };
  }
  return { dotClass: styles.dotOk, label: "OK" };
}

export function FindingsPanel() {
  const { findings, simulation } = useContractStore();

  return (
    <div className={styles.stack}>
      <div className={styles.card}>
        <div className={styles.h2}>Validation Findings</div>
        <div className={styles.small}>Schema validation for the current contract JSON.</div>
        <div className={styles.stack} style={{ marginTop: 10 }}>
          {findings.map((finding, index) => {
            const state = indicator(finding.level);
            return (
              <div className={styles.ruleRow} key={`${finding.path ?? ""}-${index}`}>
                <div>
                  <div className={styles.pill}>
                    <span className={`${styles.dot} ${state.dotClass}`}></span>
                    <span>{state.label}</span>
                  </div>
                  <div style={{ marginTop: 8 }}>{finding.message}</div>
                  {finding.path && (
                    <div className={`${styles.small} ${styles.mono}`} style={{ marginTop: 6 }}>
                      {finding.path}
                    </div>
                  )}
                </div>
                <div className={styles.small} style={{ textAlign: "right" }}>
                  AJV
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.h2}>Impact Simulation</div>
        <div className={styles.small}>Predicted violations based on current rules.</div>
        <div className={styles.stack} style={{ marginTop: 10 }}>
          {simulation.length === 0 && (
            <div className={styles.small}>No predicted issues.</div>
          )}
          {simulation.map((entry) => {
            const dotClass =
              entry.level === "block"
                ? styles.dotDanger
                : entry.level === "warn"
                  ? styles.dotWarn
                  : styles.dotOk;
            const label =
              entry.level === "block"
                ? "Blocking"
                : entry.level === "warn"
                  ? "Warning"
                  : "Info";
            return (
              <div className={styles.ruleRow} key={entry.id}>
                <div>
                  <div className={styles.pill}>
                    <span className={`${styles.dot} ${dotClass}`}></span>
                    <span>{label}</span>
                  </div>
                  <div style={{ marginTop: 8 }}>{entry.message}</div>
                  {entry.rulePath && (
                    <div className={`${styles.small} ${styles.mono}`} style={{ marginTop: 6 }}>
                      {entry.rulePath}
                    </div>
                  )}
                </div>
                <div className={styles.small} style={{ textAlign: "right" }}>
                  SIM
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
