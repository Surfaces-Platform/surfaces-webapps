"use client";

import { useRouter } from "next/navigation";
import styles from "./governance.module.css";
import { useContractStore } from "./contract-provider";
import type { PrototypeStatus } from "../_lib/prototype-registry";

function getStatus(levels: string[]) {
  if (levels.includes("danger")) {
    return { dotClass: styles.dotDanger, label: "Blocking" };
  }
  if (levels.includes("warn")) {
    return { dotClass: styles.dotWarn, label: "Warning" };
  }
  return { dotClass: styles.dotOk, label: "Valid" };
}

export function LeftRail({
  prototypeOptions,
  selectedPrototypeId,
}: {
  prototypeOptions: Array<{ id: string; title: string; status: PrototypeStatus }>;
  selectedPrototypeId: string;
}) {
  const router = useRouter();
  const { scope, setScope, findings, isValidForPublish } = useContractStore();
  const status = getStatus(findings.map((finding) => finding.level));

  return (
    <aside className={`${styles.panel} ${styles.split}`}>
      <div>
        <div className={styles.panelHeader}>
          <div>
            <div className={styles.h1}>Scope and Publish</div>
            <div className={styles.small}>Define governance scope and release state.</div>
          </div>
        </div>

        <div className={styles.panelBody}>
          <div className={styles.stack}>
            <div>
              <div className={styles.label}>Prototype Version</div>
              <select
                className={styles.select}
                value={selectedPrototypeId}
                onChange={(event) =>
                  router.replace(
                    `/contracts/governance?prototype=${encodeURIComponent(event.target.value)}`,
                  )
                }
              >
                {prototypeOptions.map((prototype) => (
                  <option key={prototype.id} value={prototype.id}>
                    {prototype.id} · {prototype.title}
                    {prototype.status === "archived" ? " (archived)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className={styles.label}>Surface Selector</div>
              <select
                className={styles.select}
                value={scope.surface}
                onChange={(event) =>
                  setScope({
                    surface: event.target.value as "app" | "marketing" | "admin" | "cli",
                  })
                }
              >
                <option value="app">App</option>
                <option value="marketing">Marketing</option>
                <option value="admin">Admin</option>
                <option value="cli">CLI</option>
              </select>
            </div>

            <div>
              <div className={styles.label}>Contract Version</div>
              <select
                className={styles.select}
                value={scope.contractState}
                onChange={(event) =>
                  setScope({
                    contractState: event.target.value as "draft" | "active" | "proposed",
                  })
                }
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="proposed">Proposed</option>
              </select>
            </div>

            <div>
              <div className={styles.label}>Environment</div>
              <select
                className={styles.select}
                value={scope.environment}
                onChange={(event) =>
                  setScope({
                    environment: event.target.value as
                      | "dev"
                      | "staging"
                      | "production",
                  })
                }
              >
                <option value="dev">Dev</option>
                <option value="staging">Staging</option>
                <option value="production">Production</option>
              </select>
            </div>

            <div className={styles.card}>
              <div className={styles.rowBetween}>
                <div>
                  <div className={styles.label}>Validation Status</div>
                  <div className={styles.pill}>
                    <span className={`${styles.dot} ${status.dotClass}`}></span>
                    <span>{status.label}</span>
                  </div>
                </div>
                <div className={styles.small}>
                  <span className={styles.kbd}>real-time</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.footer}>
        <button className={styles.btn} disabled={!isValidForPublish}>
          Publish Contract
        </button>
      </div>
    </aside>
  );
}
