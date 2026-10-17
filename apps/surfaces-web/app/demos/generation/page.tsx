import type { Metadata } from "next";
import { publicPageTitleMetadata } from "@/lib/brand-metadata";

export const runtime = "edge";

export const metadata: Metadata = publicPageTitleMetadata("Generation-Time Enforcement Demo | Surfaces");

export default function GenerationDemoPage() {
  return (
    <main className="contract-container" style={{ padding: "2rem" }}>
      <h1>Generation-time enforcement</h1>
      <p style={{ marginTop: "12px", maxWidth: "640px", lineHeight: 1.6 }}>
        Contracts are enforced before UI ships. Generation uses the contract ban list (for example, shell-owned navigation) plus a pre-emit checker for immediate visibility:
      </p>
      <pre style={{ marginTop: "16px", padding: "12px", border: "1px solid #e5e7eb", borderRadius: 6, background: "#f8fafc" }}>
{`# Block shell-owned primitives (e.g., navigation) before writing output
node scripts/interfacectl-tool.mjs run guard -- \\
  --contract contracts/surfaces.web.contract.json \\
  --descriptor out/generated-descriptor.json

# Descriptor payloads may include icon sources (e.g., lucide-react).
# Icon-source policy is authoritative in CI/CD workspace validation in this increment.

# Then run validator
pnpm validate:local`}
      </pre>
      <p style={{ marginTop: "16px", maxWidth: "640px", lineHeight: 1.6 }}>
        If a surface emits a shell-owned primitive, the checker fails fast. Icon-source findings (`icon.source-disallowed`) are enforced in CI/CD workspace checks (see <code>/demos/ci</code>), not by generation guard in this increment.
      </p>
    </main>
  );
}
