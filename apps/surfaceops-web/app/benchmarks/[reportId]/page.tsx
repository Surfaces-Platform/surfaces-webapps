import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { colors } from "@surfaces/ui/tokens/colors";
import { BenchmarkMetricsVisualization } from "@/app/benchmarks/_components/benchmark-metrics-visualization";
import { BenchmarkReportSwitcher } from "@/app/benchmarks/_components/benchmark-report-switcher";
import type { BenchmarkReportArtifactText, BenchmarkReportRunEvidence, BenchmarkReportSessionEvidence } from "@/lib/benchmark-report-docs";
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

function ArtifactPanel({ artifact }: { artifact: BenchmarkReportArtifactText }) {
  return (
    <div
      style={{
        padding: "16px",
        borderRadius: "16px",
        border: `1px solid ${colors.neutral[200]}`,
        backgroundColor: "#fcfcfd",
        display: "grid",
        gap: "10px",
      }}
    >
      <div>
        <div style={{ fontSize: "11px", fontWeight: 700, color: colors.structure.primary, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {artifact.label}
        </div>
        <div style={{ marginTop: "6px", fontSize: "13px", color: colors.neutral[600], wordBreak: "break-all" }}>
          {artifact.path}
        </div>
      </div>
      <details>
        <summary style={{ cursor: "pointer", fontSize: "13px", fontWeight: 600, color: colors.neutral[800] }}>
          Show artifact
        </summary>
        <pre
          style={{
            marginTop: "10px",
            overflowX: "auto",
            padding: "14px 16px",
            borderRadius: "12px",
            backgroundColor: "#0f172a",
            color: "#e2e8f0",
            fontSize: "12px",
            lineHeight: 1.6,
          }}
        >
          {artifact.text ?? "Artifact file not available."}
        </pre>
      </details>
    </div>
  );
}

function SessionEvidenceCard({ session }: { session: BenchmarkReportSessionEvidence }) {
  return (
    <div
      style={{
        padding: "16px",
        borderRadius: "18px",
        border: `1px solid ${colors.neutral[200]}`,
        backgroundColor: colors.neutral[0],
        display: "grid",
        gap: "14px",
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
        <span
          style={{
            padding: "6px 10px",
            borderRadius: "999px",
            backgroundColor: colors.neutral[100],
            fontSize: "12px",
            fontWeight: 700,
            color: colors.neutral[900],
          }}
        >
          {session.guidanceStrategy}
        </span>
        <span style={{ fontSize: "12px", color: colors.neutral[600] }}>
          {session.latestStatus ?? "unknown"} / {session.latestOutcome ?? "unknown"}
        </span>
      </div>

      {session.errorMessage ? (
        <div
          style={{
            padding: "12px 14px",
            borderRadius: "12px",
            border: `1px solid ${colors.neutral[200]}`,
            backgroundColor: colors.neutral[50],
            fontSize: "13px",
            lineHeight: 1.6,
            color: colors.neutral[800],
          }}
        >
          {session.errorMessage}
        </div>
      ) : null}

      {session.preview?.dataUrl ? (
        <div style={{ display: "grid", gap: "8px" }}>
          <img
            src={session.preview.dataUrl}
            alt={`${session.guidanceStrategy} preview`}
            style={{
              width: "100%",
              borderRadius: "14px",
              border: `1px solid ${colors.neutral[200]}`,
              objectFit: "cover",
              backgroundColor: colors.neutral[50],
            }}
          />
          <div style={{ fontSize: "12px", color: colors.neutral[600], lineHeight: 1.6 }}>
            <div>{session.preview.imagePath}</div>
            {session.preview.capturedAt ? <div>Captured: {session.preview.capturedAt}</div> : null}
            {session.preview.finalUrl ? <div>Final URL: {session.preview.finalUrl}</div> : null}
          </div>
        </div>
      ) : (
        <div
          style={{
            padding: "16px",
            borderRadius: "14px",
            border: `1px dashed ${colors.neutral[400]}`,
            fontSize: "13px",
            color: colors.neutral[600],
          }}
        >
          Screenshot not captured.
        </div>
      )}

      <details>
        <summary style={{ cursor: "pointer", fontSize: "13px", fontWeight: 600, color: colors.neutral[800] }}>
          Show agent prompt
        </summary>
        <div style={{ marginTop: "8px", fontSize: "12px", color: colors.neutral[600], wordBreak: "break-all" }}>
          {session.agentInputPath}
        </div>
        <pre
          style={{
            marginTop: "10px",
            overflowX: "auto",
            padding: "14px 16px",
            borderRadius: "12px",
            backgroundColor: "#0f172a",
            color: "#e2e8f0",
            fontSize: "12px",
            lineHeight: 1.6,
          }}
        >
          {session.agentInputText ?? "Prompt file not available."}
        </pre>
      </details>

      <details>
        <summary style={{ cursor: "pointer", fontSize: "13px", fontWeight: 600, color: colors.neutral[800] }}>
          Show guidance handoff
        </summary>
        <div style={{ marginTop: "8px", fontSize: "12px", color: colors.neutral[600], wordBreak: "break-all" }}>
          {session.guidanceHandoffPath}
        </div>
        <pre
          style={{
            marginTop: "10px",
            overflowX: "auto",
            padding: "14px 16px",
            borderRadius: "12px",
            backgroundColor: "#0f172a",
            color: "#e2e8f0",
            fontSize: "12px",
            lineHeight: 1.6,
          }}
        >
          {session.guidanceHandoffText ?? "Guidance handoff file not available."}
        </pre>
      </details>
    </div>
  );
}

function RunEvidenceSection({ evidence }: { evidence: BenchmarkReportRunEvidence }) {
  const runMetadata = [
    { label: "Model", value: evidence.model.requestedModelLabel ?? evidence.model.resolvedModelId ?? "unknown" },
    { label: "Resolved ID", value: evidence.model.resolvedModelId ?? "not recorded" },
    { label: "Tool", value: evidence.tool },
    { label: "Mode", value: evidence.evaluationMode },
    { label: "Attempt budget", value: String(evidence.attemptBudget) },
    { label: "Guidance", value: evidence.guidanceStrategies.join(", ") },
    { label: "Base URL", value: evidence.model.baseUrl ?? "not recorded" },
    { label: "Fingerprint", value: evidence.model.fingerprint ?? "not recorded" },
    { label: "Source spec", value: evidence.sourceSpecPath },
    { label: "Source run", value: evidence.sourceRunPath ?? "none" },
  ];

  return (
    <section
      data-testid="benchmark-report-evidence"
      style={{
        marginBottom: "18px",
        padding: "22px",
        borderRadius: "22px",
        border: `1px solid ${colors.neutral[200]}`,
        backgroundColor: colors.neutral[0],
        boxShadow: "0 24px 56px rgba(15, 23, 42, 0.08)",
        display: "grid",
        gap: "18px",
      }}
    >
      <div style={{ display: "grid", gap: "6px" }}>
        <div style={{ fontSize: "12px", fontWeight: 700, color: colors.structure.primary, letterSpacing: "0.06em", textTransform: "uppercase" }}>
          Zero-shot evidence
        </div>
        <div style={{ fontSize: "24px", fontWeight: 700, color: colors.neutral[900] }}>Run prompt, contract, and screenshot evidence</div>
        <div style={{ fontSize: "14px", lineHeight: 1.7, color: colors.neutral[600] }}>
          This section captures the actual model, prompt files, contract artifacts, and screenshots produced by the selected zero-shot benchmark run.
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {runMetadata.map((item) => (
          <div
            key={item.label}
            style={{
              padding: "16px",
              borderRadius: "16px",
              border: `1px solid ${colors.neutral[200]}`,
              backgroundColor: "#fcfcfd",
            }}
          >
            <div style={{ fontSize: "11px", fontWeight: 700, color: colors.neutral[600], textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {item.label}
            </div>
            <div style={{ marginTop: "8px", fontSize: "16px", fontWeight: 600, color: colors.neutral[900], wordBreak: "break-word" }}>
              {item.value}
            </div>
          </div>
        ))}
      </div>

      {evidence.fixtures.map((fixture) => (
        <section
          key={fixture.fixtureId}
          style={{
            padding: "18px",
            borderRadius: "18px",
            border: `1px solid ${colors.neutral[200]}`,
            backgroundColor: "#fcfcfd",
            display: "grid",
            gap: "16px",
          }}
        >
          <div>
            <div style={{ fontSize: "18px", fontWeight: 700, color: colors.neutral[900] }}>{fixture.surfaceId}</div>
            <div style={{ marginTop: "6px", fontSize: "13px", color: colors.neutral[600] }}>
              {fixture.platformTarget} · {fixture.consumerType} · {fixture.capturePreset}
            </div>
          </div>

          <details open>
            <summary style={{ cursor: "pointer", fontSize: "13px", fontWeight: 600, color: colors.neutral[800] }}>
              Benchmark brief
            </summary>
            <div style={{ marginTop: "8px", fontSize: "12px", color: colors.neutral[600], wordBreak: "break-all" }}>
              {fixture.brief.path}
            </div>
            <pre
              style={{
                marginTop: "10px",
                overflowX: "auto",
                padding: "14px 16px",
                borderRadius: "12px",
                backgroundColor: "#0f172a",
                color: "#e2e8f0",
                fontSize: "12px",
                lineHeight: 1.6,
              }}
            >
              {fixture.brief.text ?? "Brief file not available."}
            </pre>
          </details>

          {fixture.contracts.length > 0 ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {fixture.contracts.map((artifact) => <ArtifactPanel key={`${fixture.fixtureId}:${artifact.label}`} artifact={artifact} />)}
            </div>
          ) : null}

          {fixture.inputs.length > 0 ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {fixture.inputs.map((artifact) => <ArtifactPanel key={`${fixture.fixtureId}:${artifact.label}`} artifact={artifact} />)}
            </div>
          ) : null}

          <div className="grid gap-4 xl:grid-cols-3">
            {fixture.sessions.map((session) => <SessionEvidenceCard key={`${fixture.fixtureId}:${session.sessionId}`} session={session} />)}
          </div>
        </section>
      ))}
    </section>
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
          {report.evidence ? <RunEvidenceSection evidence={report.evidence} /> : null}

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
