import { MetricStrip } from "./_components/metric-strip";
import { TokenAudit } from "./_components/token-audit";
import { TokenMatrix } from "./_components/token-matrix";

export default function Page() {
  return (
    <div className="designPage">
      <header className="designHeader" data-contract="global-header">
        <div className="designHeaderInner">
          <div>
            <span className="eyebrow">Benchmark fixture</span>
            <h1 className="heroTitle">Dense token system benchmark</h1>
          </div>
          <nav aria-label="Primary navigation" role="navigation" data-contract="primary-nav">
            <ul className="designNav">
              <li><a href="#palette">Palette</a></li>
              <li><a href="#metrics">Metrics</a></li>
              <li><a href="#audit">Audit</a></li>
            </ul>
          </nav>
        </div>
      </header>

      <main className="designMain" data-contract="page-container" data-contract-container="page-container">
        <section className="designHero" data-contract-section="design.hero">
          <span className="heroBadge">Token pressure</span>
          <h2>Shared components, stricter styling policy, and benchmarked repairs.</h2>
          <p>
            This fixture keeps the component tree reusable while the cohort must fix font-token, motion, width, and section drift without flattening the layout.
          </p>
        </section>

        <TokenMatrix />
        <MetricStrip />
        <TokenAudit />
      </main>
    </div>
  );
}
