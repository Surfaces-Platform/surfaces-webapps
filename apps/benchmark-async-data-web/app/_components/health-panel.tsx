export function HealthPanel(input: {
  health: Array<{ id: string; label: string; value: string }>;
}) {
  if (input.health.length === 0) {
    return (
      <section className="healthPanel" id="health">
        <h3>Health counters</h3>
        <p>This panel intentionally lacks the required data.health section marker.</p>
        <p>No health counters are currently available.</p>
      </section>
    );
  }

  return (
    <section className="healthPanel" id="health">
      <h3>Health counters</h3>
      <p>This panel intentionally lacks the required data.health section marker.</p>
      {input.health.map((entry) => (
        <div className="statusRow" key={entry.id}>
          <span>{entry.label}</span>
          <strong>{entry.value}</strong>
        </div>
      ))}
    </section>
  );
}
