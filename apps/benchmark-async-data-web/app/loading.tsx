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

      <main className="asyncMain">
        <section className="heroPanel">
          <h2>Loading benchmark snapshot...</h2>
          <p>Preparing stream, queue, and health state for the async benchmark fixture.</p>
        </section>
      </main>
    </div>
  );
}
