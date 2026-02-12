"use client";

import styles from "../governance.module.css";
import { useContractStore } from "../contract-provider";

function rowClass(focusPath: string | null, rowPath: string) {
  return `${styles.ruleRow} ${focusPath === rowPath ? styles.ruleRowFocus : ""}`;
}

export function GenerationTab({ focusPath }: { focusPath: string | null }) {
  const { contract, updateContract } = useContractStore();
  const generation = contract.generation;

  function setField(
    field: keyof typeof generation,
    value: boolean,
  ) {
    updateContract((current) => ({
      ...current,
      generation: {
        ...current.generation,
        [field]: value,
      },
    }));
  }

  return (
    <div className={styles.stack}>
      <div className={styles.card}>
        <div className={styles.h2}>Agent Constraints</div>
        <div className={styles.small}>Bound generation-time behavior.</div>

        <div className={styles.stack} style={{ marginTop: 12 }}>
          <div className={rowClass(focusPath, "generation.mustUseDesignTokens")}>
            <div>
              <div className={styles.h1}>Must use design tokens</div>
              <div className={styles.small}>Disallow arbitrary design values.</div>
            </div>
            <select
              className={styles.select}
              value={String(generation.mustUseDesignTokens)}
              onChange={(event) =>
                setField("mustUseDesignTokens", event.target.value === "true")
              }
            >
              <option value="true">Enabled</option>
              <option value="false">Disabled</option>
            </select>
          </div>

          <div className={rowClass(focusPath, "generation.forbidNewLayoutPrimitives")}>
            <div>
              <div className={styles.h1}>Cannot introduce new layout primitives</div>
              <div className={styles.small}>Protect core layout invariants.</div>
            </div>
            <select
              className={styles.select}
              value={String(generation.forbidNewLayoutPrimitives)}
              onChange={(event) =>
                setField("forbidNewLayoutPrimitives", event.target.value === "true")
              }
            >
              <option value="true">Enabled</option>
              <option value="false">Disabled</option>
            </select>
          </div>

          <div className={rowClass(focusPath, "generation.forbidAdditionalNavLayer")}>
            <div>
              <div className={styles.h1}>Cannot add additional navigation layer</div>
              <div className={styles.small}>Prevent nav duplication drift.</div>
            </div>
            <select
              className={styles.select}
              value={String(generation.forbidAdditionalNavLayer)}
              onChange={(event) =>
                setField("forbidAdditionalNavLayer", event.target.value === "true")
              }
            >
              <option value="true">Enabled</option>
              <option value="false">Disabled</option>
            </select>
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.h2}>Escalation</div>
        <div className={styles.small}>Control review and correction behavior.</div>

        <div className={styles.stack} style={{ marginTop: 12 }}>
          <div className={rowClass(focusPath, "generation.structuralChangesRequireReview")}>
            <div>
              <div className={styles.h1}>Structural changes require review</div>
              <div className={styles.small}>Manual gate for major structure edits.</div>
            </div>
            <select
              className={styles.select}
              value={String(generation.structuralChangesRequireReview)}
              onChange={(event) =>
                setField(
                  "structuralChangesRequireReview",
                  event.target.value === "true",
                )
              }
            >
              <option value="true">Enabled</option>
              <option value="false">Disabled</option>
            </select>
          </div>

          <div className={rowClass(focusPath, "generation.autoCorrectMinorDeviation")}>
            <div>
              <div className={styles.h1}>Auto-correct minor deviations</div>
              <div className={styles.small}>Allow correction for low-risk drift.</div>
            </div>
            <select
              className={styles.select}
              value={String(generation.autoCorrectMinorDeviation)}
              onChange={(event) =>
                setField("autoCorrectMinorDeviation", event.target.value === "true")
              }
            >
              <option value="true">Enabled</option>
              <option value="false">Disabled</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
