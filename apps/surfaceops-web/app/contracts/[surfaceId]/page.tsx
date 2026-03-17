import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  loadPolicyContract,
  loadExtraction,
  computeValidationStatus,
  computeFindings,
  groupFindingsByCategory,
  getCategoryLabel,
  getDriftLabel,
  getDriftLabelText,
  getActionGuidance,
  getInterventionPoint,
  getInterventionLabel,
  getOperationalResponsibility,
  validationOutcomesFileExists,
  loadValidationOutcomes,
  getLastContractChange,
  getLastExtractionRun,
  getBuildMetadata,
} from "@/lib/contracts";
import type { FailureCategory, Phase0Finding } from "@/lib/contracts";
import { colors } from "@surfaces/ui/tokens/colors";
import {
  SURFACEOPS_DESKTOP_WORKBENCH_PATH,
  shouldRedirectToSurfaceOpsDesktopWorkbench,
} from "@/lib/product-surface";

function FindingGroup({
  category,
  findings,
}: {
  category: FailureCategory;
  findings: Phase0Finding[];
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
        {findings.map((f, i) => (
          <li
            key={i}
            style={{
              padding: "8px 0",
              borderTop:
                i === 0 ? "none" : `1px solid ${colors.neutral[100]}`,
            }}
          >
            <div style={{ marginBottom: "4px" }}>{f.message}</div>
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
        ))}
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

export default async function ContractDetailPage({
  params,
}: { params: Promise<{ surfaceId: string }> }) {
  const { surfaceId } = await params;
  if (shouldRedirectToSurfaceOpsDesktopWorkbench(`/contracts/${surfaceId}`)) {
    redirect(SURFACEOPS_DESKTOP_WORKBENCH_PATH);
  }

  const contract = loadPolicyContract();
  const surface = contract.surfaces.find((s) => s.id === surfaceId);
  if (!surface) notFound();

  const extracted = loadExtraction(surfaceId);
  const status = computeValidationStatus(surface, extracted);
  const findings = computeFindings(surface, extracted);
  const groupedFindings = groupFindingsByCategory(findings);
  const outcomes = loadValidationOutcomes(contract);
  const surfaceOutcomes = outcomes[surfaceId] ?? [status];
  const outcomesFileExists = validationOutcomesFileExists();
  const hasSufficientHistory =
    outcomesFileExists && (surfaceOutcomes?.length ?? 0) >= 2;
  const driftLabel =
    status === "fail" ? getDriftLabel(surfaceOutcomes, hasSufficientHistory) : null;
  const lastContractChange = getLastContractChange();
  const lastExtractionRun = getLastExtractionRun(surfaceId);
  const buildMetadata = getBuildMetadata();

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
            fontSize: "14px",
            color: colors.neutral[600],
            marginBottom: "24px",
          }}
        >
          <Link href="/contracts" style={{ color: "inherit", textDecoration: "none" }}>
            ← Surfaces
          </Link>
          {" · "}
          <Link
            href={`/contracts/runs/${surfaceId}`}
            style={{ color: "inherit", textDecoration: "none" }}
          >
            View runs
          </Link>
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
            Change log
          </h2>
          <div style={{ fontSize: "14px", color: colors.neutral[600] }}>
            <div style={{ marginBottom: "8px" }}>
              Last contract change:{" "}
              {lastContractChange
                ? `${lastContractChange.hash} (${lastContractChange.relativeTime})`
                : "unknown"}
            </div>
            <div style={{ marginBottom: "8px" }}>
              Last extraction run:{" "}
              {lastExtractionRun
                ? `${lastExtractionRun.hash} (${lastExtractionRun.relativeTime})`
                : "unknown"}
            </div>
            <div style={{ marginBottom: "4px" }}>
              SurfaceOps build: {buildMetadata.surfaceopsBuildSha}
            </div>
            <div>
              interfacectl: {buildMetadata.interfacectlSha}
            </div>
          </div>
        </section>

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
            Validation status
          </h2>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: extracted ? 0 : undefined,
            }}
          >
            <OutcomeDots outcomes={surfaceOutcomes} />
          </div>
          {extracted ? (
            <p
              style={{
                fontSize: "14px",
                color:
                  status === "pass"
                    ? colors.contract.valid
                    : status === "fail"
                      ? colors.contract.invalid
                      : colors.neutral[600],
                fontFamily: "monospace",
                marginTop: "8px",
              }}
            >
              Current: {status}
            </p>
          ) : (
            <>
              <p style={{ fontSize: "14px", color: colors.neutral[600], marginBottom: "8px" }}>
                No extraction data yet.
              </p>
              <p style={{ fontSize: "14px", color: colors.neutral[600] }}>
                Run generate-contract for this surface to populate extraction data.
              </p>
            </>
          )}
        </section>

        {status === "fail" && (
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
              Why this failed
            </h2>
            {driftLabel && (
              <p
                style={{
                  fontSize: "12px",
                  color: colors.neutral[600],
                  marginBottom: "12px",
                  fontFamily: "monospace",
                }}
              >
                {getDriftLabelText(driftLabel)}
              </p>
            )}
            {findings.length > 0 ? (
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
                      />
                    );
                  })}
                </div>
                <NextStepsSection findings={findings} />
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
            Phase 0 expectations
          </h2>
          <p
            style={{
              fontSize: "14px",
              color: colors.neutral[600],
              marginBottom: "12px",
              lineHeight: 1.5,
            }}
          >
            These define what the extractor checks: auth posture, shell presence,
            auth routes, and design system usage. Not design rules or future intent.
            Checked against extracted signals.
          </p>
          <pre
            style={{
              fontSize: "12px",
              fontFamily: "monospace",
              color: colors.neutral[800],
              whiteSpace: "pre-wrap",
              margin: 0,
            }}
          >
            {JSON.stringify(surface.phase0 ?? {}, null, 2)}
          </pre>
        </section>

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
            Extracted signals
          </h2>
          <p
            style={{
              fontSize: "14px",
              color: colors.neutral[600],
              marginBottom: "12px",
              lineHeight: 1.5,
            }}
          >
            Signals come from generate-contract. Empty means extraction has not run
            or the app was unavailable at build time.
          </p>
          {extracted ? (
            <pre
              style={{
                fontSize: "12px",
                fontFamily: "monospace",
                color: colors.neutral[800],
                whiteSpace: "pre-wrap",
                margin: 0,
              }}
            >
              {JSON.stringify(extracted.extracted, null, 2)}
            </pre>
          ) : (
            <p style={{ fontSize: "14px", color: colors.neutral[600] }}>
              No extraction data yet. Run generate-contract for this surface.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
