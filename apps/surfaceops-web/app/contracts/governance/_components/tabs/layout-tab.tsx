"use client";

import type { RuleLevel } from "../../_lib/types";
import styles from "../governance.module.css";
import { useContractStore } from "../contract-provider";

function RuleSelect({
  value,
  onChange,
}: {
  value: RuleLevel;
  onChange: (value: RuleLevel) => void;
}) {
  return (
    <select
      className={styles.select}
      value={value}
      onChange={(event) => onChange(event.target.value as RuleLevel)}
    >
      <option value="required">Required</option>
      <option value="allowed">Allowed</option>
      <option value="forbidden">Forbidden</option>
    </select>
  );
}

function rowClass(focusPath: string | null, rowPath: string) {
  return `${styles.ruleRow} ${focusPath === rowPath ? styles.ruleRowFocus : ""}`;
}

export function LayoutTab({ focusPath }: { focusPath: string | null }) {
  const { contract, updateContract } = useContractStore();
  const patterns = contract.layout.allowedPatterns;

  return (
    <div className={styles.stack}>
      <div className={styles.card}>
        <div className={styles.h2}>Allowed Layout Patterns</div>
        <div className={styles.small}>Generation-time pattern guardrails.</div>
        <div className={styles.stack} style={{ marginTop: 12 }}>
          <div className={rowClass(focusPath, "layout.singleColumn")}> 
            <div>
              <div className={styles.h1}>Single column</div>
              <div className={styles.small}>Linear content flow.</div>
            </div>
            <RuleSelect
              value={patterns.singleColumn}
              onChange={(value) =>
                updateContract((current) => ({
                  ...current,
                  layout: {
                    ...current.layout,
                    allowedPatterns: {
                      ...current.layout.allowedPatterns,
                      singleColumn: value,
                    },
                  },
                }))
              }
            />
          </div>

          <div className={rowClass(focusPath, "layout.sidebarContent")}>
            <div>
              <div className={styles.h1}>Sidebar + content</div>
              <div className={styles.small}>Persistent side navigation and content area.</div>
            </div>
            <RuleSelect
              value={patterns.sidebarContent}
              onChange={(value) =>
                updateContract((current) => ({
                  ...current,
                  layout: {
                    ...current.layout,
                    allowedPatterns: {
                      ...current.layout.allowedPatterns,
                      sidebarContent: value,
                    },
                  },
                }))
              }
            />
          </div>

          <div className={rowClass(focusPath, "layout.dashboardGrid")}>
            <div>
              <div className={styles.h1}>Dashboard grid</div>
              <div className={styles.small}>Card-grid based control plane.</div>
            </div>
            <RuleSelect
              value={patterns.dashboardGrid}
              onChange={(value) =>
                updateContract((current) => ({
                  ...current,
                  layout: {
                    ...current.layout,
                    allowedPatterns: {
                      ...current.layout.allowedPatterns,
                      dashboardGrid: value,
                    },
                  },
                }))
              }
            />
          </div>

          <div className={rowClass(focusPath, "layout.wizardFlow")}>
            <div>
              <div className={styles.h1}>Wizard flow</div>
              <div className={styles.small}>Step-by-step workflow pattern.</div>
            </div>
            <RuleSelect
              value={patterns.wizardFlow}
              onChange={(value) =>
                updateContract((current) => ({
                  ...current,
                  layout: {
                    ...current.layout,
                    allowedPatterns: {
                      ...current.layout.allowedPatterns,
                      wizardFlow: value,
                    },
                  },
                }))
              }
            />
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.h2}>Structural Rules</div>
        <div className={styles.small}>Hard constraints for shell and content framing.</div>

        <div className={styles.stack} style={{ marginTop: 12 }}>
          <div className={rowClass(focusPath, "layout.maxContentWidth")}>
            <div>
              <div className={styles.h1}>Max content width</div>
              <div className={styles.small}>Numeric width cap in pixels.</div>
            </div>
            <input
              className={styles.input}
              type="number"
              min={320}
              max={2400}
              value={contract.layout.maxContentWidth}
              onChange={(event) =>
                updateContract((current) => ({
                  ...current,
                  layout: {
                    ...current.layout,
                    maxContentWidth: Number(event.target.value),
                  },
                }))
              }
            />
          </div>

          <div className={rowClass(focusPath, "layout.requireGlobalHeader")}>
            <div>
              <div className={styles.h1}>Require global header</div>
              <div className={styles.small}>Prevents header drift.</div>
            </div>
            <select
              className={styles.select}
              value={String(contract.layout.requireGlobalHeader)}
              onChange={(event) =>
                updateContract((current) => ({
                  ...current,
                  layout: {
                    ...current.layout,
                    requireGlobalHeader: event.target.value === "true",
                  },
                }))
              }
            >
              <option value="true">Enabled</option>
              <option value="false">Disabled</option>
            </select>
          </div>

          <div className={rowClass(focusPath, "layout.requirePageContainer")}>
            <div>
              <div className={styles.h1}>Require page container</div>
              <div className={styles.small}>Maintains contract-aligned spacing.</div>
            </div>
            <select
              className={styles.select}
              value={String(contract.layout.requirePageContainer)}
              onChange={(event) =>
                updateContract((current) => ({
                  ...current,
                  layout: {
                    ...current.layout,
                    requirePageContainer: event.target.value === "true",
                  },
                }))
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
