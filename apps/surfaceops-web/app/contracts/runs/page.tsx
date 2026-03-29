import Link from "next/link";
import {
  loadPolicyContract,
  loadActivatedSurfaces,
  getRunSnapshot,
  loadValidationOutcomes,
  validationOutcomesFileExists,
  getOperationalResponsibility,
  getPerSourcePassRates,
  getPerSourceTimeToGreen,
  withStoreBackedRunDocuments,
} from "@/lib/contracts";
import { getWorkspaceIdFromCurrentRequest } from "@/lib/workspace-auth";
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

function formatDurationHours(valueMs: number | null): string {
  if (valueMs === null) return "insufficient history";
  const hours = valueMs / (1000 * 60 * 60);
  if (hours < 1) return "<1h";
  if (hours < 24) return `${Math.round(hours)}h`;
  return `${Math.round(hours / 24)}d`;
}

export default async function RunsPage() {
  const workspaceId = await getWorkspaceIdFromCurrentRequest();
  const data = await withStoreBackedRunDocuments(workspaceId, (meta) => {
    const contract = loadPolicyContract();
    const activatedSurfaces = loadActivatedSurfaces();
    const outcomes = loadValidationOutcomes(contract);
    const outcomesFileExists = validationOutcomesFileExists();
    const rows = activatedSurfaces
      .map((surface) => {
        const passRates = getPerSourcePassRates(surface.id);
        const ttg = getPerSourceTimeToGreen(surface.id);
        return {
          surface,
          snapshot: getRunSnapshot(surface.id),
          passRates,
          ttg,
        };
      })
      .filter((entry) => entry.snapshot !== null);

    return {
      contract,
      outcomes,
      outcomesFileExists,
      rows,
      runStoreMeta: meta,
    };
  });

  const outcomes = data.outcomes;
  const outcomesFileExists = data.outcomesFileExists;
  const rows = data.rows;

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
        {data.runStoreMeta.fallbackUsed && (
          <div
            style={{
              marginBottom: "16px",
              border: `1px solid ${colors.neutral[200]}`,
              borderRadius: "6px",
              backgroundColor: colors.neutral[0],
              padding: "10px 12px",
              fontSize: "12px",
              color: colors.neutral[600],
              fontFamily: "monospace",
            }}
          >
            RunStore fallback active ({data.runStoreMeta.warning ?? "using JSON artifacts"}).
          </div>
        )}

        {rows.length === 0 && (
          <div
            style={{
              backgroundColor: colors.neutral[0],
              border: `1px solid ${colors.neutral[200]}`,
              borderRadius: "6px",
              padding: "20px",
              marginBottom: "16px",
            }}
          >
            <div style={{ fontSize: "16px", fontWeight: 600, marginBottom: "6px" }}>No runs yet</div>
            <div style={{ fontSize: "14px", color: colors.neutral[600] }}>
              Create your first governed surface to record a bootstrap run.
            </div>
          </div>
        )}

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
                <th
                  style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: colors.neutral[600],
                  }}
                >
                  Source KPIs
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
              {rows.map(({ surface, snapshot, passRates, ttg }) => {
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

                const ciPassRate = passRates.find((entry) => entry.source === "ci");
                const runtimePassRate = passRates.find((entry) => entry.source === "runtime");
                const ciTtg = ttg.find((entry) => entry.source === "ci");
                const runtimeTtg = ttg.find((entry) => entry.source === "runtime");

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
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: "11px",
                        color: colors.neutral[600],
                        fontFamily: "monospace",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <div>
                        ci pass:{" "}
                        {ciPassRate?.insufficientHistory
                          ? "insufficient history"
                          : `${ciPassRate?.passed ?? 0}/${ciPassRate?.total ?? 0}`}
                      </div>
                      <div>ci ttg: {formatDurationHours(ciTtg?.latestMs ?? null)}</div>
                      <div>
                        runtime pass:{" "}
                        {runtimePassRate?.insufficientHistory
                          ? "insufficient history"
                          : `${runtimePassRate?.passed ?? 0}/${runtimePassRate?.total ?? 0}`}
                      </div>
                      <div>runtime ttg: {formatDurationHours(runtimeTtg?.latestMs ?? null)}</div>
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
