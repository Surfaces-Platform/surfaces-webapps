export default function Loading() {
  return (
    <div className="asyncPage">
      <header className="asyncHeader">
        <div className="asyncHeaderInner">
          <div>
            <span className="eyebrow">Benchmark fixture</span>
            <h1 className="heroTitle">Async dashboard benchmark</h1>
          </div>
        </div>
      </header>

      <main
        className="asyncMain"
        data-contract="page-container"
        data-contract-container="page-container"
        data-contract-state-id="loading"
        data-contract-state-kind="loading"
      >
        <section
          className="heroPanel"
          data-contract-section="data.hero"
          data-contract-state-id="loading"
        >
          <h2>Loading benchmark snapshot...</h2>
          <p>Preparing stream, queue, and health state for the async benchmark fixture.</p>
          <button
            className="heroActionButton"
            type="button"
            data-contract-state-id="loading"
            data-contract-interaction="submit-refresh"
            disabled
          >
            Refreshing dashboard
          </button>
        </section>
      </main>
    </div>
  );
}
