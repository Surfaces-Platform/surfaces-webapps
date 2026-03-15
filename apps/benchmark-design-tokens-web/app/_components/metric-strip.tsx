const METRICS = [
  { label: "Editable tokens", value: "24" },
  { label: "Shared components", value: "9" },
  { label: "Surface variants", value: "5" },
];

export function MetricStrip() {
  return (
    <section className="metricGrid" data-contract-section="design.metrics" id="metrics">
      {METRICS.map((metric) => (
        <article className="metricBar" key={metric.label}>
          <h3>{metric.label}</h3>
          <span className="metricValue">{metric.value}</span>
          <p>Measured across the token-heavy presentation system.</p>
        </article>
      ))}
    </section>
  );
}
