import { SharedShell } from "./_components/shared-shell";

export default function Page() {
  return (
    <SharedShell eyebrow="Benchmark fixture" title="Shared shell home">
      <section className="surfaceSection" data-contract-section="dashboard.hero">
        <div>
          <span className="eyebrow">Multi-route baseline</span>
          <h1 className="heroTitle">Shared layout, route-local drift, and benchmarked repairs.</h1>
        </div>
        <p className="heroText">
          This fixture keeps the shell stable while the benchmark must repair route-specific structure and shared CSS drift.
        </p>
      </section>

      <section className="surfaceSection" data-contract-section="dashboard.overview">
        <div className="cardGrid">
          <article className="surfaceCard">
            <span className="statusPill">Shell integrity</span>
            <h3>Navigation and container live in one shared component.</h3>
            <p>Edits that restore route sections should not collapse the shell or duplicate its primitives.</p>
          </article>
          <article className="surfaceCard">
            <span className="statusPill">Cross-file pressure</span>
            <h3>Reports and settings diverge from the same baseline.</h3>
            <p>The cohort has to resolve structure drift in a route file while also fixing typography and motion in shared CSS.</p>
          </article>
        </div>
      </section>
    </SharedShell>
  );
}
