import Link from "next/link";

export function SharedShell(input: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="shell">
      <header className="shellHeader" data-contract="global-header">
        <div className="shellInner">
          <div className="shellBrand">
            <strong>Northwind Ops</strong>
            <span>Shared shell benchmark fixture</span>
          </div>
          <nav aria-label="Primary navigation" role="navigation" data-contract="primary-nav">
            <ul className="shellNav">
              <li>
                <Link className="shellLink" href="/">Overview</Link>
              </li>
              <li>
                <Link className="shellLink" href="/reports">Reports</Link>
              </li>
              <li>
                <Link className="shellLink" href="/settings">Settings</Link>
              </li>
            </ul>
          </nav>
        </div>
      </header>
      <main className="shellMain" data-contract="page-container" data-contract-container="page-container">
        <section className="surfaceSection">
          <div className="surfaceHeader">
            <div>
              <span className="eyebrow">{input.eyebrow}</span>
              <h2>{input.title}</h2>
            </div>
            <p>All routes share one shell and one contract-governed page frame.</p>
          </div>
        </section>
        {input.children}
      </main>
      <footer className="shellFooter">Benchmark shared-shell fixture for SurfaceOps cohorts.</footer>
    </div>
  );
}
