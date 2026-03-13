import { redirect } from "next/navigation";
import Link from "next/link";
import { colors } from "@surfaces/ui/tokens/colors";
import { loadLatestBenchmarkId, resolveBenchmarksDir } from "@/lib/generation-benchmarks";

export default function GovernanceIndexPage() {
  const latestBenchmarkId = loadLatestBenchmarkId();
  if (latestBenchmarkId) {
    redirect(`/contracts/governance/${encodeURIComponent(latestBenchmarkId)}`);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: colors.neutral[50],
        color: colors.neutral[900],
      }}
    >
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "72px 24px" }}>
        <div style={{ fontSize: 12, color: colors.neutral[600], textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Generation Workbench
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 800, margin: "10px 0 12px" }}>No benchmark runs found</h1>
        <p style={{ color: colors.neutral[600], lineHeight: 1.6 }}>
          SurfaceOps is configured to read generation benchmark artifacts from
          {" "}
          <code>{resolveBenchmarksDir()}</code>
          . Add or rerun a benchmark so the workbench can render a guided-vs-unguided proof run.
        </p>
        <Link
          href="/contracts"
          style={{
            display: "inline-flex",
            marginTop: 20,
            padding: "10px 14px",
            borderRadius: 999,
            backgroundColor: colors.structure.primary,
            color: colors.neutral[0],
            textDecoration: "none",
            fontWeight: 700,
          }}
        >
          Back to contracts
        </Link>
      </div>
    </div>
  );
}
