import { FlowWorkbench } from "./_components/flow-workbench";

export default function Page() {
  return (
    <div className="flowPage">
      <header className="flowHeader" data-contract="global-header">
        <div className="flowHeaderInner">
          <div>
            <span className="eyebrow">Benchmark fixture</span>
            <h1 className="heroTitle">Destructive flow repair benchmark</h1>
          </div>
          <nav aria-label="Primary navigation" role="navigation" data-contract="primary-nav">
            <ul className="flowNav">
              <li><a href="#request">Request</a></li>
              <li><a href="#review">Review</a></li>
              <li><a href="#confirm">Confirm</a></li>
            </ul>
          </nav>
        </div>
      </header>

      <main className="flowMain" data-contract="page-container" data-contract-container="page-container">
        <section className="flowIntro" data-contract-section="flow.intro">
          <p className="heroText">
            This fixture keeps the request and review stages explicit while the benchmark must restore the missing confirm section marker and shared styling policy.
          </p>
        </section>

        <FlowWorkbench />
      </main>
    </div>
  );
}
