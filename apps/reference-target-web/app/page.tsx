type Params = {
  simulateDuplicateNav?: string;
  simulateMissingHeader?: string;
  simulateRawStyles?: string;
  simulateMissingPageContainer?: string;
  simulateDestructiveWithoutGuard?: string;
  simulateDestructiveWithConfirm?: string;
};

function readFlag(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const params = await searchParams;
  const simulateDuplicateNav = readFlag(params.simulateDuplicateNav);
  const simulateMissingHeader = readFlag(params.simulateMissingHeader);
  const simulateRawStyles = readFlag(params.simulateRawStyles);
  const simulateMissingPageContainer = readFlag(params.simulateMissingPageContainer);
  const simulateDestructiveWithoutGuard = readFlag(params.simulateDestructiveWithoutGuard);
  const simulateDestructiveWithConfirm =
    !simulateDestructiveWithoutGuard && readFlag(params.simulateDestructiveWithConfirm);

  const heroStyle = simulateRawStyles ? { color: "#b91c1c" } : undefined;

  return (
    <div className="page">
      {!simulateMissingHeader && (
        <header className="header" data-contract="global-header">
          <div className="headerInner">
            <div className="brand">Reference Customer</div>
            <nav aria-label="Primary navigation" role="navigation" data-contract="primary-nav">
              <ul className="navList">
                <li>
                  <a href="#hero">Home</a>
                </li>
                <li>
                  <a href="#capabilities">Capabilities</a>
                  <ul>
                    <li>
                      <a href="#contracts">Contracts</a>
                    </li>
                  </ul>
                </li>
                <li>
                  <a href="#contact">Contact</a>
                </li>
              </ul>
            </nav>
          </div>
        </header>
      )}

      {simulateDuplicateNav ? (
        <nav
          aria-label="Duplicate primary navigation simulation"
          role="navigation"
          className="secondaryNav"
          data-contract-simulation="duplicate-navigation"
        >
          <ul>
            <li>
              <a href="#hero">Alt Home</a>
            </li>
            <li>
              <a href="#capabilities">Alt Capabilities</a>
            </li>
          </ul>
        </nav>
      ) : null}

      <main
        className="main"
        data-contract={simulateMissingPageContainer ? undefined : "page-container"}
        data-contract-container={simulateMissingPageContainer ? undefined : "page-container"}
      >
        <section className="section" data-contract-section="landing.hero" id="hero" style={heroStyle}>
          <h1 className="heroTitle">Contract-aware customer surface</h1>
          <p className="heroText">
            This fixture is intentionally deterministic so governance inspector checks can be
            replayed and demonstrated reliably.
          </p>
        </section>

        <section className="section" data-contract-section="landing.capabilities" id="capabilities">
          <div className="grid">
            <article className="card" data-contract-section="landing.contracts" id="contracts">
              <h3>Contract checks</h3>
              <p>Markers are present for page container, header, navigation, and required sections.</p>
            </article>
            <article className="card" data-contract-section="landing.tokens">
              <h3>Token baseline</h3>
              <p>Base styles are tokenized through CSS variables; no raw inline colors by default.</p>
            </article>
            <article className="card" data-contract-section="landing.observability" id="contact">
              <h3>Deterministic simulation</h3>
              <p>Use query flags to simulate drift and verify violation mapping end-to-end.</p>
            </article>
            {(simulateDestructiveWithoutGuard || simulateDestructiveWithConfirm) && (
              <article className="card" data-contract-section="landing.actions">
                <h3>Destructive action simulation</h3>
                <p>
                  This action emits deterministic guard markers for governance checks.
                </p>
                <button
                  type="button"
                  data-contract-action-risk="destructive"
                  {...(simulateDestructiveWithConfirm
                    ? { "data-contract-guard-confirm": "true" }
                    : {})}
                >
                  Delete workspace
                </button>
              </article>
            )}
          </div>
        </section>
      </main>

      <footer className="footer">Reference target fixture · surfaceops governance inspector</footer>
    </div>
  );
}
