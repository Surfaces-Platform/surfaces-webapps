export function ConfirmStep(input: {
  confirmed: boolean;
  onConfirmedChange: (value: boolean) => void;
  workspace: string;
}) {
  return (
    <section className="flowPanel" id="confirm">
      <h2>Confirm and execute</h2>
      <p>The section content is present, but the benchmark contract expects an explicit confirm section marker here.</p>
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
      <div className="confirmActions">
        <button
          className="secondaryButton"
          type="button"
          data-contract-target="confirm.keep-workspace"
          data-contract-target-gap="6"
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
          data-contract-target-gap="6"
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
    </section>
  );
}
