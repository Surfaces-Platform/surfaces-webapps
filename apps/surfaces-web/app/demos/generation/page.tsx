export const runtime = "edge";

export default function GenerationDemoPage() {
  return (
    <main className="contract-container" style={{ padding: "2rem" }}>
      <h1>Generation-time enforcement</h1>
      <p style={{ marginTop: "12px", maxWidth: "640px", lineHeight: 1.6 }}>
        Contracts are enforced before UI ships. Run the validator locally or in CI to block drift:
      </p>
      <pre style={{ marginTop: "16px", padding: "12px", border: "1px solid #e5e7eb", borderRadius: 6, background: "#f8fafc" }}>
{`pnpm validate:local

# CI example (GitHub Actions)
node tools/interfacectl/packages/interfacectl-cli/dist/index.js validate \\
  --workspace-root . \\
  --contract ./contracts/surfaces.web.contract.json \\
  --format json`}
      </pre>
      <p style={{ marginTop: "16px", maxWidth: "640px", lineHeight: 1.6 }}>
        Violations include file, line, and rule so generators and humans fix issues before merge.
      </p>
    </main>
  );
}
