import { colors } from "@surfaces/ui/tokens/colors";
import { InviteRequestPanel } from "./_components/invite-request-panel";

export default function Home() {
  return (
    <div
      className="min-h-screen w-full"
      style={{
        background:
          "radial-gradient(circle at top left, rgba(56, 189, 248, 0.16), transparent 34%), linear-gradient(180deg, #F8FBFF 0%, #FAFAFA 52%, #F5F7FA 100%)",
        fontFamily: "Inter, sans-serif",
        color: colors.neutral[900],
      }}
    >
      <div
        className="contract-container"
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          padding: "clamp(72px, 10vw, 128px) 24px",
        }}
      >
        <section
          data-contract-section="landing.hero"
          style={{
            display: "grid",
            gap: "32px",
            alignItems: "start",
          }}
        >
          <div
            style={{
              display: "grid",
              gap: "20px",
              maxWidth: "760px",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                width: "fit-content",
                alignItems: "center",
                gap: "8px",
                padding: "8px 14px",
                borderRadius: "999px",
                border: "1px solid rgba(15, 23, 42, 0.08)",
                backgroundColor: "rgba(255, 255, 255, 0.9)",
                color: colors.neutral[800],
                fontSize: "12px",
                fontWeight: 600,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              Invite-only preview
            </span>
            <h1
              style={{
                fontSize: "clamp(40px, 7vw, 72px)",
                fontWeight: 600,
                lineHeight: 0.95,
                letterSpacing: "-0.05em",
                maxWidth: "12ch",
                margin: 0,
              }}
            >
              SurfaceOps for contract operations teams.
            </h1>
            <p
              style={{
                margin: 0,
                maxWidth: "58ch",
                fontSize: "18px",
                lineHeight: 1.7,
                color: colors.neutral[800],
              }}
            >
              SurfaceOps gives platform teams a live operating view of contract coverage,
              extraction drift, and enforcement posture across production surfaces. Access
              is rolling out in small cohorts while we tighten the workflow.
            </p>
          </div>
          <section
            data-contract-section="landing.guidance"
            style={{
              display: "grid",
              gap: "24px",
              padding: "clamp(24px, 3vw, 32px)",
              borderRadius: "28px",
              backgroundColor: "rgba(255, 255, 255, 0.84)",
              border: "1px solid rgba(15, 23, 42, 0.08)",
              boxShadow: "0 32px 80px rgba(15, 23, 42, 0.08)",
            }}
          >
            <div style={{ display: "grid", gap: "12px", maxWidth: "720px" }}>
              <p
                style={{
                  margin: 0,
                  fontSize: "14px",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: colors.structure.primary,
                }}
              >
                What invite access unlocks
              </p>
              <p style={{ margin: 0, fontSize: "16px", lineHeight: 1.7, color: colors.neutral[800] }}>
                Inspect surfaces, review onboarding runs, and track contract-state changes without
                exposing the app broadly before the next release cut. Request an invite and we’ll
                contact you when your cohort is open.
              </p>
            </div>
            <section data-contract-section="landing.actions">
              <InviteRequestPanel />
            </section>
          </section>
        </section>
      </div>
    </div>
  );
}
