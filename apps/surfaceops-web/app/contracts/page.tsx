import Link from "next/link";
import { loadPolicyContract, loadExtraction, computeValidationStatus } from "@/lib/contracts";
import { colors } from "@surfaces/ui/tokens/colors";

export default function ContractsPage() {
  const contract = loadPolicyContract();

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
          {contract.surfaces.map((surface) => {
            const extracted = loadExtraction(surface.id);
            const status = computeValidationStatus(surface, extracted);
            const statusColor =
              status === "pass"
                ? colors.contract?.valid ?? colors.neutral[600]
                : status === "fail"
                  ? colors.contract?.invalid ?? "#c00"
                  : colors.neutral[600];
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
                  href={`/contracts/${surface.id}`}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    textDecoration: "none",
                    color: "inherit",
                  }}
                >
                  <div>
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
                  </div>
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
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
