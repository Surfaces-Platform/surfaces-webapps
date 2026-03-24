export function RequestForm(input: {
  includeFlowMarkers: boolean;
  workspace: string;
  windowLabel: string;
  onWorkspaceChange: (value: string) => void;
  onWindowChange: (value: string) => void;
}) {
  return (
    <section
      className="flowPanel"
      data-contract-section="flow.request"
      id="request"
      {...(input.includeFlowMarkers ? { "data-contract-flow-step": "request" } : {})}
    >
      <h2>Request details</h2>
      <p>Operators stage the destructive action with a typed scope and execution window.</p>
      <div className="fieldGroup">
        <label htmlFor="workspace">Workspace</label>
        <input
          className="flowInput"
          id="workspace"
          name="workspace"
          onChange={(event) => input.onWorkspaceChange(event.target.value)}
          placeholder="northwind-prod"
          value={input.workspace}
        />
      </div>
      <div className="fieldGroup">
        <label htmlFor="window">Execution window</label>
        <input
          className="flowInput"
          id="window"
          name="window"
          onChange={(event) => input.onWindowChange(event.target.value)}
          placeholder="Next maintenance window"
          value={input.windowLabel}
        />
      </div>
      <div className="stepLinkRow">
        <a
          href="#review"
          className="stepLink"
          {...(input.includeFlowMarkers ? { "data-contract-flow-transition-to": "review" } : {})}
        >
          Continue to review
        </a>
      </div>
    </section>
  );
}
