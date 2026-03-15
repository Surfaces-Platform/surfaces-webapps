export function QueueRail(input: {
  items: Array<{ id: string; label: string; detail: string }>;
}) {
  if (input.items.length === 0) {
    return (
      <section className="queueRail" data-contract-section="data.queue" id="queue">
        <h3>Review queue</h3>
        <p>No queued review items remain for this cycle.</p>
      </section>
    );
  }

  return (
    <section className="queueRail" data-contract-section="data.queue" id="queue">
      <h3>Review queue</h3>
      {input.items.map((item) => (
        <article key={item.id}>
          <strong>{item.label}</strong>
          <p>{item.detail}</p>
        </article>
      ))}
    </section>
  );
}
