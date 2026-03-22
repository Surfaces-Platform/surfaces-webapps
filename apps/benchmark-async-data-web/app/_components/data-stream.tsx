export function DataStream(input: {
  items: Array<{ id: string; title: string; detail: string }>;
  stateId?: string;
}) {
  if (input.items.length === 0) {
    return (
      <section
        className="streamCard"
        data-contract-section="data.stream"
        {...(input.stateId ? { "data-contract-state-id": input.stateId } : {})}
        id="stream"
      >
        <h3>Async event stream</h3>
        <p>No stream events are currently queued for this benchmark surface.</p>
      </section>
    );
  }

  return (
    <section
      className="streamCard"
      data-contract-section="data.stream"
      {...(input.stateId ? { "data-contract-state-id": input.stateId } : {})}
      id="stream"
    >
      <h3>Async event stream</h3>
      {input.items.map((item) => (
        <div className="statusRow" key={item.id}>
          <div>
            <strong>{item.title}</strong>
            <p>{item.detail}</p>
          </div>
          <span>{item.id}</span>
        </div>
      ))}
    </section>
  );
}
