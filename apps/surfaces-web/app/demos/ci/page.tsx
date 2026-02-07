export const runtime = "edge";

export default function CiDemoPage() {
  return (
    <main className="contract-container" style={{ padding: "2rem" }}>
      <h1>CI/CD validation</h1>
      <p style={{ marginTop: "12px", maxWidth: "640px", lineHeight: 1.6 }}>
        Every PR runs contract validation and uploads a JSON artifact that SurfaceOps can ingest. Minimal workflow:
      </p>
      <pre style={{ marginTop: "16px", padding: "12px", border: "1px solid #e5e7eb", borderRadius: 6, background: "#f8fafc" }}>
{`- run: pnpm install --frozen-lockfile
- run: pnpm examples:build-manifest
- run: pnpm examples:test-edge
- run: node tools/interfacectl/packages/interfacectl-cli/dist/index.js validate \\
        --workspace-root . \\
        --contract ./contracts/surfaces.web.contract.json \\
        --format json \\
        --out ./artifacts/interfacectl-report.json`}
      </pre>
      <p style={{ marginTop: "16px", maxWidth: "640px", lineHeight: 1.6 }}>
        CI fails on violations, passes artifacts forward for SurfaceOps visibility, and keeps enforcement deterministic.
      </p>
    </main>
  );
}
