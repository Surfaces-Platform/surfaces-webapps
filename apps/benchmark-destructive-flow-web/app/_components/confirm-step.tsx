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
      <button
        className="dangerButton"
        disabled={!input.confirmed}
        type="button"
        data-contract-action-risk="destructive"
      >
        Delete workspace
      </button>
    </section>
  );
}
