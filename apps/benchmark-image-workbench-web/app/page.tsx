const toolChips = [
  "Move",
  "Crop",
  "Heal",
  "Brush",
  "Mask",
  "Text",
];

const adjustmentRows = [
  { label: "Exposure", value: "+0.20" },
  { label: "Contrast", value: "+12" },
  { label: "Temperature", value: "-3" },
  { label: "Structure", value: "+18" },
];

const assetCards = [
  "Source image",
  "Mask pass",
  "Color look",
  "Export preset",
];

export default function Page() {
  return (
    <main className="workbenchPage" data-contract="page-container" data-contract-container="page-container">
      <section className="shellSection shellSection--header" data-contract-section="workbench.header">
        <div className="heroCopy">
          <p className="eyebrow">Scratch benchmark fixture</p>
          <h1 className="heroTitle">Replace this neutral scaffold with a real image editing workbench.</h1>
          <p className="heroText">
            The benchmark compares a minimal product brief against the same brief plus contract guidance.
            This starting point is intentionally plain and disposable.
          </p>
        </div>
        <div className="statusCluster">
          <article className="statusCard">
            <span className="statusLabel">Prompt</span>
            <strong>Image editing workbench</strong>
            <p>One shot. Minimal direction. Product surface, not a landing page.</p>
          </article>
          <article className="statusCard">
            <span className="statusLabel">Contract</span>
            <strong>Workbench anatomy only</strong>
            <p>Header, tools, canvas, adjustments, assets, and export are fixed. Everything else is open.</p>
          </article>
        </div>
      </section>

      <div className="workbenchGrid">
        <section className="shellSection toolRail" data-contract-section="workbench.tools">
          <div className="sectionHeading">
            <p className="sectionEyebrow">Tools</p>
            <h2 className="sectionTitle">Plain placeholder controls</h2>
          </div>
          <div className="toolChipList">
            {toolChips.map((tool) => (
              <button key={tool} className="toolChip" type="button">
                {tool}
              </button>
            ))}
          </div>
        </section>

        <section className="shellSection canvasStage" data-contract-section="workbench.canvas">
          <div className="sectionHeading">
            <p className="sectionEyebrow">Canvas</p>
            <h2 className="sectionTitle">A neutral editor stage</h2>
          </div>
          <div className="canvasPlaceholder">
            <div className="canvasFrame">
              <div className="canvasSelection" />
            </div>
            <div className="canvasMetrics">
              <span>4000 x 3000</span>
              <span>Layer 03</span>
              <span>100%</span>
            </div>
          </div>
        </section>

        <section className="shellSection inspector" data-contract-section="workbench.adjustments">
          <div className="sectionHeading">
            <p className="sectionEyebrow">Adjustments</p>
            <h2 className="sectionTitle">Temporary controls to replace</h2>
          </div>
          <div className="adjustmentList">
            {adjustmentRows.map((row) => (
              <div key={row.label} className="adjustmentRow">
                <span>{row.label}</span>
                <span>{row.value}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="shellSection assetShelf" data-contract-section="workbench.assets">
        <div className="sectionHeading">
          <p className="sectionEyebrow">Assets</p>
          <h2 className="sectionTitle">Filmstrip and history placeholder</h2>
        </div>
        <div className="assetStrip">
          {assetCards.map((asset) => (
            <article key={asset} className="assetCard">
              <div className="assetThumb" />
              <strong>{asset}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="shellSection exportBar" data-contract-section="workbench.export">
        <div className="sectionHeading">
          <p className="sectionEyebrow">Export</p>
          <h2 className="sectionTitle">Finish state stays intentionally unresolved</h2>
        </div>
        <div className="exportActions">
          <button type="button" className="actionButton">
            Queue render
          </button>
          <button type="button" className="actionButton actionButton--secondary">
            Save preset
          </button>
        </div>
      </section>
    </main>
  );
}
