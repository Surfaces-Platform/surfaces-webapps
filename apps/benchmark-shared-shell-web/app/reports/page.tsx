import { SharedShell } from "../_components/shared-shell";

const REPORT_ROWS = [
  { label: "Contracts checked", value: "18 surfaces" },
  { label: "Pending drift items", value: "4 flagged" },
  { label: "Mean patch size", value: "3 files" },
];

export default function ReportsPage() {
  return (
    <SharedShell eyebrow="Reports" title="Route-specific section drift">
      <section className="surfaceSection" data-contract-section="reports.audit">
        <div className="surfaceHeader">
          <div>
            <span className="eyebrow">Audit lane</span>
            <h2>Shared shell, independent route content.</h2>
          </div>
          <p>This page intentionally omits one required contract section so the benchmark has to repair the route file.</p>
        </div>
        <div className="metricTable">
          {REPORT_ROWS.map((row) => (
            <div className="metricRow" key={row.label}>
              <span>{row.label}</span>
              <strong>{row.value}</strong>
            </div>
          ))}
        </div>
      </section>
    </SharedShell>
  );
}
