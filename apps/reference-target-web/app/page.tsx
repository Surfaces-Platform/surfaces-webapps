import type { ReactNode } from "react";

type Params = {
  simulateDuplicateNav?: string;
  simulateMissingHeader?: string;
  simulateRawStyles?: string;
  simulateMissingPageContainer?: string;
  simulateDestructiveWithoutGuard?: string;
  simulateDestructiveWithConfirm?: string;
  simulateUndersizedActionTarget?: string;
  simulateTightActionGap?: string;
  simulateEdgePinnedActionTarget?: string;
  simulateCrowdedDestructiveAction?: string;
  simulateUnobservableTargets?: string;
};

function targetContractProps(
  enabled: boolean,
  targetId: string,
  gapPx: number,
  edgeInsetPx: number,
): Record<string, string> {
  return enabled
    ? {
        "data-contract-target": targetId,
        "data-contract-target-gap": String(gapPx),
        "data-contract-target-edge-inset": String(edgeInsetPx),
      }
    : {};
}

function readFlag(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const params = await searchParams;
  const simulateDuplicateNav = readFlag(params.simulateDuplicateNav);
  const simulateMissingHeader = readFlag(params.simulateMissingHeader);
  const simulateRawStyles = readFlag(params.simulateRawStyles);
  const simulateMissingPageContainer = readFlag(params.simulateMissingPageContainer);
  const simulateDestructiveWithoutGuard = readFlag(params.simulateDestructiveWithoutGuard);
  const simulateDestructiveWithConfirm =
    !simulateDestructiveWithoutGuard && readFlag(params.simulateDestructiveWithConfirm);
  const simulateUndersizedActionTarget = readFlag(params.simulateUndersizedActionTarget);
  const simulateTightActionGap = readFlag(params.simulateTightActionGap);
  const simulateEdgePinnedActionTarget = readFlag(params.simulateEdgePinnedActionTarget);
  const simulateCrowdedDestructiveAction = readFlag(params.simulateCrowdedDestructiveAction);
  const simulateUnobservableTargets = readFlag(params.simulateUnobservableTargets);
  const includeTargetMarkers = !simulateUnobservableTargets;

  const heroStyle = simulateRawStyles ? { color: "#b91c1c" } : undefined;
  const defaultActionClasses = ["runtimeAction", simulateUndersizedActionTarget ? "runtimeCompactTarget" : ""]
    .filter(Boolean)
    .join(" ");

  let actionControl: ReactNode;
  if (simulateDestructiveWithoutGuard || simulateDestructiveWithConfirm) {
    actionControl = (
      <button
        type="button"
        className="runtimeAction runtimeActionButton"
        {...targetContractProps(includeTargetMarkers, "actions.delete-workspace", 20, 24)}
        data-contract-action-risk="destructive"
        {...(simulateDestructiveWithConfirm
          ? { "data-contract-guard-confirm": "true" }
          : {})}
      >
        Delete workspace
      </button>
    );
  } else if (simulateCrowdedDestructiveAction) {
    actionControl = (
      <div className="runtimeActionRow runtimeActionRow--destructiveCrowded">
        <a
          href="#contact"
          className="runtimeAction"
          {...targetContractProps(includeTargetMarkers, "actions.review-guardrails-primary", 12, 24)}
        >
          Keep workspace
        </a>
        <button
          type="button"
          className="runtimeAction runtimeActionButton runtimeActionButton--destructive"
          {...targetContractProps(includeTargetMarkers, "actions.delete-workspace-crowded", 12, 24)}
          data-contract-action-risk="destructive"
        >
          Delete
        </button>
      </div>
    );
  } else if (simulateTightActionGap) {
    actionControl = (
      <div className="runtimeActionRow runtimeActionRow--tightGap">
        <a
          href="#contact"
          className="runtimeAction"
          {...targetContractProps(includeTargetMarkers, "actions.tight-gap-primary", 4, 24)}
        >
          Review
        </a>
        <a
          href="#contracts"
          className="runtimeAction"
          {...targetContractProps(includeTargetMarkers, "actions.tight-gap-secondary", 4, 24)}
        >
          Docs
        </a>
      </div>
    );
  } else if (simulateEdgePinnedActionTarget) {
    actionControl = (
      <a
        href="#contact"
        className="runtimeAction runtimeEdgePinnedTarget"
        {...targetContractProps(includeTargetMarkers, "actions.edge-pinned-review", 12, 0)}
      >
        Review
      </a>
    );
  } else {
    actionControl = (
      <a
        href="#contact"
        {...targetContractProps(includeTargetMarkers, "actions.review-guardrails", 12, 24)}
        className={defaultActionClasses}
      >
        Review guardrails
      </a>
    );
  }

  return (
    <div className="page">
      {!simulateMissingHeader && (
        <header className="header" data-contract="global-header">
          <div className="headerInner">
            <div className="brand">Reference Customer</div>
            <nav aria-label="Primary navigation" role="navigation" data-contract="primary-nav">
              <ul className="navList">
                <li>
                  <a
                    href="#hero"
                    {...targetContractProps(includeTargetMarkers, "nav.home", 12, 24)}
                    style={{
                      minWidth: 44,
                      minHeight: 44,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "0.25rem 0.55rem",
                    }}
                  >
                    Home
                  </a>
                </li>
                <li>
                  <a
                    href="#capabilities"
                    {...targetContractProps(includeTargetMarkers, "nav.capabilities", 12, 24)}
                    style={{
                      minWidth: 44,
                      minHeight: 44,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "0.25rem 0.55rem",
                    }}
                  >
                    Capabilities
                  </a>
                  <ul>
                    <li>
                      <a
                        href="#contracts"
                        {...targetContractProps(includeTargetMarkers, "nav.contracts", 12, 24)}
                        style={{
                          minWidth: 44,
                          minHeight: 44,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: "0.25rem 0.55rem",
                        }}
                      >
                        Contracts
                      </a>
                    </li>
                  </ul>
                </li>
                <li>
                  <a
                    href="#contact"
                    {...targetContractProps(includeTargetMarkers, "nav.contact", 12, 24)}
                    style={{
                      minWidth: 44,
                      minHeight: 44,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "0.25rem 0.55rem",
                    }}
                  >
                    Contact
                  </a>
                </li>
              </ul>
            </nav>
          </div>
        </header>
      )}

      {simulateDuplicateNav ? (
        <nav
          aria-label="Duplicate primary navigation simulation"
          role="navigation"
          className="secondaryNav"
          data-contract-simulation="duplicate-navigation"
        >
          <ul>
            <li>
              <a
                href="#hero"
                {...targetContractProps(includeTargetMarkers, "duplicate-nav.home", 12, 24)}
                style={{
                  minWidth: 44,
                  minHeight: 44,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0.25rem 0.55rem",
                }}
              >
                Alt Home
              </a>
            </li>
            <li>
              <a
                href="#capabilities"
                {...targetContractProps(includeTargetMarkers, "duplicate-nav.capabilities", 12, 24)}
                style={{
                  minWidth: 44,
                  minHeight: 44,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0.25rem 0.55rem",
                }}
              >
                Alt Capabilities
              </a>
            </li>
          </ul>
        </nav>
      ) : null}

      <main
        className="main"
        data-contract={simulateMissingPageContainer ? undefined : "page-container"}
        data-contract-container={simulateMissingPageContainer ? undefined : "page-container"}
      >
        <section className="section" data-contract-section="landing.hero" id="hero" style={heroStyle}>
          <h1 className="heroTitle">Contract-aware customer surface</h1>
          <p className="heroText">
            This fixture is intentionally deterministic so governance inspector checks can be
            replayed and demonstrated reliably.
          </p>
        </section>

        <section className="section" data-contract-section="landing.capabilities" id="capabilities">
          <div className="grid">
            <article className="card" data-contract-section="landing.contracts" id="contracts">
              <h3>Contract checks</h3>
              <p>Markers are present for page container, header, navigation, and required sections.</p>
            </article>
            <article className="card" data-contract-section="landing.tokens">
              <h3>Token baseline</h3>
              <p>Base styles are tokenized through CSS variables; no raw inline colors by default.</p>
            </article>
            <article className="card" data-contract-section="landing.observability" id="contact">
              <h3>Deterministic simulation</h3>
              <p>Use query flags to simulate drift and verify violation mapping end-to-end.</p>
            </article>
            <article className="card" data-contract-section="landing.actions">
              <h3>Action safeguards</h3>
              <p>
                {simulateDestructiveWithoutGuard || simulateDestructiveWithConfirm
                  ? "This action emits deterministic guard markers for governance checks."
                  : simulateCrowdedDestructiveAction
                    ? "This simulation keeps the destructive action larger than 44px but closer than the destructive spacing budget."
                    : simulateTightActionGap
                      ? "This simulation keeps both actions touch-sized while forcing an intentionally tight gap."
                      : simulateEdgePinnedActionTarget
                        ? "This simulation pins a compliant action to the viewport edge to trigger edge-inset drift."
                        : simulateUnobservableTargets
                          ? "This simulation keeps visible controls on screen while removing contract target markers so runtime validation reports the controls as unobservable."
                  : "Review the deterministic guardrail marker before simulating a destructive action."}
              </p>
              {actionControl}
            </article>
          </div>
        </section>
      </main>

      <footer className="footer">Reference target fixture · surfaceops governance inspector</footer>
    </div>
  );
}
