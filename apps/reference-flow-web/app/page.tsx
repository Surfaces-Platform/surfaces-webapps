type Params = {
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

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const params = await searchParams;
  const simulateMissingReviewStep = readFlag(params.simulateMissingReviewStep);
  const simulateMissingConfirmTransition = readFlag(params.simulateMissingConfirmTransition);
  const simulateTerminalBackEdge = readFlag(params.simulateTerminalBackEdge);
  const simulateUnobservableFlow = readFlag(params.simulateUnobservableFlow);

  return (
    <div className="page">
      <main
        className="pageShell"
        data-contract="page-container"
        data-contract-container="page-container"
      >
        <section className="surfaceSection" data-contract-section="flow.hero">
          <p className="eyebrow">Reference Flow</p>
          <h1 className="heroTitle">Observable task flow contracts for staged workspace actions</h1>
          <p className="heroText">
            This fixture keeps the request, review, and confirm path stable so flow policies can be
            measured through authored markers at generation time and through live browser
            observation at runtime.
          </p>
        </section>
        {simulateUnobservableFlow ? (
          <div className="flowRail">
            <section className="flowStep surfaceSection" data-contract-section="flow.request" id="request">
              <span className="stepIndex">Step 1</span>
              <div>
                <h2 className="stepTitle">Request</h2>
                <p className="stepText">
                  Capture the workspace, owner, and confirmation scope before any destructive
                  action can move forward.
                </p>
              </div>
              <ul className="stepList">
                <li>Identify the workspace and owner.</li>
                <li>Confirm the intent before escalating.</li>
              </ul>
              <div className="stepLinkRow">
                <a href="#review" className="stepLink">
                  Continue to review
                </a>
              </div>
            </section>

            <section className="flowStep surfaceSection" data-contract-section="flow.review" id="review">
              <span className="stepIndex">Step 2</span>
              <div>
                <h2 className="stepTitle">Review</h2>
                <p className="stepText">
                  Require the operator to review consequences, dependencies, and recovery posture
                  before the terminal step.
                </p>
              </div>
              <ul className="stepList">
                <li>Review affected access, routes, and support ownership.</li>
                <li>Confirm the operation window and rollback plan.</li>
              </ul>
              <div className="stepLinkRow">
                <a href="#confirm" className="stepLink">
                  Continue to confirm
                </a>
              </div>
            </section>

            <section className="flowStep surfaceSection" data-contract-section="flow.confirm" id="confirm">
              <span className="stepIndex">Step 3</span>
              <div>
                <h2 className="stepTitle">Confirm</h2>
                <p className="stepText">
                  The final step must remain terminal so the operator cannot loop back from the
                  destructive confirmation boundary.
                </p>
              </div>
              <p className="terminalNote">
                Terminal confirmation is visible and reachable, even when flow markers are
                suppressed.
              </p>
              <div className="stepLinkRow">
                <a href="#confirm" className="stepLink">Confirm workspace action</a>
              </div>
            </section>
          </div>
        ) : (
          <div className="flowRail" data-contract-flow-id="workspace-delete">
            <section
              className="flowStep surfaceSection"
              data-contract-section="flow.request"
              data-contract-flow-step="request"
              id="request"
            >
              <span className="stepIndex">Step 1</span>
              <div>
                <h2 className="stepTitle">Request</h2>
                <p className="stepText">
                  Capture the workspace, owner, and confirmation scope before any destructive
                  action can move forward.
                </p>
              </div>
              <ul className="stepList">
                <li>Identify the workspace and owner.</li>
                <li>Confirm the intent before escalating.</li>
              </ul>
              <div className="stepLinkRow">
                <a
                  href="#review"
                  className="stepLink"
                  data-contract-flow-transition-to="review"
                >
                  Continue to review
                </a>
              </div>
            </section>

            {simulateMissingReviewStep ? (
              <section className="flowStep surfaceSection" data-contract-section="flow.review" id="review">
                <span className="stepIndex">Step 2</span>
                <div>
                  <h2 className="stepTitle">Review</h2>
                  <p className="stepText">
                    Require the operator to review consequences, dependencies, and recovery posture
                    before the terminal step.
                  </p>
                </div>
                <ul className="stepList">
                  <li>Review affected access, routes, and support ownership.</li>
                  <li>Confirm the operation window and rollback plan.</li>
                </ul>
                <div className="stepLinkRow">
                  {simulateMissingConfirmTransition ? (
                    <span className="stepLink stepLinkMuted">Confirm step visible</span>
                  ) : (
                    <a
                      href="#confirm"
                      className="stepLink"
                      data-contract-flow-transition-to="confirm"
                    >
                      Continue to confirm
                    </a>
                  )}
                </div>
              </section>
            ) : (
              <section
                className="flowStep surfaceSection"
                data-contract-section="flow.review"
                data-contract-flow-step="review"
                id="review"
              >
                <span className="stepIndex">Step 2</span>
                <div>
                  <h2 className="stepTitle">Review</h2>
                  <p className="stepText">
                    Require the operator to review consequences, dependencies, and recovery posture
                    before the terminal step.
                  </p>
                </div>
                <ul className="stepList">
                  <li>Review affected access, routes, and support ownership.</li>
                  <li>Confirm the operation window and rollback plan.</li>
                </ul>
                <div className="stepLinkRow">
                  {simulateMissingConfirmTransition ? (
                    <span className="stepLink stepLinkMuted">Confirm step visible</span>
                  ) : (
                    <a
                      href="#confirm"
                      className="stepLink"
                      data-contract-flow-transition-to="confirm"
                    >
                      Continue to confirm
                    </a>
                  )}
                </div>
              </section>
            )}

            <section
              className="flowStep surfaceSection"
              data-contract-section="flow.confirm"
              data-contract-flow-step="confirm"
              data-contract-flow-terminal="true"
              id="confirm"
            >
              <span className="stepIndex">Step 3</span>
              <div>
                <h2 className="stepTitle">Confirm</h2>
                <p className="stepText">
                  The final step must remain terminal so the operator cannot loop back from the
                  destructive confirmation boundary.
                </p>
              </div>
              <p className="terminalNote">
                Terminal confirmation is visible and reachable, and the default route keeps it free
                of outgoing flow edges.
              </p>
              <div className="stepLinkRow">
                <a href="#confirm" className="stepLink">Confirm workspace action</a>
                {simulateTerminalBackEdge ? (
                  <a
                    href="#request"
                    className="stepLink stepLinkMuted"
                    {...{ "data-contract-flow-transition-to": "request" }}
                  >
                    Revise request
                  </a>
                ) : null}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
