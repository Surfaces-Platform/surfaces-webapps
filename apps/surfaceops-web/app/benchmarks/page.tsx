import Link from "next/link";
import { redirect } from "next/navigation";
import { colors } from "@surfaces/ui/tokens/colors";
import { listBenchmarkReports } from "@/lib/benchmark-report-docs";

export const metadata = {
  title: "Benchmarks | SurfaceOps",
};

export const dynamic = "force-dynamic";

export default function BenchmarksPage() {
  const reports = listBenchmarkReports();

  if (reports.length > 0) {
    redirect(`/benchmarks/${reports[0].id}`);
  }

  return (
    <div
      className="min-h-screen w-full"
      style={{
        backgroundColor: colors.neutral[50],
        color: colors.neutral[900],
        fontFamily: "Inter, sans-serif",
      }}
    >
      <div className="contract-container" style={{ paddingBlock: "56px" }}>
        <div
          style={{
            fontSize: "12px",
            color: colors.neutral[600],
            marginBottom: "16px",
          }}
        >
          <Link href="/" style={{ color: "inherit", textDecoration: "none" }}>
            Overview
          </Link>
          {" > "}
          <span style={{ color: colors.neutral[800] }}>Benchmarks</span>
        </div>

        <div
          style={{
            maxWidth: 720,
            padding: "28px 32px",
            borderRadius: "18px",
            border: `1px solid ${colors.neutral[200]}`,
            backgroundColor: colors.neutral[0],
            boxShadow: "0 20px 48px rgba(15, 23, 42, 0.06)",
          }}
        >
          <h1 style={{ fontSize: "28px", fontWeight: 600, margin: "0 0 12px" }}>Benchmarks</h1>
          <p style={{ margin: 0, fontSize: "15px", color: colors.neutral[600], lineHeight: 1.7 }}>
            No benchmark runs or archive notes are available yet. New live runs appear automatically
            from `artifacts/generation-benchmarks`, and archived notes can be added under `docs/archive`
            with &quot;benchmark&quot; in the filename.
          </p>
        </div>
      </div>
    </div>
  );
}
