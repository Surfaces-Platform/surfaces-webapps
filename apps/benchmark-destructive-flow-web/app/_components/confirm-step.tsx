export function ConfirmStep(input: {
  confirmed: boolean;
  includeFlowMarkers: boolean;
  onConfirmedChange: (value: boolean) => void;
  runtimeReady: boolean;
  simulateTerminalBackEdge: boolean;
  workspace: string;
}) {
  const actionGapPx = input.runtimeReady ? 16 : 6;

  return (
    <section
      className="flowPanel"
      id="confirm"
      data-contract-section="flow.confirm"
      {...(input.includeFlowMarkers
        ? {
            "data-contract-flow-step": "confirm",
            "data-contract-flow-terminal": "true",
          }
        : {})}
    >
      <h2>Confirm and execute</h2>
      <p>
        {input.runtimeReady
          ? "The runtime-ready path keeps the confirm stage observable while isolating the staged flow warnings behind deterministic query flags."
          : "The confirm stage stays visible, but the default benchmark route still withholds the staged flow markers and safer target spacing that the repair task must restore."}
      </p>
      <span className="pill">Requires explicit confirmation</span>
      <label className="confirmToggle" htmlFor="confirm-destroy">
        <input
          checked={input.confirmed}
          id="confirm-destroy"
          onChange={(event) => input.onConfirmedChange(event.target.checked)}
          type="checkbox"
        />
        I understand that this will delete {input.workspace || "the selected workspace"}.
      </label>
      <div
        className="confirmActions"
        style={{
          gap: input.runtimeReady ? "1rem" : "0.35rem",
        }}
      >
        <button
          className="secondaryButton"
          type="button"
          data-contract-target="confirm.keep-workspace"
          data-contract-target-gap={String(actionGapPx)}
          data-contract-target-edge-inset="24"
          style={{
            minWidth: 44,
            minHeight: 44,
          }}
        >
          Keep workspace
        </button>
        <button
          className="dangerButton"
          disabled={!input.confirmed}
          type="button"
          data-contract-target="confirm.delete-workspace"
          data-contract-target-gap={String(actionGapPx)}
          data-contract-target-edge-inset="24"
          data-contract-nearest-kind="default"
          data-contract-action-risk="destructive"
          style={{
            minWidth: 44,
            minHeight: 44,
          }}
        >
          Delete workspace
        </button>
      </div>
      <div className="stepLinkRow">
        <a href="#confirm" className="stepLink">
          Confirm workspace action
        </a>
        {input.simulateTerminalBackEdge ? (
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
  );
}
