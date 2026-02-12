"use client";

import React from "react";
import styles from "./governance.module.css";
import { useContractStore } from "./contract-provider";

function Node({
  name,
  value,
}: {
  name: string;
  value: unknown;
}) {
  const [open, setOpen] = React.useState(true);
  const isObject = value && typeof value === "object" && !Array.isArray(value);

  if (!isObject) {
    return (
      <div className={styles.ruleRow}>
        <div className={styles.small}>{name}</div>
        <div className={styles.treeValue}>{String(value)}</div>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <div className={styles.rowBetween}>
        <div className={styles.h2}>{name}</div>
        <button className={styles.tab} onClick={() => setOpen((current) => !current)}>
          {open ? "Collapse" : "Expand"}
        </button>
      </div>
      {open && (
        <div className={styles.stack}>
          {Object.entries(value).map(([key, nestedValue]) => (
            <Node key={key} name={key} value={nestedValue} />
          ))}
        </div>
      )}
    </div>
  );
}

export function StructuredContractView() {
  const { contract } = useContractStore();

  return (
    <div className={styles.stack}>
      <Node name="surface" value={contract.surface} />
      <Node name="version" value={contract.version} />
      <Node name="layout" value={contract.layout} />
      <Node name="navigation" value={contract.navigation} />
      <Node name="generation" value={contract.generation} />
      <Node name="drift" value={contract.drift} />
    </div>
  );
}
