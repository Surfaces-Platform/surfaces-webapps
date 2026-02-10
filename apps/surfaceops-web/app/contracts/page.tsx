import Link from "next/link";
import {
  loadExtraction,
  computeValidationStatus,
  loadPolicyContract,
  loadActivatedSurfaces,
  getRecentRunOutcomes,
} from "@/lib/contracts";
import { colors } from "@surfaces/ui/tokens/colors";
import { OnboardingForm } from "./_components/onboarding-form";

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
            width: 6,
            height: 6,
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

export default function ContractsPage() {
  const contract = loadPolicyContract();
  const activatedSurfaces = loadActivatedSurfaces();

  if (activatedSurfaces.length === 0) {
    return (
      <div
        className="min-h-screen w-full"
        style={{
          backgroundColor: colors.neutral[50],
          fontFamily: "Inter, sans-serif",
          color: colors.neutral[900],
        }}
      >
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "72px 24px" }}>
          <h1 style={{ fontSize: "28px", fontWeight: 700, marginBottom: "8px" }}>No contracts yet</h1>
          <p
            style={{
              fontSize: "14px",
              color: colors.neutral[600],
              marginBottom: "28px",
            }}
          >
            Start onboarding by generating your first contract from a surface URL.
          </p>
          <OnboardingForm />
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen w-full"
      style={{
        backgroundColor: colors.neutral[50],
        fontFamily: "Inter, sans-serif",
        color: colors.neutral[900],
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px" }}>
        <h1
          style={{
            fontSize: "24px",
            fontWeight: 600,
            marginBottom: "8px",
          }}
        >
          Surfaces
        </h1>
        <p
          style={{
            fontSize: "14px",
            color: colors.neutral[600],
            marginBottom: "32px",
          }}
        >
          {contract.contractId} v{contract.version}
        </p>

        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {activatedSurfaces.map((surface) => {
            const policySurface = contract.surfaces.find((item) => item.id === surface.id);
            const extracted = loadExtraction(surface.id);
            const status = policySurface
              ? computeValidationStatus(policySurface, extracted)
              : getRecentRunOutcomes(surface.id, 1)[0] ?? "unknown";
            const recentOutcomes = getRecentRunOutcomes(surface.id, 5);
            const surfaceOutcomes = recentOutcomes.length > 0 ? recentOutcomes : [status];
            const statusColor =
              status === "pass"
                ? colors.contract?.valid ?? colors.neutral[600]
                : status === "fail"
                  ? colors.contract?.invalid ?? "#c00"
                  : colors.neutral[600];
            const href = surface.inPolicyContract
              ? `/contracts/${surface.id}`
              : `/contracts/runs/${surface.id}`;
            return (
              <li
                key={surface.id}
                style={{
                  marginBottom: "16px",
                  padding: "16px",
                  backgroundColor: colors.neutral[0],
                  border: `1px solid ${colors.neutral[200]}`,
                  borderRadius: "6px",
                }}
              >
                <Link
                  href={href}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    textDecoration: "none",
                    color: "inherit",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>
                      {surface.displayName || surface.id}
                      {surface.owner?.trim() ? (
                        <span
                          style={{
                            fontWeight: 400,
                            color: colors.neutral[600],
                            marginLeft: "8px",
                            fontSize: "13px",
                          }}
                        >
                          · {surface.owner.trim()}
                        </span>
                      ) : (
                        <span
                          style={{
                            fontWeight: 400,
                            color: colors.neutral[400],
                            marginLeft: "8px",
                            fontSize: "13px",
                          }}
                        >
                          · No owner specified
                        </span>
                      )}
                    </div>
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
                  </div>
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <OutcomeDots outcomes={surfaceOutcomes} />
                    <span
                      style={{
                        fontSize: "12px",
                        fontFamily: "monospace",
                        color: statusColor,
                        textTransform: "lowercase",
                      }}
                    >
                      {status}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
