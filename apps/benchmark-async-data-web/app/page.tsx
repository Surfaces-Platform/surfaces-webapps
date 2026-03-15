import { DataStream } from "./_components/data-stream";
import { HealthPanel } from "./_components/health-panel";
import { QueueRail } from "./_components/queue-rail";
import { getDashboardSnapshot } from "../lib/mock-data";

export default async function Page() {
  const snapshot = await getDashboardSnapshot();

  return (
    <div className="asyncPage">
      <header className="asyncHeader" data-contract="global-header">
        <div className="asyncHeaderInner">
          <div>
            <span className="eyebrow">Benchmark fixture</span>
            <h1 className="heroTitle">Async dashboard benchmark</h1>
          </div>
          <nav aria-label="Primary navigation" role="navigation" data-contract="primary-nav">
            <ul className="asyncNav">
              <li><a href="#stream">Stream</a></li>
              <li><a href="#queue">Queue</a></li>
              <li><a href="#health">Health</a></li>
            </ul>
          </nav>
        </div>
      </header>

      <main className="asyncMain">
        <section className="heroPanel" data-contract-section="data.hero">
          <h2>{snapshot.title}</h2>
          <p>{snapshot.description}</p>
        </section>

        <div className="asyncGrid">
          <DataStream items={snapshot.stream} />
          <QueueRail items={snapshot.queue} />
          <HealthPanel health={snapshot.health} />
        </div>
      </main>
    </div>
  );
}
