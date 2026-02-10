import Link from "next/link";
import { notFound } from "next/navigation";
import {
  loadPolicyContract,
  getSurfaceRunSeries,
  groupFindingsByCategory,
  getCategoryLabel,
  getActionGuidance,
  getInterventionPoint,
  getInterventionLabel,
  getOperationalResponsibility,
  validationOutcomesFileExists,
  getContractExpectationKey,
  getContractExpectationValue,
  getRelaxedAlternativeText,
  getExpectationMeaning,
  compareRuns,
  getPassRate,
  hasEverPassed,
  countSurfacesUsingExpectation,
  getSurfaceEvolution,
} from "@/lib/contracts";
import type {
  FailureCategory,
  Phase0Finding,
  PolicyContract,
  PolicySurface,
} from "@/lib/contracts";
import { colors } from "@surfaces/ui/tokens/colors";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ surfaceId: string }>;
}) {
  const { surfaceId } = await params;
  const contract = loadPolicyContract();
  const surface = contract.surfaces.find((s) => s.id === surfaceId);
  return {
    title: surface ? `Runs: ${surface.displayName} | SurfaceOps` : "Runs | SurfaceOps",
  };
}

function FindingGroup({
  category,
  findings,
  surface,
  contract,
}: {
  category: FailureCategory;
  findings: Phase0Finding[];
  surface: PolicySurface;
  contract: PolicyContract;
}) {
  return (
    <div style={{ marginBottom: "16px" }}>
      <div
        style={{
          fontSize: "12px",
          fontWeight: 600,
          color: colors.neutral[600],
          marginBottom: "8px",
        }}
      >
        {getCategoryLabel(category)}
      </div>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {findings.map((f, i) => {
          const expectationKey = getContractExpectationKey(f.code);
          const expectationValue =
            expectationKey !== null
              ? getContractExpectationValue(surface, expectationKey)
              : undefined;
          const relaxedText =
            expectationKey !== null && expectationValue !== undefined
              ? getRelaxedAlternativeText(f.code, expectationKey, expectationValue)
              : null;
          const meaning =
            expectationKey !== null ? getExpectationMeaning(expectationKey) : null;
          const isEnabled =
            expectationKey !== null &&
            (expectationKey === "authPosture"
              ? (expectationValue === "auth-aware" || expectationValue === "auth-first")
              : expectationValue === true);
          const surfacesUsing =
            expectationKey !== null && isEnabled
              ? countSurfacesUsingExpectation(contract, expectationKey)
              : 0;

          return (
            <li
              key={i}
              style={{
                padding: "8px 0",
                borderTop:
                  i === 0 ? "none" : `1px solid ${colors.neutral[100]}`,
              }}
            >
              <div style={{ marginBottom: "4px" }}>{f.message}</div>
              {expectationKey !== null && (
                <div
                  style={{
                    fontSize: "11px",
                    color: colors.neutral[600],
                    fontFamily: "monospace",
                    marginBottom: "2px",
                  }}
                >
                  Contract expectation: phase0.{expectationKey} ={" "}
                  {formatValue(expectationValue ?? "undefined")}
                  {surfacesUsing > 0 && (
                    <span style={{ marginLeft: "8px", fontWeight: 400 }}>
                      (Used by {surfacesUsing} surface{surfacesUsing !== 1 ? "s" : ""})
                    </span>
                  )}
                </div>
              )}
              {relaxedText && (
                <div
                  style={{
                    fontSize: "11px",
                    color: colors.neutral[600],
                    marginBottom: "2px",
                  }}
                >
                  Relaxed alternative: {relaxedText}
                </div>
              )}
              {meaning && (
                <div
                  style={{
                    fontSize: "11px",
                    color: colors.neutral[600],
                    fontStyle: "italic",
                    marginBottom: "4px",
                  }}
                >
                  Meaning: {meaning}
                </div>
              )}
              {(f.expected !== undefined || f.found !== undefined) && (
                <div
                  style={{
                    fontSize: "12px",
                    color: colors.neutral[600],
                    fontFamily: "monospace",
                  }}
                >
                  {f.expected !== undefined && (
                    <span>Expected: {formatValue(f.expected)}</span>
                  )}
                  {f.expected !== undefined && f.found !== undefined && " · "}
                  {f.found !== undefined && (
                    <span>Found: {formatValue(f.found)}</span>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function formatValue(v: unknown): string {
  if (Array.isArray(v)) return v.length ? v.join(", ") : "[]";
  if (typeof v === "boolean") return String(v);
  return JSON.stringify(v);
}

function NextStepsSection({ findings }: { findings: Phase0Finding[] }) {
  const uniqueCodes = [...new Set(findings.map((f) => f.code))];
  const interventionPoints = [
    ...new Set(uniqueCodes.map((c) => getInterventionPoint(c))),
  ];
  const interventionLabel =
    interventionPoints.length === 1
      ? getInterventionLabel(interventionPoints[0])
      : interventionPoints.map(getInterventionLabel).join("; ");

  return (
    <div
      style={{
        marginTop: "16px",
        paddingTop: "16px",
        borderTop: `1px solid ${colors.neutral[200]}`,
        fontSize: "14px",
        color: colors.neutral[800],
      }}
    >
      <div
        style={{
          fontSize: "12px",
          fontWeight: 600,
          color: colors.neutral[600],
          marginBottom: "8px",
        }}
      >
        Next steps
      </div>
      <ul style={{ margin: 0, paddingLeft: "20px" }}>
        <li style={{ marginBottom: "4px" }}>
          Where to fix: {interventionLabel}
        </li>
        {uniqueCodes.map((code) => (
          <li key={code} style={{ marginBottom: "4px" }}>
            {getActionGuidance(code)}
          </li>
        ))}
      </ul>
    </div>
  );
}

function OutcomeDots({
  outcomes,
}: {
  outcomes: ("pass" | "warn" | "fail" | "unknown")[];
}) {
  return (
    <span style={{ display: "flex", gap: 4, alignItems: "center" }}>
      {outcomes.map((o, i) => (
        <span
          key={i}
          title={o}
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            backgroundColor:
              o === "pass"
                ? colors.contract.valid
                : o === "warn"
                  ? "#b45309"
                : o === "fail"
                  ? colors.contract.invalid
                  : colors.neutral[400],
          }}
        />
      ))}
    </span>
  );
}

export default async function SurfaceRunsDetailPage({
  params,
}: { params: Promise<{ surfaceId: string }> }) {
  const { surfaceId } = await params;
  const contract = loadPolicyContract();
  const surface = contract.surfaces.find((s) => s.id === surfaceId);
  if (!surface) notFound();

  const runSeries = getSurfaceRunSeries(surfaceId);
  if (!runSeries) notFound();

  const latestSnapshot = runSeries.snapshots[0];
  const evolution = getSurfaceEvolution(surfaceId);
  const groupedFindings = groupFindingsByCategory(latestSnapshot.findings);
  const outcomesFileExists = validationOutcomesFileExists();

  return (
    <div
      style={{
        backgroundColor: colors.neutral[50],
        fontFamily: "Inter, sans-serif",
        color: colors.neutral[900],
        flex: 1,
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px" }}>
        <div
          style={{
            fontSize: "12px",
            color: colors.neutral[600],
            marginBottom: "24px",
          }}
        >
          <Link href="/contracts" style={{ color: "inherit", textDecoration: "none" }}>
            Contracts
          </Link>
          {" > "}
          <Link href="/contracts/runs" style={{ color: "inherit", textDecoration: "none" }}>
            Runs
          </Link>
          {" > "}
          <span style={{ color: colors.neutral[800] }}>{surface.displayName}</span>
        </div>

        <h1
          style={{
            fontSize: "24px",
            fontWeight: 600,
            marginBottom: "8px",
          }}
        >
          {surface.displayName}
        </h1>
        <p
          style={{
            fontSize: "14px",
            color: colors.neutral[600],
            marginBottom: "4px",
          }}
        >
          {surface.domain ?? surface.id}
        </p>
        <p
          style={{
            fontSize: "14px",
            color: surface.owner?.trim()
              ? colors.neutral[600]
              : colors.neutral[400],
            marginBottom: "24px",
          }}
        >
          Operational responsibility: {getOperationalResponsibility(surface.owner)}
        </p>

        {outcomesFileExists && runSeries.history && (
          <section
            style={{
              marginBottom: "24px",
              padding: "16px",
              backgroundColor: colors.neutral[0],
              border: `1px solid ${colors.neutral[200]}`,
              borderRadius: "6px",
            }}
          >
            <h2
              style={{
                fontSize: "14px",
                fontWeight: 600,
                marginBottom: "12px",
                fontFamily: "monospace",
              }}
            >
              Recent outcomes
            </h2>
            <div style={{ marginBottom: "8px" }}>
              <OutcomeDots outcomes={runSeries.history.outcomes} />
            </div>
            <p
              style={{
                fontSize: "12px",
                color: colors.neutral[600],
                margin: 0,
              }}
            >
              Derived from contract-runs.json when available, otherwise validation-outcomes.json.
            </p>
          </section>
        )}

        {evolution.runs.length > 0 && (
          <section
            style={{
              marginBottom: "24px",
              padding: "16px",
              backgroundColor: colors.neutral[0],
              border: `1px solid ${colors.neutral[200]}`,
              borderRadius: "6px",
            }}
          >
            <h2
              style={{
                fontSize: "14px",
                fontWeight: 600,
                marginBottom: "12px",
                fontFamily: "monospace",
              }}
            >
              Evolution timeline
            </h2>
            <div style={{ fontSize: "12px", color: colors.neutral[800], fontFamily: "monospace" }}>
              {evolution.runs.slice(0, 8).map((run) => (
                <div key={run.runId} style={{ marginBottom: "6px" }}>
                  {run.createdAt} · {run.source} · {run.status} · {run.contract.version}
                  {run.findingCodes.length > 0 ? ` · ${run.findingCodes.join(", ")}` : ""}
                </div>
              ))}
            </div>
            {evolution.findingDelta && (
              <div
                style={{
                  marginTop: "12px",
                  paddingTop: "12px",
                  borderTop: `1px solid ${colors.neutral[200]}`,
                  fontSize: "12px",
                  color: colors.neutral[600],
                  fontFamily: "monospace",
                }}
              >
                <div>
                  New codes:{" "}
                  {evolution.findingDelta.newCodes.length > 0
                    ? evolution.findingDelta.newCodes.join(", ")
                    : "none"}
                </div>
                <div>
                  Resolved codes:{" "}
                  {evolution.findingDelta.resolvedCodes.length > 0
                    ? evolution.findingDelta.resolvedCodes.join(", ")
                    : "none"}
                </div>
              </div>
            )}
          </section>
        )}

        <section
          style={{
            marginBottom: "24px",
            padding: "16px",
            backgroundColor: colors.neutral[0],
            border: `1px solid ${colors.neutral[200]}`,
            borderRadius: "6px",
          }}
        >
          <h2
            style={{
              fontSize: "14px",
              fontWeight: 600,
              marginBottom: "12px",
              fontFamily: "monospace",
            }}
          >
            Latest run
          </h2>

          <div
            style={{
              fontSize: "14px",
              color: colors.neutral[600],
              marginBottom: "16px",
            }}
          >
            <div style={{ marginBottom: "8px" }}>
              Status:{" "}
              <span
                style={{
                  fontFamily: "monospace",
                  color:
                    latestSnapshot.status === "pass"
                      ? colors.contract.valid
                      : latestSnapshot.status === "warn"
                        ? "#b45309"
                      : latestSnapshot.status === "fail"
                        ? colors.contract.invalid
                        : colors.neutral[600],
                }}
              >
                {latestSnapshot.status}
              </span>
            </div>
            <div style={{ marginBottom: "8px" }}>
              Source: <span style={{ fontFamily: "monospace" }}>{latestSnapshot.latestSource}</span>
            </div>
            <div style={{ marginBottom: "8px" }}>
              Run time: <span style={{ fontFamily: "monospace" }}>{latestSnapshot.latestRunAt}</span>
            </div>
            <div style={{ marginBottom: "8px" }}>
              Contract version: <span style={{ fontFamily: "monospace" }}>{latestSnapshot.contractVersion}</span>
            </div>
            <div style={{ marginBottom: "8px" }}>
              Contract commit:{" "}
              {latestSnapshot.contractCommit
                ? `${latestSnapshot.contractCommit.hash} (${latestSnapshot.contractCommit.relativeTime})`
                : "unknown"}
            </div>
            <div style={{ marginBottom: "8px" }}>
              Extraction commit:{" "}
              {latestSnapshot.extractionCommit
                ? `${latestSnapshot.extractionCommit.hash} (${latestSnapshot.extractionCommit.relativeTime})`
                : "unknown"}
            </div>
            <div style={{ marginBottom: "4px" }}>
              SurfaceOps build: {latestSnapshot.buildMetadata.surfaceopsBuildSha}
            </div>
            <div style={{ marginBottom: "16px" }}>
              interfacectl: {latestSnapshot.buildMetadata.interfacectlSha}
            </div>
            {latestSnapshot.changeSinceLastExtraction === null && (
              <div
                style={{
                  marginTop: "16px",
                  paddingTop: "16px",
                  borderTop: `1px solid ${colors.neutral[200]}`,
                  fontSize: "12px",
                  color: colors.neutral[600],
                }}
              >
                Previous extraction not available.
              </div>
            )}
            {latestSnapshot.changeSinceLastExtraction !== null && (
              <div
                style={{
                  marginTop: "16px",
                  paddingTop: "16px",
                  borderTop: `1px solid ${colors.neutral[200]}`,
                }}
              >
                <h3
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: colors.neutral[600],
                    marginBottom: "8px",
                    fontFamily: "monospace",
                  }}
                >
                  Change since last extraction
                </h3>
                {latestSnapshot.changeSinceLastExtraction.previousExtractionAvailable ? (
                  <div
                    style={{
                      fontSize: "12px",
                      color: colors.neutral[800],
                      fontFamily: "monospace",
                    }}
                  >
                    {latestSnapshot.changeSinceLastExtraction.routesAdded > 0 && (
                      <div>
                        Routes added: {latestSnapshot.changeSinceLastExtraction.routesAdded}
                      </div>
                    )}
                    {latestSnapshot.changeSinceLastExtraction.routesRemoved > 0 && (
                      <div>
                        Routes removed: {latestSnapshot.changeSinceLastExtraction.routesRemoved}
                      </div>
                    )}
                    {latestSnapshot.changeSinceLastExtraction.designSystemComponentsAdded > 0 && (
                      <div>
                        Design system components added:{" "}
                        {latestSnapshot.changeSinceLastExtraction.designSystemComponentsAdded}
                      </div>
                    )}
                    {latestSnapshot.changeSinceLastExtraction.designSystemComponentsRemoved > 0 && (
                      <div>
                        Design system components removed:{" "}
                        {latestSnapshot.changeSinceLastExtraction.designSystemComponentsRemoved}
                      </div>
                    )}
                    {latestSnapshot.changeSinceLastExtraction.hasShellChanged !== null && (
                      <div>
                        hasShell changed:{" "}
                        {latestSnapshot.changeSinceLastExtraction.hasShellChanged ? "true" : "false"}
                      </div>
                    )}
                    {latestSnapshot.changeSinceLastExtraction.authAwareChanged !== null && (
                      <div>
                        authAware changed:{" "}
                        {latestSnapshot.changeSinceLastExtraction.authAwareChanged ? "true" : "false"}
                      </div>
                    )}
                      {latestSnapshot.changeSinceLastExtraction.routesAdded === 0 &&
                      latestSnapshot.changeSinceLastExtraction.routesRemoved === 0 &&
                      latestSnapshot.changeSinceLastExtraction.designSystemComponentsAdded === 0 &&
                      latestSnapshot.changeSinceLastExtraction.designSystemComponentsRemoved === 0 &&
                      latestSnapshot.changeSinceLastExtraction.hasShellChanged === null &&
                      latestSnapshot.changeSinceLastExtraction.authAwareChanged === null && (
                        <div style={{ color: colors.neutral[600] }}>No changes detected</div>
                      )}
                  </div>
                ) : null}
              </div>
            )}
            <p
              style={{
                marginTop: "16px",
                fontSize: "11px",
                color: colors.neutral[600],
                fontStyle: "italic",
              }}
            >
              Derived from contract, latest extraction, and local git history when available.
            </p>
          </div>

          {latestSnapshot.status === "fail" && (
            <>
              <div
                style={{
                  marginTop: "16px",
                  paddingTop: "16px",
                  borderTop: `1px solid ${colors.neutral[200]}`,
                }}
              >
                {(() => {
                  const runComparison = compareRuns(
                    latestSnapshot.findings,
                    latestSnapshot.previousRunFindings
                  );
                  return runComparison ? (
                    <p
                      style={{
                        fontSize: "13px",
                        color: colors.neutral[800],
                        marginBottom: "12px",
                      }}
                    >
                      {runComparison.narrative}
                    </p>
                  ) : null;
                })()}
                {outcomesFileExists &&
                  (() => {
                    const passRate = getPassRate(surfaceId);
                    const everPassed = hasEverPassed(surfaceId);
                    const surfaceOutcomes = runSeries.history?.outcomes ?? [];
                    if (surfaceOutcomes.length === 0) return null;
                    if (passRate === null && everPassed === null) return null;
                    return (
                      <div
                        style={{
                          fontSize: "12px",
                          color: colors.neutral[600],
                          marginBottom: "12px",
                        }}
                      >
                        <strong style={{ fontFamily: "monospace" }}>Stability</strong>
                        {passRate !== null && (
                          <div style={{ marginTop: "4px" }}>
                            {passRate.passed} of last {passRate.total} runs passed
                          </div>
                        )}
                        {everPassed !== null && (
                          <div style={{ marginTop: "4px" }}>
                            This surface has {everPassed ? "" : "not "}ever passed
                          </div>
                        )}
                      </div>
                    );
                  })()}
                <h3
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: colors.neutral[600],
                    marginBottom: "12px",
                    fontFamily: "monospace",
                  }}
                >
                  Why this failed
                </h3>
                {latestSnapshot.findings.length > 0 ? (
                  <>
                    <div style={{ fontSize: "14px", color: colors.neutral[800] }}>
                      {(Object.keys(groupedFindings) as FailureCategory[]).map((cat) => {
                        const items = groupedFindings[cat];
                        if (items.length === 0) return null;
                        return (
                          <FindingGroup
                            key={cat}
                            category={cat}
                            findings={items}
                            surface={surface}
                            contract={contract}
                          />
                        );
                      })}
                    </div>
                    <NextStepsSection findings={latestSnapshot.findings} />
                  </>
                ) : (
                  <div style={{ fontSize: "14px", color: colors.neutral[600] }}>
                    <p style={{ marginBottom: "4px" }}>
                      No findings available for this failure.
                    </p>
                    <p style={{ fontSize: "12px", color: colors.neutral[400] }}>
                      Details not available for this failure.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
