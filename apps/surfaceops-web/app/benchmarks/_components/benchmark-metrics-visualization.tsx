import { colors } from "@surfaces/ui/tokens/colors";
import type { BenchmarkAssessmentDimension, BenchmarkReportVisualizationData } from "@/lib/benchmark-report-docs";

const ASSESSMENT_DIMENSIONS: BenchmarkAssessmentDimension[] = [
  "structure",
  "components",
  "boundary",
  "visual",
  "responsiveness",
];

const HEURISTICS = [
  { key: "unresolvedAcceptedSuggestionRate", label: "Unresolved accepted suggestion rate" },
  { key: "noChangesAfterEditFailureCount", label: "No-change edit failures" },
  { key: "recoverableToolErrorCount", label: "Recoverable tool errors" },
  { key: "touchedFilesPerResolvedFinding", label: "Touched files per resolved finding" },
  { key: "repeatedFindingCarryoverCount", label: "Repeated finding carryover" },
  { key: "rerunsToAcceptableOutcome", label: "Reruns to acceptable outcome" },
] as const;

function formatDimensionLabel(dimension: BenchmarkAssessmentDimension): string {
  return dimension.charAt(0).toUpperCase() + dimension.slice(1);
}

function formatSignedNumber(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "n/a";
  }
  const rounded = Math.round(value * 1000) / 1000;
  const formatted = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(3).replace(/\.?0+$/, "");
  return rounded > 0 ? `+${formatted}` : formatted;
}

function SummaryCard({
  eyebrow,
  value,
  detail,
  accent,
}: {
  eyebrow: string;
  value: string;
  detail: string;
  accent: string;
}) {
  return (
    <div
      style={{
        padding: "18px 18px 16px",
        borderRadius: "18px",
        border: `1px solid ${colors.neutral[200]}`,
        backgroundColor: colors.neutral[0],
        boxShadow: "0 12px 24px rgba(15, 23, 42, 0.05)",
      }}
    >
      <div style={{ fontSize: "11px", fontWeight: 700, color: accent, letterSpacing: "0.06em", textTransform: "uppercase" }}>
        {eyebrow}
      </div>
      <div style={{ marginTop: "10px", fontSize: "30px", fontWeight: 700, color: colors.neutral[900] }}>{value}</div>
      <div style={{ marginTop: "6px", fontSize: "13px", lineHeight: 1.6, color: colors.neutral[600] }}>{detail}</div>
    </div>
  );
}

function CenteredDeltaBar({
  value,
  scale,
}: {
  value: number | null;
  scale: number;
}) {
  const width = value === null || scale <= 0 ? 0 : `${Math.min(Math.abs(value) / scale, 1) * 100}%`;
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "1px",
        alignItems: "stretch",
        width: "100%",
      }}
    >
      <div
        style={{
          position: "relative",
          height: "10px",
          borderRadius: "999px 0 0 999px",
          overflow: "hidden",
          backgroundColor: colors.neutral[100],
        }}
      >
        {typeof value === "number" && value < 0 ? (
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              bottom: 0,
              width,
              background: "linear-gradient(90deg, #34d399 0%, #059669 100%)",
            }}
          />
        ) : null}
      </div>
      <div
        style={{
          position: "relative",
          height: "10px",
          borderRadius: "0 999px 999px 0",
          overflow: "hidden",
          backgroundColor: colors.neutral[100],
        }}
      >
        {typeof value === "number" && value > 0 ? (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              bottom: 0,
              width,
              background: "linear-gradient(90deg, #fb923c 0%, #ea580c 100%)",
            }}
          />
        ) : null}
      </div>
    </div>
  );
}

function SignalChip({
  label,
  active,
}: {
  label: string;
  active: boolean;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 8px",
        borderRadius: "999px",
        backgroundColor: active ? "#dcfce7" : colors.neutral[100],
        color: active ? "#166534" : colors.neutral[400],
        fontSize: "11px",
        fontWeight: 700,
      }}
    >
      {label}
    </span>
  );
}

export function BenchmarkMetricsVisualization({
  visualization,
}: {
  visualization: BenchmarkReportVisualizationData;
}) {
  const maxHeuristicMagnitude = Math.max(
    ...HEURISTICS.map(({ key }) => Math.abs(visualization.heuristics.averageDelta[key] ?? 0)),
    1,
  );

  return (
    <section
      data-testid="benchmark-report-visualization"
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
          Comparison snapshot
        </div>
        <div style={{ fontSize: "24px", fontWeight: 700, color: colors.neutral[900] }}>Run-level strategy comparison</div>
        <div style={{ fontSize: "14px", lineHeight: 1.7, color: colors.neutral[600] }}>
          Live benchmark runs summarize how candidate strategies performed against their baseline peers inside the selected run.
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          eyebrow="Pairs"
          value={String(visualization.summary.comparisonCount)}
          detail="Strategy matchups included in this benchmark run."
          accent={colors.structure.primary}
        />
        <SummaryCard
          eyebrow="Goal Met"
          value={String(visualization.summary.meetsGoalCount)}
          detail="Candidate pairs that cleared the benchmark success rule."
          accent="#166534"
        />
        <SummaryCard
          eyebrow="Acceptable Earlier"
          value={String(visualization.summary.guidedReachedAcceptableNoLaterCount)}
          detail="Candidate pairs that reached an acceptable outcome no later than baseline."
          accent="#0f766e"
        />
        <SummaryCard
          eyebrow="Fewer Blocking"
          value={String(visualization.summary.guidedFewerFirstAttemptBlockingFindingsCount)}
          detail="Candidate pairs with fewer first-attempt blocking findings."
          accent="#1d4ed8"
        />
        <SummaryCard
          eyebrow="Rubric >= Baseline"
          value={String(visualization.summary.guidedRubricAtLeastAsGoodCount)}
          detail="Candidate pairs that never regressed on the rubric."
          accent="#7c3aed"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <section
          style={{
            padding: "18px",
            borderRadius: "18px",
            border: `1px solid ${colors.neutral[200]}`,
            backgroundColor: "#fcfcfd",
            display: "grid",
            gap: "14px",
          }}
        >
          <div>
            <div style={{ fontSize: "15px", fontWeight: 700, color: colors.neutral[900] }}>Rubric movement</div>
            <div style={{ marginTop: "4px", fontSize: "13px", color: colors.neutral[600], lineHeight: 1.6 }}>
              Improved counts stack to the left, regressions stack to the right, and ties stay centered.
            </div>
          </div>
          {ASSESSMENT_DIMENSIONS.map((dimension) => {
            const counts = visualization.rubric[dimension];
            const total = Math.max(counts.improved + counts.same + counts.regressed, 1);
            return (
              <div key={dimension} style={{ display: "grid", gap: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", fontSize: "13px" }}>
                  <span style={{ fontWeight: 700, color: colors.neutral[900] }}>{formatDimensionLabel(dimension)}</span>
                  <span style={{ color: colors.neutral[600] }}>
                    +{counts.improved} / ={counts.same} / -{counts.regressed}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    overflow: "hidden",
                    borderRadius: "999px",
                    backgroundColor: colors.neutral[100],
                    height: "10px",
                  }}
                >
                  <div style={{ width: `${(counts.improved / total) * 100}%`, backgroundColor: "#10b981" }} />
                  <div style={{ width: `${(counts.same / total) * 100}%`, backgroundColor: "#cbd5e1" }} />
                  <div style={{ width: `${(counts.regressed / total) * 100}%`, backgroundColor: "#f97316" }} />
                </div>
              </div>
            );
          })}
        </section>

        <section
          style={{
            padding: "18px",
            borderRadius: "18px",
            border: `1px solid ${colors.neutral[200]}`,
            backgroundColor: "#fcfcfd",
            display: "grid",
            gap: "14px",
          }}
        >
          <div>
            <div style={{ fontSize: "15px", fontWeight: 700, color: colors.neutral[900] }}>Heuristic deltas</div>
            <div style={{ marginTop: "4px", fontSize: "13px", color: colors.neutral[600], lineHeight: 1.6 }}>
              Negative deltas are improvements because these heuristics are better when they move downward.
            </div>
          </div>
          {HEURISTICS.map(({ key, label }) => (
            <div key={key} style={{ display: "grid", gap: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", fontSize: "13px" }}>
                <span style={{ fontWeight: 700, color: colors.neutral[900] }}>{label}</span>
                <span style={{ color: colors.neutral[600] }}>
                  avg {formatSignedNumber(visualization.heuristics.averageDelta[key])} · improved {visualization.heuristics.improvedCounts[key]}
                </span>
              </div>
              <CenteredDeltaBar
                value={visualization.heuristics.averageDelta[key]}
                scale={maxHeuristicMagnitude}
              />
            </div>
          ))}
        </section>
      </div>

      <section
        style={{
          padding: "18px",
          borderRadius: "18px",
          border: `1px solid ${colors.neutral[200]}`,
          backgroundColor: "#fcfcfd",
          display: "grid",
          gap: "14px",
        }}
      >
        <div>
          <div style={{ fontSize: "15px", fontWeight: 700, color: colors.neutral[900] }}>Strategy pairs</div>
          <div style={{ marginTop: "4px", fontSize: "13px", color: colors.neutral[600], lineHeight: 1.6 }}>
            Compare each baseline/candidate pairing without leaving the selected benchmark run.
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              minWidth: 960,
              borderCollapse: "collapse",
              border: `1px solid ${colors.neutral[200]}`,
              borderRadius: "14px",
              overflow: "hidden",
            }}
          >
            <thead style={{ backgroundColor: colors.neutral[50] }}>
              <tr>
                {["Surface", "Matchup", "Signals", "Better dims", "Deltas"].map((label) => (
                  <th
                    key={label}
                    style={{
                      padding: "12px 14px",
                      textAlign: "left",
                      fontSize: "12px",
                      fontWeight: 700,
                      color: colors.neutral[600],
                      borderBottom: `1px solid ${colors.neutral[200]}`,
                    }}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visualization.comparisons.map((comparison) => (
                <tr key={`${comparison.surfaceId}:${comparison.baselineGuidanceStrategy}:${comparison.guidedGuidanceStrategy}`}>
                  <td
                    style={{
                      padding: "14px",
                      borderTop: `1px solid ${colors.neutral[200]}`,
                      verticalAlign: "top",
                      fontSize: "14px",
                      color: colors.neutral[900],
                    }}
                  >
                    {comparison.surfaceId}
                  </td>
                  <td
                    style={{
                      padding: "14px",
                      borderTop: `1px solid ${colors.neutral[200]}`,
                      verticalAlign: "top",
                      fontSize: "14px",
                      color: colors.neutral[900],
                    }}
                  >
                    <div style={{ fontWeight: 700 }}>{comparison.baselineGuidanceStrategy}</div>
                      <div style={{ fontSize: "12px", color: colors.neutral[400], margin: "4px 0" }}>vs</div>
                    <div style={{ fontWeight: 700 }}>{comparison.guidedGuidanceStrategy}</div>
                  </td>
                  <td
                    style={{
                      padding: "14px",
                      borderTop: `1px solid ${colors.neutral[200]}`,
                      verticalAlign: "top",
                    }}
                  >
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      <SignalChip label="Goal" active={comparison.meetsGoal} />
                      <SignalChip label="No Later" active={comparison.guidedReachedAcceptableNoLater} />
                      <SignalChip label="Fewer Blockers" active={comparison.guidedFewerFirstAttemptBlockingFindings} />
                      <SignalChip label="Rubric ≥" active={comparison.guidedRubricAtLeastAsGood} />
                    </div>
                  </td>
                  <td
                    style={{
                      padding: "14px",
                      borderTop: `1px solid ${colors.neutral[200]}`,
                      verticalAlign: "top",
                      fontSize: "13px",
                      color: colors.neutral[600],
                    }}
                  >
                    {comparison.guidedRubricBetterDimensions.length > 0
                      ? comparison.guidedRubricBetterDimensions.map(formatDimensionLabel).join(", ")
                      : "None"}
                  </td>
                  <td
                    style={{
                      padding: "14px",
                      borderTop: `1px solid ${colors.neutral[200]}`,
                      verticalAlign: "top",
                      fontSize: "13px",
                      color: colors.neutral[600],
                      lineHeight: 1.7,
                    }}
                  >
                    <div>Findings {formatSignedNumber(comparison.firstAttemptFindingCountDelta)}</div>
                    <div>Blocking {formatSignedNumber(comparison.firstAttemptBlockingFindingCountDelta)}</div>
                    <div>Acceptable {formatSignedNumber(comparison.attemptsToAcceptableOutcomeDelta)}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
