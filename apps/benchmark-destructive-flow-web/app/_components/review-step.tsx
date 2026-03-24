export function ReviewStep(input: {
  runtimeReady: boolean;
  includeFlowStepMarker: boolean;
  includeConfirmTransitionMarker: boolean;
  workspace: string;
  windowLabel: string;
}) {
  const reviewItems = [
    `Workspace: ${input.workspace || "Select a target workspace."}`,
    `Window: ${input.windowLabel || "Define the maintenance window."}`,
    "Notify route owners before queueing the destructive change.",
  ];

  return (
    <section
      className="flowPanel"
      data-contract-section="flow.review"
      id="review"
      {...(input.includeFlowStepMarker ? { "data-contract-flow-step": "review" } : {})}
    >
      <h2>Review checklist</h2>
      <p>The flow stays stateful by separating request capture from operator review.</p>
      <ul className="reviewList">
        {reviewItems.map((item) => <li key={item}>{item}</li>)}
      </ul>
      <div className="stepLinkRow">
        {input.runtimeReady && !input.includeConfirmTransitionMarker ? (
          <span className="stepLink stepLinkMuted">Confirm step visible</span>
        ) : (
          <a
            href="#confirm"
            className="stepLink"
            {...(input.includeConfirmTransitionMarker ? { "data-contract-flow-transition-to": "confirm" } : {})}
          >
            Continue to confirm
          </a>
        )}
      </div>
    </section>
  );
}
