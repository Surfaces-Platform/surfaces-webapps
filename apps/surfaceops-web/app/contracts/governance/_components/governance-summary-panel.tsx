"use client";

import styles from "./governance.module.css";
import { useContractStore } from "./contract-provider";

export function GovernanceSummaryPanel() {
  const { findings, simulation } = useContractStore();
  const blockingCount = findings.filter((f) => f.level === "danger").length;
  const warningCount = findings.filter((f) => f.level === "warn").length;
  const simulationBlockCount = simulation.filter((entry) => entry.level === "block").length;
  const simulationWarnCount = simulation.filter((entry) => entry.level === "warn").length;

  return (
    <aside className={`${styles.panel} ${styles.split}`}>
      <div>
        <div className={styles.panelHeader}>
          <div>
            <div className={styles.h1}>Readiness</div>
            <div className={styles.small}>High-signal checks for current draft.</div>
          </div>
        </div>
        <div className={styles.panelBody}>
          <div className={styles.stack}>
            <div className={styles.card}>
              <div className={styles.h2}>Validation</div>
              <div className={styles.rowBetween}>
                <span className={styles.small}>Blocking</span>
                <span className={styles.kbd}>{blockingCount}</span>
              </div>
              <div className={styles.rowBetween}>
                <span className={styles.small}>Warnings</span>
                <span className={styles.kbd}>{warningCount}</span>
              </div>
            </div>
            <div className={styles.card}>
              <div className={styles.h2}>Impact Simulation</div>
              <div className={styles.rowBetween}>
                <span className={styles.small}>Blocking</span>
                <span className={styles.kbd}>{simulationBlockCount}</span>
              </div>
              <div className={styles.rowBetween}>
                <span className={styles.small}>Warnings</span>
                <span className={styles.kbd}>{simulationWarnCount}</span>
              </div>
            </div>
            <div className={styles.card}>
              <div className={styles.h2}>Recent Signals</div>
              {simulation.slice(0, 3).map((item) => (
                <div key={item.id} className={styles.small} style={{ marginTop: 6 }}>
                  {item.message}
                </div>
              ))}
              {simulation.length === 0 && (
                <div className={styles.small}>No predicted issues.</div>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className={styles.footer}>
        <div className={styles.small}>Focus on blocking findings before publish.</div>
      </div>
    </aside>
  );
}
