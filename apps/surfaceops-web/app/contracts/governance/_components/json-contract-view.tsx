"use client";

import React from "react";
import styles from "./governance.module.css";
import { useContractStore } from "./contract-provider";

export function JsonContractView() {
  const { contract, setContractFromJson } = useContractStore();
  const [raw, setRaw] = React.useState<string>(() => JSON.stringify(contract, null, 2));
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setRaw(JSON.stringify(contract, null, 2));
  }, [contract]);

  function apply() {
    const result = setContractFromJson(raw);
    if (!result.ok) {
      setError(result.error ?? "Invalid JSON");
      return;
    }
    setError(null);
  }

  async function copy() {
    await navigator.clipboard.writeText(raw);
  }

  return (
    <div className={styles.card}>
      <div className={styles.rowBetween} style={{ marginBottom: 10 }}>
        <div>
          <div className={styles.h2}>Raw JSON</div>
          <div className={styles.small}>Editable in MVP with live validation.</div>
        </div>
        <div className={styles.row}>
          <button className={styles.tab} onClick={copy}>
            Copy
          </button>
          <button className={styles.tab} onClick={apply}>
            Apply
          </button>
        </div>
      </div>
      <textarea
        className={`${styles.textarea} ${styles.mono}`}
        value={raw}
        rows={18}
        spellCheck={false}
        onChange={(event) => setRaw(event.target.value)}
      />
      {error && (
        <div className={styles.pill} style={{ marginTop: 10 }}>
          <span className={`${styles.dot} ${styles.dotDanger}`}></span>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
