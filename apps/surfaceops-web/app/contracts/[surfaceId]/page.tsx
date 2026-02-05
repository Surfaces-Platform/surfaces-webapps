import Link from "next/link";
import { notFound } from "next/navigation";
import {
  loadPolicyContract,
  loadExtraction,
  computeValidationStatus,
} from "@/lib/contracts";
import { colors } from "@surfaces/ui/tokens/colors";

export default async function ContractDetailPage({
  params,
}: { params: Promise<{ surfaceId: string }> }) {
  const { surfaceId } = await params;
  const contract = loadPolicyContract();
  const surface = contract.surfaces.find((s) => s.id === surfaceId);
  if (!surface) notFound();

  const extracted = loadExtraction(surfaceId);
  const status = computeValidationStatus(surface, extracted);

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
        <Link
          href="/contracts"
          style={{
            fontSize: "14px",
            color: colors.neutral[600],
            textDecoration: "none",
            marginBottom: "24px",
            display: "inline-block",
          }}
        >
          ← Surfaces
        </Link>

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
            marginBottom: "24px",
          }}
        >
          {surface.domain ?? surface.id}
        </p>

        <div
          style={{
            fontSize: "14px",
            color: colors.neutral[600],
            marginBottom: "24px",
          }}
        >
          Last generated: unknown
        </div>

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
              }}
            >
              {status}
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
