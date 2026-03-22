import { FlowWorkbench } from "./_components/flow-workbench";

export default function Page() {
  return (
    <div className="flowPage">
      <header className="flowHeader" data-contract="global-header">
        <div className="flowHeaderInner">
          <div>
            <span className="eyebrow">Benchmark fixture</span>
            <h1 className="heroTitle">Destructive flow repair benchmark</h1>
          </div>
          <nav aria-label="Primary navigation" role="navigation" data-contract="primary-nav">
            <ul className="flowNav">
              <li>
                <a
                  href="#request"
                  data-contract-target="nav.request"
                  data-contract-target-gap="12"
                  data-contract-target-edge-inset="24"
                  style={{
                    minWidth: 44,
                    minHeight: 44,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0.25rem 0.55rem",
                  }}
                >
                  Request
                </a>
              </li>
              <li>
                <a
                  href="#review"
                  data-contract-target="nav.review"
                  data-contract-target-gap="12"
                  data-contract-target-edge-inset="24"
                  style={{
                    minWidth: 44,
                    minHeight: 44,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0.25rem 0.55rem",
                  }}
                >
                  Review
                </a>
              </li>
              <li>
                <a
                  href="#confirm"
                  data-contract-target="nav.confirm"
                  data-contract-target-gap="12"
                  data-contract-target-edge-inset="24"
                  style={{
                    minWidth: 44,
                    minHeight: 44,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0.25rem 0.55rem",
                  }}
                >
                  Confirm
                </a>
              </li>
            </ul>
          </nav>
          <div className="flowHeaderActions">
            <button
              type="button"
              className="flowUtilityButton"
              aria-label="Open fixture notes"
              data-contract-target="header.notes"
              data-contract-target-gap="4"
              data-contract-target-edge-inset="24"
              style={{
                width: 36,
                height: 36,
              }}
            >
              i
            </button>
            <button
              type="button"
              className="flowUtilityButton"
              aria-label="Queue quick action"
              data-contract-target="header.quick-action"
              data-contract-target-gap="4"
              data-contract-target-edge-inset="24"
              style={{
                width: 36,
                height: 36,
              }}
            >
              Q
            </button>
          </div>
        </div>
      </header>

      <main className="flowMain" data-contract="page-container" data-contract-container="page-container">
        <section className="flowIntro" data-contract-section="flow.intro">
          <p className="heroText">
            This fixture keeps the request and review stages explicit while the benchmark must restore the missing confirm section marker and shared styling policy.
          </p>
        </section>

        <FlowWorkbench />
      </main>

      <button
        type="button"
        className="edgeCta"
        aria-label="Open pinned runbook"
        data-contract-target="edge.runbook"
        data-contract-target-gap="12"
        data-contract-target-edge-inset="4"
        style={{
          width: 40,
          height: 40,
        }}
      >
        RB
      </button>
    </div>
  );
}
