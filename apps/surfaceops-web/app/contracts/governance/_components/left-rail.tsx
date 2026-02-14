"use client";

import { useRouter } from "next/navigation";
import styles from "./governance.module.css";
import { useContractStore } from "./contract-provider";
import type { PrototypeStatus } from "../_lib/prototype-registry";

export function GovernanceSettingsPopover({
  prototypeOptions,
  selectedPrototypeId,
  onClose,
}: {
  prototypeOptions: Array<{ id: string; title: string; status: PrototypeStatus }>;
  selectedPrototypeId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const { scope, setScope } = useContractStore();

  return (
    <div className={styles.popover}>
      <div className={styles.popoverHeader}>
        <div className={styles.h1}>Workspace Settings</div>
        <button className={styles.tab} onClick={onClose}>
          Close
        </button>
      </div>
      <div className={styles.stack}>
        <div>
          <div className={styles.label}>Prototype</div>
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
          <div className={styles.label}>Surface</div>
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
                environment: event.target.value as "dev" | "staging" | "production",
              })
            }
          >
            <option value="dev">Dev</option>
            <option value="staging">Staging</option>
            <option value="production">Production</option>
          </select>
        </div>
      </div>
    </div>
  );
}
