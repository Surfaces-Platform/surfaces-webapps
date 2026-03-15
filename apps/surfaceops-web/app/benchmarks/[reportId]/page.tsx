import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { colors } from "@surfaces/ui/tokens/colors";
import { BenchmarkMetricsVisualization } from "@/app/benchmarks/_components/benchmark-metrics-visualization";
import { BenchmarkReportSwitcher } from "@/app/benchmarks/_components/benchmark-report-switcher";
import { listBenchmarkReports, loadBenchmarkReport } from "@/lib/benchmark-report-docs";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: { params: Promise<{ reportId: string }> }) {
  const { reportId } = await params;
  const report = loadBenchmarkReport(reportId);
  return {
    title: report ? `${report.title} | Benchmarks | SurfaceOps` : "Benchmarks | SurfaceOps",
  };
}

function MarkdownBody({ markdown }: { markdown: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h1 style={{ fontSize: "32px", lineHeight: 1.2, fontWeight: 600, margin: "0 0 16px" }}>
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2
            style={{
              fontSize: "22px",
              lineHeight: 1.3,
              fontWeight: 600,
              margin: "40px 0 14px",
              paddingTop: "8px",
              borderTop: `1px solid ${colors.neutral[200]}`,
            }}
          >
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 style={{ fontSize: "17px", lineHeight: 1.4, fontWeight: 600, margin: "28px 0 12px" }}>
            {children}
          </h3>
        ),
        p: ({ children }) => (
          <p style={{ margin: "0 0 16px", fontSize: "15px", lineHeight: 1.8, color: colors.neutral[800] }}>
            {children}
          </p>
        ),
        ul: ({ children }) => (
          <ul style={{ margin: "0 0 18px", paddingLeft: "20px", color: colors.neutral[800] }}>{children}</ul>
        ),
        ol: ({ children }) => (
          <ol style={{ margin: "0 0 18px", paddingLeft: "20px", color: colors.neutral[800] }}>{children}</ol>
        ),
        li: ({ children }) => <li style={{ marginBottom: "8px", lineHeight: 1.7 }}>{children}</li>,
        blockquote: ({ children }) => (
          <blockquote
            style={{
              margin: "0 0 20px",
              padding: "14px 18px",
              borderLeft: `4px solid ${colors.structure.primary}`,
              backgroundColor: colors.neutral[50],
              color: colors.neutral[600],
            }}
          >
            {children}
          </blockquote>
        ),
        a: ({ href, children }) => (
          <a
            href={href}
            style={{
              color: colors.structure.primary,
              textDecoration: "underline",
              textUnderlineOffset: "0.2em",
            }}
          >
            {children}
          </a>
        ),
        code: ({ children }) => (
          <code
            style={{
              padding: "2px 6px",
              borderRadius: "6px",
              backgroundColor: colors.neutral[100],
              fontSize: "0.92em",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            }}
          >
            {children}
          </code>
        ),
        pre: ({ children }) => (
          <pre
            style={{
              margin: "0 0 20px",
              overflowX: "auto",
              padding: "18px 20px",
              borderRadius: "14px",
              backgroundColor: "#0f172a",
              color: "#e2e8f0",
              fontSize: "13px",
              lineHeight: 1.7,
            }}
          >
            {children}
          </pre>
        ),
        table: ({ children }) => (
          <div style={{ margin: "0 0 20px", overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                minWidth: 560,
                borderCollapse: "collapse",
                border: `1px solid ${colors.neutral[200]}`,
                borderRadius: "12px",
                overflow: "hidden",
              }}
            >
              {children}
            </table>
          </div>
        ),
        thead: ({ children }) => <thead style={{ backgroundColor: colors.neutral[50] }}>{children}</thead>,
        th: ({ children }) => (
          <th
            style={{
              padding: "12px 14px",
              textAlign: "left",
              fontSize: "12px",
              fontWeight: 600,
              color: colors.neutral[600],
              borderBottom: `1px solid ${colors.neutral[200]}`,
            }}
          >
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td
            style={{
              padding: "12px 14px",
              fontSize: "14px",
              color: colors.neutral[800],
              borderTop: `1px solid ${colors.neutral[200]}`,
              verticalAlign: "top",
            }}
          >
            {children}
          </td>
        ),
        hr: () => <hr style={{ margin: "32px 0", borderColor: colors.neutral[200] }} />,
      }}
    >
      {markdown}
    </ReactMarkdown>
  );
}

export default async function BenchmarkReportPage({
  params,
}: { params: Promise<{ reportId: string }> }) {
  const { reportId } = await params;
  const reports = listBenchmarkReports();
  const report = loadBenchmarkReport(reportId);

  if (!report) {
    notFound();
  }

  const currentIndex = reports.findIndex((entry) => entry.id === report.id);
  const previousReportId = currentIndex > 0 ? reports[currentIndex - 1]?.id ?? null : null;
  const nextReportId = currentIndex >= 0 && currentIndex < reports.length - 1
    ? reports[currentIndex + 1]?.id ?? null
    : null;

  return (
    <div
      className="min-h-screen w-full"
      style={{
        backgroundColor: colors.neutral[50],
        color: colors.neutral[900],
        fontFamily: "Inter, sans-serif",
      }}
    >
      <div className="contract-container" style={{ paddingBlock: "40px 56px" }}>
        <div
          style={{
            fontSize: "12px",
            color: colors.neutral[600],
            marginBottom: "18px",
          }}
        >
          <Link href="/" style={{ color: "inherit", textDecoration: "none" }}>
            Overview
          </Link>
          {" > "}
          <span style={{ color: colors.neutral[800] }}>Benchmarks</span>
        </div>

        <section>
          <div
            style={{
              marginBottom: "16px",
              padding: "18px 22px",
              borderRadius: "18px",
              backgroundColor: colors.neutral[0],
              border: `1px solid ${colors.neutral[200]}`,
              boxShadow: "0 20px 48px rgba(15, 23, 42, 0.06)",
            }}
          >
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
              }}
            >
              <div>
                <div style={{ fontSize: "12px", color: colors.neutral[400], marginBottom: "6px" }}>
                  SurfaceOps benchmark archive
                </div>
                <div style={{ fontSize: "24px", fontWeight: 600, lineHeight: 1.25 }}>{report.title}</div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
                <span
                  style={{
                    padding: "8px 12px",
                    borderRadius: "999px",
                    backgroundColor: report.source === "artifact" ? "#dcfce7" : colors.neutral[100],
                    color: colors.neutral[900],
                    fontSize: "12px",
                    fontWeight: 600,
                  }}
                >
                  {report.sourceLabel}
                </span>
                <span
                  style={{
                    padding: "8px 12px",
                    borderRadius: "999px",
                    backgroundColor: colors.neutral[100],
                    color: colors.neutral[600],
                    fontSize: "12px",
                    fontWeight: 600,
                  }}
                >
                  {report.dateLabel ?? report.fileName}
                </span>
              </div>
            </div>

            <BenchmarkReportSwitcher
              reports={reports}
              currentReportId={report.id}
              previousReportId={previousReportId}
              nextReportId={nextReportId}
            />
          </div>

          {report.visualization ? <BenchmarkMetricsVisualization visualization={report.visualization} /> : null}

          <article
            style={{
              padding: "32px clamp(20px, 4vw, 40px)",
              borderRadius: "22px",
              backgroundColor: colors.neutral[0],
              border: `1px solid ${colors.neutral[200]}`,
              boxShadow: "0 24px 56px rgba(15, 23, 42, 0.08)",
            }}
          >
            <MarkdownBody markdown={report.markdown} />
          </article>
        </section>
      </div>
    </div>
  );
}
