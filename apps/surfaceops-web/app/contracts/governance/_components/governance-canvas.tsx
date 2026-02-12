"use client";

import React from "react";
import styles from "./governance.module.css";
import { useContractStore } from "./contract-provider";
import { DriftTab } from "./tabs/drift-tab";
import { GenerationTab } from "./tabs/generation-tab";
import { LayoutTab } from "./tabs/layout-tab";
import { NavigationTab } from "./tabs/navigation-tab";

export function GovernanceCanvas({
  previewBaseUrl,
  previewRoutes,
}: {
  previewBaseUrl: string;
  previewRoutes: string[];
}) {
  const { scope, contract, activeTab, setActiveTab, focusState, clearFocus } =
    useContractStore();
  const [selectedRoute, setSelectedRoute] = React.useState<string>(previewRoutes[0] ?? "/");
  React.useEffect(() => {
    if (!previewRoutes.includes(selectedRoute)) {
      setSelectedRoute(previewRoutes[0] ?? "/");
    }
  }, [previewRoutes, selectedRoute]);
  const previewUrl = `${previewBaseUrl.replace(/\/$/, "")}${selectedRoute}`;

  return (
    <section className={`${styles.panel} ${styles.split}`}>
      <div>
        <div className={styles.panelHeader}>
          <div>
            <div className={styles.h1}>Preview + Builder</div>
            <div className={styles.small}>
              Surface <span className={styles.kbd}>{scope.surface}</span> · Version{" "}
              <span className={styles.kbd}>{scope.contractState}</span> · Last updated now · v
              {contract.version}
            </div>
          </div>
          <div className={styles.pill}>
            <span className={`${styles.dot} ${styles.dotOk}`}></span>
            <span>Generation time constraints</span>
          </div>
        </div>

        <div className={styles.panelBody}>
          <div className={styles.card}>
            <div className={styles.rowBetween}>
              <div>
                <div className={styles.h2}>Surface Preview Canvas</div>
                <div className={styles.small}>{previewUrl}</div>
              </div>
              <div style={{ width: 220 }}>
                <div className={styles.label}>Route</div>
                <select
                  className={styles.select}
                  value={selectedRoute}
                  onChange={(event) => setSelectedRoute(event.target.value)}
                >
                  {previewRoutes.map((route) => (
                    <option key={route} value={route}>
                      {route}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className={styles.previewFrameWrap}>
              <iframe
                className={styles.previewFrame}
                src={previewUrl}
                title="Surface preview"
                loading="lazy"
              />
            </div>
          </div>

          <div className={styles.tabs} style={{ marginTop: 12 }}>
            <button
              className={`${styles.tab} ${activeTab === "layout" ? styles.tabActive : ""}`}
              onClick={() => {
                setActiveTab("layout");
                clearFocus();
              }}
            >
              Layout
            </button>
            <button
              className={`${styles.tab} ${activeTab === "navigation" ? styles.tabActive : ""}`}
              onClick={() => {
                setActiveTab("navigation");
                clearFocus();
              }}
            >
              Navigation
            </button>
            <button
              className={`${styles.tab} ${activeTab === "generation" ? styles.tabActive : ""}`}
              onClick={() => {
                setActiveTab("generation");
                clearFocus();
              }}
            >
              Generation
            </button>
            <button
              className={`${styles.tab} ${activeTab === "drift" ? styles.tabActive : ""}`}
              onClick={() => {
                setActiveTab("drift");
                clearFocus();
              }}
            >
              Drift
            </button>
          </div>

          {focusState && (
            <div className={styles.focusBanner}>
              Evolve guidance: focus on <span className={styles.kbd}>{focusState.path}</span>
            </div>
          )}

          <div style={{ marginTop: 12 }}>
            {activeTab === "layout" && <LayoutTab focusPath={focusState?.path ?? null} />}
            {activeTab === "navigation" && (
              <NavigationTab focusPath={focusState?.path ?? null} />
            )}
            {activeTab === "generation" && (
              <GenerationTab focusPath={focusState?.path ?? null} />
            )}
            {activeTab === "drift" && <DriftTab focusPath={focusState?.path ?? null} />}
          </div>
        </div>
      </div>

      <div className={styles.footer}>
        <div className={styles.small}>
          Every control maps directly to contract fields. No hidden advanced settings.
        </div>
      </div>
    </section>
  );
}
