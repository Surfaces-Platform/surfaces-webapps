export function HealthPanel(input: {
  health: Array<{ id: string; label: string; value: string }>;
  stateId?: string;
}) {
  if (input.health.length === 0) {
    return (
      <section
        className="healthPanel"
        data-contract-section="data.health"
        {...(input.stateId ? { "data-contract-state-id": input.stateId } : {})}
        id="health"
      >
        <h3>Health counters</h3>
        <p>No health counters are currently available.</p>
      </section>
    );
  }

  return (
    <section
      className="healthPanel"
      data-contract-section="data.health"
      {...(input.stateId ? { "data-contract-state-id": input.stateId } : {})}
      id="health"
    >
      <h3>Health counters</h3>
      {input.health.map((entry) => (
        <div className="statusRow" key={entry.id}>
          <span>{entry.label}</span>
          <strong>{entry.value}</strong>
        </div>
      ))}
    </section>
  );
}
