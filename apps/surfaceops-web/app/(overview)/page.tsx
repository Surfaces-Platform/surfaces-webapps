import { colors } from "@surfaces/ui/tokens/colors";
import { InviteRequestPanel } from "./_components/invite-request-panel";

export default function Home() {
  return (
    <div
      className="min-h-screen w-full"
      style={{
        backgroundColor: colors.neutral[50],
        fontFamily: "Inter, sans-serif",
        color: colors.neutral[900],
      }}
    >
      <div
        className="contract-container"
        style={{
          maxWidth: 1120,
          margin: "0 auto",
        }}
      >
        <section
          data-contract-section="landing.hero"
          style={{
            paddingTop: "128px",
            paddingBottom: "96px",
          }}
        >
          <p
            style={{
              margin: "0 0 12px",
              fontSize: "14px",
              fontWeight: 600,
              color: colors.neutral[600],
            }}
          >
            Invite-only preview
          </p>
          <h1
            style={{
              fontSize: "32px",
              fontWeight: 600,
              lineHeight: 1.2,
              margin: "0 0 24px",
              maxWidth: "720px",
            }}
          >
            SurfaceOps keeps contract operations visible before drift reaches production.
          </h1>
          <p
            style={{
              fontSize: "14px",
              fontWeight: 400,
              lineHeight: 1.6,
              margin: 0,
              maxWidth: "640px",
            }}
          >
            SurfaceOps gives platform teams a live operating view of contract coverage,
            extraction drift, ownership, and enforcement posture across production surfaces.
            Access is rolling out in small cohorts while we tighten the workflow.
          </p>
        </section>

        <section
          data-contract-section="landing.guidance"
          style={{
            paddingTop: "96px",
            paddingBottom: "96px",
            borderTop: `1px solid ${colors.neutral[200]}`,
          }}
        >
          <h2
            style={{
              fontSize: "20px",
              fontWeight: 600,
              margin: "0 0 24px",
            }}
          >
            What invite access unlocks
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div
              style={{
                padding: "32px",
                borderRadius: "6px",
                backgroundColor: colors.neutral[0],
                border: `1px solid ${colors.neutral[200]}`,
              }}
            >
              <h3 style={{ fontSize: "16px", fontWeight: 600, margin: "0 0 12px" }}>
                Inspect
              </h3>
              <p style={{ fontSize: "14px", lineHeight: 1.6, margin: 0 }}>
                Review surfaces, ownership, and contract-state changes without exposing the
                operational workspace broadly.
              </p>
            </div>
            <div
              style={{
                padding: "32px",
                borderRadius: "6px",
                backgroundColor: colors.neutral[0],
                border: `1px solid ${colors.neutral[200]}`,
              }}
            >
              <h3 style={{ fontSize: "16px", fontWeight: 600, margin: "0 0 12px" }}>
                Track
              </h3>
              <p style={{ fontSize: "14px", lineHeight: 1.6, margin: 0 }}>
                Follow onboarding runs, extraction drift, and enforcement posture as contracts
                move through the workflow.
              </p>
            </div>
            <div
              style={{
                padding: "32px",
                borderRadius: "6px",
                backgroundColor: colors.neutral[0],
                border: `1px solid ${colors.neutral[200]}`,
              }}
            >
              <h3 style={{ fontSize: "16px", fontWeight: 600, margin: "0 0 12px" }}>
                Operate
              </h3>
              <p style={{ fontSize: "14px", lineHeight: 1.6, margin: 0 }}>
                Join the preview while we tighten the operator experience and expand access in
                controlled cohorts.
              </p>
            </div>
          </div>
        </section>

        <section
          data-contract-section="landing.actions"
          style={{
            paddingTop: "96px",
            paddingBottom: "96px",
            borderTop: `1px solid ${colors.neutral[200]}`,
          }}
        >
          <p
            style={{
              fontSize: "14px",
              fontWeight: 400,
              lineHeight: 1.6,
              margin: "0 0 24px",
              maxWidth: "640px",
            }}
          >
            Request an invite to join the next SurfaceOps cohort. We’ll reach out as preview
            access expands.
          </p>
          <InviteRequestPanel />
        </section>
      </div>
    </div>
  );
}
