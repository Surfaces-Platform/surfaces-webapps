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

export function NavigationTab({ focusPath }: { focusPath: string | null }) {
  const { contract, updateContract } = useContractStore();
  const navTypes = contract.navigation.types;

  return (
    <div className={styles.stack}>
      <div className={styles.card}>
        <div className={styles.h2}>Navigation Types</div>
        <div className={styles.small}>Prevent duplicate or conflicting navigation systems.</div>

        <div className={styles.stack} style={{ marginTop: 12 }}>
          <div className={rowClass(focusPath, "navigation.topNav")}>
            <div>
              <div className={styles.h1}>Top navigation</div>
              <div className={styles.small}>Global header navigation.</div>
            </div>
            <RuleSelect
              value={navTypes.topNav}
              onChange={(value) =>
                updateContract((current) => ({
                  ...current,
                  navigation: {
                    ...current.navigation,
                    types: { ...current.navigation.types, topNav: value },
                  },
                }))
              }
            />
          </div>

          <div className={rowClass(focusPath, "navigation.sideNav")}>
            <div>
              <div className={styles.h1}>Side navigation</div>
              <div className={styles.small}>Persistent navigation rail.</div>
            </div>
            <RuleSelect
              value={navTypes.sideNav}
              onChange={(value) =>
                updateContract((current) => ({
                  ...current,
                  navigation: {
                    ...current.navigation,
                    types: { ...current.navigation.types, sideNav: value },
                  },
                }))
              }
            />
          </div>

          <div className={rowClass(focusPath, "navigation.tabs")}>
            <div>
              <div className={styles.h1}>Tabs</div>
              <div className={styles.small}>Intra-page navigation tabs.</div>
            </div>
            <RuleSelect
              value={navTypes.tabs}
              onChange={(value) =>
                updateContract((current) => ({
                  ...current,
                  navigation: {
                    ...current.navigation,
                    types: { ...current.navigation.types, tabs: value },
                  },
                }))
              }
            />
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.h2}>Depth Rules</div>
        <div className={styles.small}>Control hierarchy depth and nav duplication.</div>

        <div className={styles.stack} style={{ marginTop: 12 }}>
          <div className={rowClass(focusPath, "navigation.maxDepth")}>
            <div>
              <div className={styles.h1}>Max navigation depth</div>
              <div className={styles.small}>Depth stepper.</div>
            </div>
            <input
              className={styles.input}
              type="number"
              min={1}
              max={6}
              value={contract.navigation.maxDepth}
              onChange={(event) =>
                updateContract((current) => ({
                  ...current,
                  navigation: {
                    ...current.navigation,
                    maxDepth: Number(event.target.value),
                  },
                }))
              }
            />
          </div>

          <div className={rowClass(focusPath, "navigation.disallowDuplicateNavigation")}>
            <div>
              <div className={styles.h1}>Disallow duplicate navigation</div>
              <div className={styles.small}>Prevents extra nav layers.</div>
            </div>
            <select
              className={styles.select}
              value={String(contract.navigation.disallowDuplicateNavigation)}
              onChange={(event) =>
                updateContract((current) => ({
                  ...current,
                  navigation: {
                    ...current.navigation,
                    disallowDuplicateNavigation: event.target.value === "true",
                  },
                }))
              }
            >
              <option value="true">Enabled</option>
              <option value="false">Disabled</option>
            </select>
          </div>

          <div className={rowClass(focusPath, "navigation.requireSinglePrimaryNav")}>
            <div>
              <div className={styles.h1}>Require single primary navigation</div>
              <div className={styles.small}>Single canonical nav system.</div>
            </div>
            <select
              className={styles.select}
              value={String(contract.navigation.requireSinglePrimaryNav)}
              onChange={(event) =>
                updateContract((current) => ({
                  ...current,
                  navigation: {
                    ...current.navigation,
                    requireSinglePrimaryNav: event.target.value === "true",
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
