import Link from "next/link";
import { colors } from "@surfaces/ui/tokens/colors";
import type { GenerationWorkbenchData } from "@/lib/generation-benchmarks";

function panelStyle() {
  return {
    backgroundColor: colors.neutral[0],
    border: `1px solid ${colors.neutral[200]}`,
    borderRadius: 16,
    padding: 20,
    boxShadow: "0 18px 36px rgba(15, 23, 42, 0.08)",
  } as const;
}

function statusTone(value: boolean) {
  return value ? colors.contract.valid : colors.contract.invalid;
}

function previewFrame(title: string, preview: { dataUrl: string | null; ref: { finalUrl: string; capturedAt: string } | null }) {
  return (
    <div style={panelStyle()}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 12, color: colors.neutral[600], textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Preview
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>{title}</h3>
        </div>
        {preview.ref ? (
          <div style={{ textAlign: "right", fontSize: 12, color: colors.neutral[600] }}>
            <div>{new Date(preview.ref.capturedAt).toLocaleString()}</div>
            <div>{preview.ref.finalUrl}</div>
          </div>
        ) : null}
      </div>
      {preview.dataUrl ? (
        <img
          alt={`${title} preview`}
          src={preview.dataUrl}
          style={{
            width: "100%",
            height: "auto",
            borderRadius: 12,
            border: `1px solid ${colors.neutral[200]}`,
            backgroundColor: colors.neutral[50],
          }}
        />
      ) : (
        <div
          style={{
            minHeight: 280,
            borderRadius: 12,
            border: `1px dashed ${colors.neutral[200]}`,
            background:
              "linear-gradient(145deg, rgba(241,245,249,0.9), rgba(226,232,240,0.65))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: colors.neutral[600],
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          Preview unavailable
        </div>
      )}
    </div>
  );
}

function attemptTimeline(title: string, attempts: GenerationWorkbenchData["timelines"]["baseline"]) {
  return (
    <div style={panelStyle()}>
      <div style={{ fontSize: 12, color: colors.neutral[600], textTransform: "uppercase", letterSpacing: "0.08em" }}>
        Attempt Timeline
      </div>
      <h3 style={{ fontSize: 18, fontWeight: 700, marginTop: 4, marginBottom: 16 }}>{title}</h3>
      <div style={{ display: "grid", gap: 12 }}>
        {attempts.map((attempt) => (
          <article
            key={`${title}-${attempt.attemptNumber}`}
            style={{
              padding: 14,
              borderRadius: 12,
              border: `1px solid ${colors.neutral[200]}`,
              backgroundColor: colors.neutral[50],
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
              <strong>Attempt {attempt.attemptNumber}</strong>
              <span style={{ color: attempt.outcome.includes("pass") ? colors.contract.valid : colors.neutral[800] }}>
                {attempt.outcome}
              </span>
            </div>
            <p style={{ margin: "0 0 8px 0", color: colors.neutral[800], fontSize: 14 }}>{attempt.notes}</p>
            <div style={{ fontSize: 12, color: colors.neutral[600] }}>
              Findings: {attempt.findingCodes.join(", ") || "none"}
            </div>
            <div style={{ fontSize: 12, color: colors.neutral[600] }}>
              Touched files: {attempt.touchedFiles.join(", ") || "not recorded"}
            </div>
            {attempt.reviewStatus ? (
              <div style={{ fontSize: 12, color: colors.neutral[600] }}>
                Review: {attempt.reviewStatus}
                {attempt.reviewRationale ? ` — ${attempt.reviewRationale}` : ""}
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}

export function BenchmarkWorkbench({ data }: { data: GenerationWorkbenchData }) {
  const selectedSurface = data.surfaces.find((item) => item.surfaceId === data.selectedSurfaceId) ?? data.surfaces[0];
  const currentComparison = data.comparison;
  const preparedSummary = data.guidedPrepared?.summary;

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(180deg, rgba(248,250,252,1) 0%, rgba(241,245,249,0.92) 45%, rgba(226,232,240,0.72) 100%)",
        color: colors.neutral[900],
      }}
    >
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "40px 24px 56px" }}>
        <header style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, color: colors.neutral[600], textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Generation Workbench
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 24,
              alignItems: "flex-end",
              flexWrap: "wrap",
            }}
          >
            <div>
              <h1 style={{ fontSize: 34, lineHeight: 1.1, fontWeight: 800, margin: "8px 0 6px" }}>
                {data.benchmarkId}
              </h1>
              <p style={{ maxWidth: 780, color: colors.neutral[600], margin: 0 }}>
                Artifact-backed benchmark review for guided vs unguided generation. SurfaceOps is rendering the
                canonical benchmark outputs directly from disk.
              </p>
            </div>
            <div style={{ display: "grid", gap: 6, fontSize: 13, color: colors.neutral[600] }}>
              <div>Generated: {new Date(data.report.generatedAt).toLocaleString()}</div>
              <div>Benchmarks dir: {data.benchmarksDir}</div>
              <div>Surfaces meeting goal: {data.report.overall.surfacesMeetingGoal}/{data.report.overall.surfaceCount}</div>
            </div>
          </div>
        </header>

        <section style={{ ...panelStyle(), marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 12, color: colors.neutral[600], textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Surface
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>{selectedSurface.surfaceId}</h2>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {data.surfaces.map((surface) => {
                const href = `/contracts/governance/${encodeURIComponent(data.benchmarkId)}?surface=${encodeURIComponent(surface.surfaceId)}&attempt=${data.attemptView}`;
                const active = surface.surfaceId === data.selectedSurfaceId;
                return (
                  <Link
                    key={surface.surfaceId}
                    href={href}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 999,
                      textDecoration: "none",
                      border: `1px solid ${active ? colors.structure.primary : colors.neutral[200]}`,
                      backgroundColor: active ? colors.structure.primary : colors.neutral[0],
                      color: active ? colors.neutral[0] : colors.neutral[800],
                      fontSize: 14,
                      fontWeight: 600,
                    }}
                  >
                    {surface.surfaceId}
                  </Link>
                );
              })}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
            {([
              ["Guided fewer first-attempt blockers", currentComparison.checks.guidedFewerFirstAttemptBlockingFindings],
              ["Guided reached acceptable no later", currentComparison.checks.guidedReachedAcceptableNoLater],
              ["Guided rubric at least as good", currentComparison.checks.guidedRubricAtLeastAsGood],
              ["Surface goal met", currentComparison.checks.meetsGoal],
            ] as const).map(([label, passed]) => (
              <span
                key={label}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 12px",
                  borderRadius: 999,
                  backgroundColor: colors.neutral[50],
                  border: `1px solid ${colors.neutral[200]}`,
                  color: colors.neutral[800],
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    backgroundColor: statusTone(Boolean(passed)),
                  }}
                />
                {label}
              </span>
            ))}
          </div>
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24, marginBottom: 24 }}>
          <div style={panelStyle()}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 12, color: colors.neutral[600], textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Comparison
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>Baseline vs guided</h3>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {(["first", "latest"] as const).map((attemptView) => {
                  const href = `/contracts/governance/${encodeURIComponent(data.benchmarkId)}?surface=${encodeURIComponent(data.selectedSurfaceId)}&attempt=${attemptView}`;
                  const active = data.attemptView === attemptView;
                  return (
                    <Link
                      key={attemptView}
                      href={href}
                      style={{
                        padding: "8px 12px",
                        borderRadius: 999,
                        textDecoration: "none",
                        border: `1px solid ${active ? colors.neutral[900] : colors.neutral[200]}`,
                        backgroundColor: active ? colors.neutral[900] : colors.neutral[0],
                        color: active ? colors.neutral[0] : colors.neutral[800],
                        fontSize: 13,
                        fontWeight: 700,
                      }}
                    >
                      {attemptView === "first" ? "First attempt" : "Latest attempt"}
                    </Link>
                  );
                })}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {([
                ["Baseline", data.selectedAttemptSnapshots.baseline],
                ["Guided", data.selectedAttemptSnapshots.guided],
              ] as const).map(([label, attempt]) => (
                <div
                  key={label}
                  style={{
                    borderRadius: 14,
                    border: `1px solid ${colors.neutral[200]}`,
                    backgroundColor: colors.neutral[50],
                    padding: 16,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
                    <strong>{label}</strong>
                    <span>{attempt.outcome}</span>
                  </div>
                  <div style={{ fontSize: 14, color: colors.neutral[800], marginBottom: 8 }}>
                    Attempt {attempt.attemptNumber} · {attempt.findingCount} findings
                  </div>
                  <div style={{ fontSize: 12, color: colors.neutral[600] }}>
                    Blockers: {attempt.blockingFindingCount} · Warnings: {attempt.warningFindingCount}
                  </div>
                  <div style={{ fontSize: 12, color: colors.neutral[600], marginTop: 8 }}>
                    Rubric: structure {attempt.assessment.structure}, components {attempt.assessment.components}, boundary{" "}
                    {attempt.assessment.boundary}, visual {attempt.assessment.visual}, responsiveness{" "}
                    {attempt.assessment.responsiveness}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12, marginTop: 18 }}>
              <div style={{ borderRadius: 12, backgroundColor: colors.neutral[50], padding: 14 }}>
                <div style={{ fontSize: 12, color: colors.neutral[600] }}>First-attempt delta</div>
                <strong>{currentComparison.delta.firstAttemptBlockingFindingCountDelta}</strong>
              </div>
              <div style={{ borderRadius: 12, backgroundColor: colors.neutral[50], padding: 14 }}>
                <div style={{ fontSize: 12, color: colors.neutral[600] }}>Attempts-to-acceptable</div>
                <strong>{currentComparison.delta.attemptsToAcceptableOutcome.delta ?? "n/a"}</strong>
              </div>
              <div style={{ borderRadius: 12, backgroundColor: colors.neutral[50], padding: 14 }}>
                <div style={{ fontSize: 12, color: colors.neutral[600] }}>Improved dimensions</div>
                <strong>{currentComparison.checks.guidedRubricBetterDimensions.join(", ") || "none"}</strong>
              </div>
              <div style={{ borderRadius: 12, backgroundColor: colors.neutral[50], padding: 14 }}>
                <div style={{ fontSize: 12, color: colors.neutral[600] }}>Latest finding delta</div>
                <strong>{currentComparison.delta.latestFindingCountDelta}</strong>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gap: 24 }}>
            <div style={panelStyle()}>
              <div style={{ fontSize: 12, color: colors.neutral[600], textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Guided summary
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginTop: 4, marginBottom: 12 }}>Prepared guidance</h3>
              <p style={{ margin: "0 0 12px 0", color: colors.neutral[800], fontSize: 14 }}>
                {preparedSummary?.text ?? "Prepared guidance summary unavailable."}
              </p>
              <div style={{ fontSize: 13, color: colors.neutral[600], marginBottom: 10 }}>
                Focus order: {preparedSummary?.focusOrder?.join(" → ") || "not recorded"}
              </div>
              <div style={{ fontSize: 13, color: colors.neutral[600], marginBottom: 10 }}>
                Required sections: {preparedSummary?.requiredSectionIds?.join(", ") || "not recorded"}
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                {(preparedSummary?.checklist ?? []).map((item) => (
                  <div key={item.id} style={{ borderRadius: 10, backgroundColor: colors.neutral[50], padding: 12 }}>
                    <strong style={{ display: "block", marginBottom: 4 }}>{item.label}</strong>
                    <span style={{ fontSize: 13, color: colors.neutral[600] }}>{item.detail}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={panelStyle()}>
              <div style={{ fontSize: 12, color: colors.neutral[600], textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Suggestions
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginTop: 4, marginBottom: 12 }}>Reviewed contract deltas</h3>
              <div style={{ display: "grid", gap: 10 }}>
                {(data.suggestions?.suggestions ?? []).map((suggestion) => (
                  <article key={suggestion.suggestionId} style={{ borderRadius: 12, backgroundColor: colors.neutral[50], padding: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
                      <strong>{suggestion.findingCode}</strong>
                      <span>{suggestion.status}</span>
                    </div>
                    <div style={{ fontSize: 13, color: colors.neutral[600], marginBottom: 6 }}>
                      {suggestion.proposedChange.summary}
                    </div>
                    <div style={{ fontSize: 12, color: colors.neutral[600] }}>
                      Path: {suggestion.proposedChange.path} · Confidence {suggestion.confidence}
                    </div>
                    {suggestion.decision ? (
                      <div style={{ fontSize: 12, color: colors.neutral[600], marginTop: 6 }}>
                        {suggestion.decision.rationale}
                      </div>
                    ) : null}
                  </article>
                ))}
                {data.suggestions?.suggestions?.length ? null : (
                  <div style={{ fontSize: 14, color: colors.neutral[600] }}>No reviewed suggestions recorded.</div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
          {previewFrame("Baseline", data.previews.baseline)}
          {previewFrame("Guided", data.previews.guided)}
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
          {attemptTimeline("Baseline", data.timelines.baseline)}
          {attemptTimeline("Guided", data.timelines.guided)}
        </section>

        <section style={panelStyle()}>
          <div style={{ fontSize: 12, color: colors.neutral[600], textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Brief
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginTop: 4, marginBottom: 12 }}>Frozen implementation brief</h3>
          <pre
            style={{
              margin: 0,
              padding: 16,
              borderRadius: 12,
              border: `1px solid ${colors.neutral[200]}`,
              backgroundColor: colors.neutral[50],
              whiteSpace: "pre-wrap",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              fontSize: 13,
              color: colors.neutral[800],
            }}
          >
            {data.briefText ?? "Brief unavailable."}
          </pre>
        </section>
      </div>
    </div>
  );
}
