import Link from "next/link";
import {
  loadPolicyContract,
  getRunSnapshot,
  loadValidationOutcomes,
  validationOutcomesFileExists,
  getOperationalResponsibility,
} from "@/lib/contracts";
import { colors } from "@surfaces/ui/tokens/colors";

export const metadata = {
  title: "Runs | SurfaceOps",
};

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

export default function RunsPage() {
  const contract = loadPolicyContract();
  const outcomes = loadValidationOutcomes(contract);
  const outcomesFileExists = validationOutcomesFileExists();

  return (
    <div
      className="min-h-screen w-full"
      style={{
        backgroundColor: colors.neutral[50],
        fontFamily: "Inter, sans-serif",
        color: colors.neutral[900],
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 24px" }}>
        <div
          style={{
            fontSize: "12px",
            color: colors.neutral[600],
            marginBottom: "16px",
          }}
        >
          <Link href="/contracts" style={{ color: "inherit", textDecoration: "none" }}>
            Contracts
          </Link>
          {" > "}
          <span style={{ color: colors.neutral[800] }}>Runs</span>
        </div>
        <h1
          style={{
            fontSize: "24px",
            fontWeight: 600,
            marginBottom: "8px",
          }}
        >
          Runs
        </h1>
        <p
          style={{
            fontSize: "14px",
            color: colors.neutral[600],
            marginBottom: "32px",
          }}
        >
          Contract validation runs and findings history
        </p>

        <div
          style={{
            backgroundColor: colors.neutral[0],
            border: `1px solid ${colors.neutral[200]}`,
            borderRadius: "6px",
            overflow: "hidden",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
            }}
          >
            <thead>
              <tr
                style={{
                  backgroundColor: colors.neutral[50],
                  borderBottom: `1px solid ${colors.neutral[200]}`,
                }}
              >
                <th
                  style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: colors.neutral[600],
                  }}
                >
                  Surface
                </th>
                <th
                  style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: colors.neutral[600],
                  }}
                >
                  Operational responsibility
                </th>
                <th
                  style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: colors.neutral[600],
                  }}
                >
                  Status
                </th>
                <th
                  style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: colors.neutral[600],
                  }}
                >
                  Last extraction
                </th>
                <th
                  style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: colors.neutral[600],
                  }}
                >
                  Latest source
                </th>
                <th
                  style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: colors.neutral[600],
                  }}
                >
                  Last run time
                </th>
                <th
                  style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: colors.neutral[600],
                  }}
                >
                  Contract version
                </th>
                <th
                  style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: colors.neutral[600],
                  }}
                >
                  Last contract change
                </th>
                <th
                  style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: colors.neutral[600],
                  }}
                >
                  Findings summary
                </th>
                {outcomesFileExists && (
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontSize: "12px",
                      fontWeight: 600,
                      color: colors.neutral[600],
                    }}
                  >
                    Outcomes
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {contract.surfaces.map((surface) => {
                const snapshot = getRunSnapshot(surface.id);
                if (!snapshot) return null;

                const surfaceOutcomes = outcomes[surface.id] ?? [snapshot.status];
                const statusColor =
                  snapshot.status === "pass"
                    ? colors.contract?.valid ?? colors.neutral[600]
                    : snapshot.status === "warn"
                      ? "#b45309"
                    : snapshot.status === "fail"
                      ? colors.contract?.invalid ?? "#c00"
                      : colors.neutral[600];

                // Improved findings summary (Phase 6A hardening)
                let findingsSummary: string;
                if (snapshot.status === "unknown") {
                  findingsSummary = "No extraction";
                } else if (snapshot.status === "pass") {
                  findingsSummary = "No findings";
                } else {
                  // status === "fail"
                  const uniqueCodes = [...new Set(snapshot.findings.map((f) => f.code))];
                  findingsSummary =
                    uniqueCodes.length > 0
                      ? uniqueCodes.slice(0, 3).join(", ")
                      : "No findings";
                }

                return (
                  <tr
                    key={surface.id}
                    style={{
                      borderBottom: `1px solid ${colors.neutral[100]}`,
                    }}
                  >
                    <td
                      style={{
                        padding: "12px 16px",
                      }}
                    >
                      <Link
                        href={`/contracts/runs/${surface.id}`}
                        style={{
                          textDecoration: "none",
                          color: "inherit",
                        }}
                      >
                        <div style={{ fontWeight: 600 }}>{surface.displayName}</div>
                        {surface.domain && (
                          <div
                            style={{
                              fontSize: "12px",
                              color: colors.neutral[600],
                              marginTop: "2px",
                            }}
                          >
                            {surface.domain}
                          </div>
                        )}
                      </Link>
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: "14px",
                        color: colors.neutral[800],
                      }}
                    >
                      {getOperationalResponsibility(surface.owner)}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "12px",
                          fontFamily: "monospace",
                          color: statusColor,
                          textTransform: "lowercase",
                        }}
                      >
                        {snapshot.status}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: "12px",
                        fontFamily: "monospace",
                        color: colors.neutral[600],
                      }}
                    >
                      {snapshot.extractionCommit
                        ? `${snapshot.extractionCommit.hash} (${snapshot.extractionCommit.relativeTime})`
                        : "unknown"}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: "12px",
                        fontFamily: "monospace",
                        color: colors.neutral[600],
                        textTransform: "lowercase",
                      }}
                    >
                      {snapshot.latestSource}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: "12px",
                        fontFamily: "monospace",
                        color: colors.neutral[600],
                      }}
                    >
                      {snapshot.latestRunAt}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: "12px",
                        fontFamily: "monospace",
                        color: colors.neutral[600],
                      }}
                    >
                      {snapshot.contractVersion}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: "12px",
                        fontFamily: "monospace",
                        color: colors.neutral[600],
                      }}
                    >
                      {snapshot.contractCommit
                        ? `${snapshot.contractCommit.hash} (${snapshot.contractCommit.relativeTime})`
                        : "unknown"}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: "12px",
                        color: colors.neutral[800],
                      }}
                    >
                      {snapshot.status === "fail" ? (
                        <span style={{ fontFamily: "monospace" }}>{findingsSummary}</span>
                      ) : (
                        <span style={{ color: colors.neutral[600] }}>{findingsSummary}</span>
                      )}
                    </td>
                    {outcomesFileExists && (
                      <td
                        style={{
                          padding: "12px 16px",
                        }}
                      >
                        <OutcomeDots outcomes={surfaceOutcomes} />
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
