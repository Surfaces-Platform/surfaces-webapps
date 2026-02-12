"use client";

import styles from "../governance.module.css";
import { useContractStore } from "../contract-provider";

function rowClass(focusPath: string | null, rowPath: string) {
  return `${styles.ruleRow} ${focusPath === rowPath ? styles.ruleRowFocus : ""}`;
}

export function DriftTab({ focusPath }: { focusPath: string | null }) {
  const { contract, updateContract } = useContractStore();
  const drift = contract.drift;

  return (
    <div className={styles.stack}>
      <div className={styles.card}>
        <div className={styles.h2}>Drift Controls</div>
        <div className={styles.small}>Define CI/CD drift enforcement behavior.</div>

        <div className={styles.stack} style={{ marginTop: 12 }}>
          <div className={rowClass(focusPath, "drift.detectionMode")}>
            <div>
              <div className={styles.h1}>Drift detection mode</div>
              <div className={styles.small}>When drift checks run.</div>
            </div>
            <select
              className={styles.select}
              value={drift.detectionMode}
              onChange={(event) =>
                updateContract((current) => ({
                  ...current,
                  drift: {
                    ...current.drift,
                    detectionMode: event.target.value as "onCommit" | "onBuild",
                  },
                }))
              }
            >
              <option value="onCommit">On commit</option>
              <option value="onBuild">On build</option>
            </select>
          </div>

          <div className={rowClass(focusPath, "drift.severityThreshold")}>
            <div>
              <div className={styles.h1}>Severity threshold</div>
              <div className={styles.small}>Informational, warning, or blocking.</div>
            </div>
            <select
              className={styles.select}
              value={drift.severityThreshold}
              onChange={(event) =>
                updateContract((current) => ({
                  ...current,
                  drift: {
                    ...current.drift,
                    severityThreshold: event.target.value as
                      | "informational"
                      | "warning"
                      | "blocking",
                  },
                }))
              }
            >
              <option value="informational">Informational</option>
              <option value="warning">Warning</option>
              <option value="blocking">Blocking</option>
            </select>
          </div>

          <div className={rowClass(focusPath, "drift.autoFixPolicy")}>
            <div>
              <div className={styles.h1}>Auto-fix policy</div>
              <div className={styles.small}>Never or safe-only.</div>
            </div>
            <select
              className={styles.select}
              value={drift.autoFixPolicy}
              onChange={(event) =>
                updateContract((current) => ({
                  ...current,
                  drift: {
                    ...current.drift,
                    autoFixPolicy: event.target.value as "never" | "safeOnly",
                  },
                }))
              }
            >
              <option value="never">Never</option>
              <option value="safeOnly">Safe only</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
