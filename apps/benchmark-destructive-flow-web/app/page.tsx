import { FlowWorkbench } from "./_components/flow-workbench";

type Params = {
  runtimeReady?: string;
  simulateMissingReviewStep?: string;
  simulateMissingConfirmTransition?: string;
  simulateTerminalBackEdge?: string;
  simulateUnobservableFlow?: string;
};

function readFlag(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function targetContractProps(targetId: string, gapPx: number, edgeInsetPx: number) {
  return {
    "data-contract-target": targetId,
    "data-contract-target-gap": String(gapPx),
    "data-contract-target-edge-inset": String(edgeInsetPx),
  };
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const params = await searchParams;
  const runtimeReady = readFlag(params.runtimeReady);
  const simulateUnobservableFlow = runtimeReady && readFlag(params.simulateUnobservableFlow);
  const simulateMissingReviewStep =
    runtimeReady && !simulateUnobservableFlow && readFlag(params.simulateMissingReviewStep);
  const simulateMissingConfirmTransition =
    runtimeReady && !simulateUnobservableFlow && readFlag(params.simulateMissingConfirmTransition);
  const simulateTerminalBackEdge =
    runtimeReady && !simulateUnobservableFlow && readFlag(params.simulateTerminalBackEdge);
  const utilityTargetSize = runtimeReady ? 44 : 36;
  const utilityTargetGap = runtimeReady ? 12 : 4;
  const edgeTargetSize = runtimeReady ? 44 : 40;
  const edgeInsetPx = runtimeReady ? 16 : 4;

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
                  {...targetContractProps("nav.request", 12, 24)}
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
                  {...targetContractProps("nav.review", 12, 24)}
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
                  {...targetContractProps("nav.confirm", 12, 24)}
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
          <div
            className="flowHeaderActions"
            style={{
              gap: runtimeReady ? "0.75rem" : "0.35rem",
            }}
          >
            <button
              type="button"
              className="flowUtilityButton"
              aria-label="Open fixture notes"
              {...targetContractProps("header.notes", utilityTargetGap, 24)}
              style={{
                width: utilityTargetSize,
                height: utilityTargetSize,
              }}
            >
              i
            </button>
            <button
              type="button"
              className="flowUtilityButton"
              aria-label="Queue quick action"
              {...targetContractProps("header.quick-action", utilityTargetGap, 24)}
              style={{
                width: utilityTargetSize,
                height: utilityTargetSize,
              }}
            >
              Q
            </button>
          </div>
        </div>
      </header>

      <main
        className="flowMain max-w-[1040px]"
        data-contract="page-container"
        data-contract-container="page-container"
        style={{
          maxWidth: 1040,
        }}
      >
        <section className="flowIntro" data-contract-section="flow.intro">
          <p className="heroText">
            This fixture keeps the request and review stages explicit while the benchmark must restore the missing confirm section marker and shared styling policy.
          </p>
        </section>

        <FlowWorkbench
          runtimeReady={runtimeReady}
          simulateMissingReviewStep={simulateMissingReviewStep}
          simulateMissingConfirmTransition={simulateMissingConfirmTransition}
          simulateTerminalBackEdge={simulateTerminalBackEdge}
          simulateUnobservableFlow={simulateUnobservableFlow}
        />
      </main>

      <button
        type="button"
        className="edgeCta"
        aria-label="Open pinned runbook"
        {...targetContractProps("edge.runbook", 12, edgeInsetPx)}
        style={{
          width: edgeTargetSize,
          height: edgeTargetSize,
          right: edgeInsetPx,
          bottom: edgeInsetPx,
        }}
      >
        RB
      </button>
    </div>
  );
}
