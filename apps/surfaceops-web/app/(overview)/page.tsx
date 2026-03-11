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
        data-contract="page-container"
        data-contract-typography-profile="marketing-sans"
        style={{
          maxWidth: 1120,
          margin: "0 auto",
        }}
      >
        <section
          data-contract-section="landing.hero"
          data-contract-marketing-layout-profile="marketing-open-flow-text-roomy"
          data-contract-hero-container-mode="open-flow"
          data-contract-hero-visual-placement="none"
          data-contract-section-divider-mode="border-top"
          data-contract-section-spacing-profile="roomy"
          style={{
            paddingTop: "var(--marketing-layout-hero-padding-top-roomy)",
            paddingBottom: "var(--marketing-layout-hero-padding-bottom-roomy)",
          }}
        >
          <p
            data-contract-copy-role="heroEyebrow"
            style={{
              margin: "0 0 12px",
              fontFamily: "var(--marketing-sans-hero-eyebrow-family)",
              fontSize: "var(--marketing-sans-hero-eyebrow-size)",
              fontWeight: 600,
              lineHeight: "var(--marketing-sans-hero-eyebrow-line-height)",
              letterSpacing: "var(--marketing-sans-hero-eyebrow-letter-spacing)",
              textTransform: "uppercase",
              color: colors.neutral[600],
            }}
          >
            Invite-only preview
          </p>
          <h1
            data-contract-copy-role="heroTitle"
            style={{
              fontFamily: "var(--marketing-sans-hero-title-family)",
              fontSize: "var(--marketing-sans-hero-title-size)",
              fontWeight: 600,
              lineHeight: "var(--marketing-sans-hero-title-line-height)",
              margin: "0 0 24px",
              maxWidth: "var(--marketing-layout-copy-max-width-wide)",
            }}
          >
            SurfaceOps keeps contract operations visible before drift reaches production.
          </h1>
          <p
            data-contract-copy-role="heroBody"
            style={{
              fontFamily: "var(--marketing-sans-hero-body-family)",
              fontSize: "var(--marketing-sans-hero-body-size)",
              fontWeight: 400,
              lineHeight: "var(--marketing-sans-hero-body-line-height)",
              margin: 0,
              maxWidth: "var(--marketing-layout-copy-max-width)",
            }}
          >
            SurfaceOps gives platform teams a live operating view of contract coverage,
            extraction drift, ownership, and enforcement posture across production surfaces.
            Access is rolling out in small cohorts while we tighten the workflow.
          </p>
          <div style={{ marginTop: "32px" }}>
            <InviteRequestPanel />
          </div>
        </section>

        <section
          data-contract-section="landing.guidance"
          style={{
            paddingTop: "var(--marketing-layout-section-padding-roomy)",
            paddingBottom: "var(--marketing-layout-section-padding-roomy)",
            borderTop: `1px solid ${colors.neutral[200]}`,
          }}
        >
          <h2
            data-contract-copy-role="sectionTitle"
            style={{
              fontFamily: "var(--marketing-sans-section-title-family)",
              fontSize: "var(--marketing-sans-section-title-size)",
              fontWeight: 600,
              lineHeight: "var(--marketing-sans-section-title-line-height)",
              margin: "0 0 24px",
            }}
          >
            What invite access unlocks
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div
              style={{
                padding: "var(--marketing-layout-card-padding)",
                borderRadius: "6px",
                backgroundColor: colors.neutral[0],
                border: `1px solid ${colors.neutral[200]}`,
              }}
            >
              <h3 style={{ fontSize: "16px", fontWeight: 600, margin: "0 0 12px" }}>
                Inspect
              </h3>
              <p style={{ fontSize: "14px", lineHeight: 1.6, margin: 0 }}>
                <span data-contract-copy-role="body" style={{ fontFamily: "var(--marketing-sans-body-family)", fontSize: "var(--marketing-sans-body-size)", lineHeight: "var(--marketing-sans-body-line-height)" }}>
                Review surfaces, ownership, and contract-state changes without exposing the
                operational workspace broadly.
                </span>
              </p>
            </div>
            <div
              style={{
                padding: "var(--marketing-layout-card-padding)",
                borderRadius: "6px",
                backgroundColor: colors.neutral[0],
                border: `1px solid ${colors.neutral[200]}`,
              }}
            >
              <h3 style={{ fontSize: "16px", fontWeight: 600, margin: "0 0 12px" }}>
                Track
              </h3>
              <p style={{ fontSize: "14px", lineHeight: 1.6, margin: 0 }}>
                <span data-contract-copy-role="body" style={{ fontFamily: "var(--marketing-sans-body-family)", fontSize: "var(--marketing-sans-body-size)", lineHeight: "var(--marketing-sans-body-line-height)" }}>
                Follow onboarding runs, extraction drift, and enforcement posture as contracts
                move through the workflow.
                </span>
              </p>
            </div>
            <div
              style={{
                padding: "var(--marketing-layout-card-padding)",
                borderRadius: "6px",
                backgroundColor: colors.neutral[0],
                border: `1px solid ${colors.neutral[200]}`,
              }}
            >
              <h3 style={{ fontSize: "16px", fontWeight: 600, margin: "0 0 12px" }}>
                Operate
              </h3>
              <p style={{ fontSize: "14px", lineHeight: 1.6, margin: 0 }}>
                <span data-contract-copy-role="body" style={{ fontFamily: "var(--marketing-sans-body-family)", fontSize: "var(--marketing-sans-body-size)", lineHeight: "var(--marketing-sans-body-line-height)" }}>
                Join the preview while we tighten the operator experience and expand access in
                controlled cohorts.
                </span>
              </p>
            </div>
          </div>
        </section>

        <section
          data-contract-section="landing.actions"
          style={{
            paddingTop: "var(--marketing-layout-section-padding-roomy)",
            paddingBottom: "var(--marketing-layout-section-padding-roomy)",
            borderTop: `1px solid ${colors.neutral[200]}`,
          }}
        >
          <h2
            data-contract-copy-role="sectionTitle"
            style={{
              fontFamily: "var(--marketing-sans-section-title-family)",
              fontSize: "var(--marketing-sans-section-title-size)",
              fontWeight: 600,
              lineHeight: "var(--marketing-sans-section-title-line-height)",
              margin: "0 0 24px",
            }}
          >
            What happens next
          </h2>
          <p
            data-contract-copy-role="body"
            style={{
              fontFamily: "var(--marketing-sans-body-family)",
              fontSize: "var(--marketing-sans-body-size)",
              fontWeight: 400,
              lineHeight: "var(--marketing-sans-body-line-height)",
              margin: 0,
              maxWidth: "var(--marketing-layout-copy-max-width)",
            }}
          >
            Invite requests go into the next rollout queue. We review new teams in small groups
            and reach out directly when preview access is available.
          </p>
        </section>
      </div>
    </div>
  );
}
