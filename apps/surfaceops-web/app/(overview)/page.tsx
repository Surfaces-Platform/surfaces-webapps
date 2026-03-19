import Link from "next/link";
import { redirect } from "next/navigation";
import { colors } from "@surfaces/ui/tokens/colors";
import { isSurfaceOpsLocalWorkbenchEnabled } from "@/lib/auth-bypass";
import {
  resolveSurfaceOpsDesktopRuntimePath,
  shouldRedirectToSurfaceOpsDesktopWorkbench,
} from "@/lib/product-surface";

export const dynamic = "force-dynamic";

export default function Home() {
  if (shouldRedirectToSurfaceOpsDesktopWorkbench("/")) {
    redirect(resolveSurfaceOpsDesktopRuntimePath());
  }

  const localWorkbenchEnabled = isSurfaceOpsLocalWorkbenchEnabled();

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
            Public alpha
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
            Shape interface contracts locally, then ship with less drift.
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
            SurfaceOps is moving out of the hosted SaaS shape and into a local desktop
            workbench for designers and platform teams. The goal is fast local feedback,
            open-model flexibility, and lower operating cost without a hosted inference tax.
          </p>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "12px",
              marginTop: "32px",
            }}
          >
            <Link
              href="/download"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "46px",
                padding: "0 20px",
                borderRadius: "999px",
                textDecoration: "none",
                fontSize: "14px",
                fontWeight: 700,
                backgroundColor: colors.structure.primary,
                color: colors.neutral[0],
              }}
            >
              Download Public Alpha
            </Link>
            <Link
              href="/release-notes"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "46px",
                padding: "0 20px",
                borderRadius: "999px",
                textDecoration: "none",
                fontSize: "14px",
                fontWeight: 700,
                border: `1px solid ${colors.neutral[200]}`,
                color: colors.neutral[900],
                backgroundColor: colors.neutral[0],
              }}
            >
              Read Release Notes
            </Link>
            {localWorkbenchEnabled ? (
              <Link
                href="/contracts/governance"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: "46px",
                  padding: "0 20px",
                  borderRadius: "999px",
                  textDecoration: "none",
                  fontSize: "14px",
                  fontWeight: 700,
                  border: `1px dashed ${colors.neutral[400]}`,
                  color: colors.neutral[600],
                  backgroundColor: colors.neutral[0],
                }}
              >
                Open Local Workbench
              </Link>
            ) : null}
          </div>
        </section>

        <section
          data-contract-section="landing.whydesktop"
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
            Why move SurfaceOps to desktop
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
                Faster shaping loop
              </h3>
              <p style={{ fontSize: "14px", lineHeight: 1.6, margin: 0 }}>
                <span data-contract-copy-role="body" style={{ fontFamily: "var(--marketing-sans-body-family)", fontSize: "var(--marketing-sans-body-size)", lineHeight: "var(--marketing-sans-body-line-height)" }}>
                Keep the contract editor, previews, and local reruns on-device so designers can
                iterate without waiting on a hosted queue.
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
                Open-model flexibility
              </h3>
              <p style={{ fontSize: "14px", lineHeight: 1.6, margin: 0 }}>
                <span data-contract-copy-role="body" style={{ fontFamily: "var(--marketing-sans-body-family)", fontSize: "var(--marketing-sans-body-size)", lineHeight: "var(--marketing-sans-body-line-height)" }}>
                Choose from open-source local models instead of routing every shaping decision
                through one hosted inference tier.
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
                Lower operating cost
              </h3>
              <p style={{ fontSize: "14px", lineHeight: 1.6, margin: 0 }}>
                <span data-contract-copy-role="body" style={{ fontFamily: "var(--marketing-sans-body-family)", fontSize: "var(--marketing-sans-body-size)", lineHeight: "var(--marketing-sans-body-line-height)" }}>
                SurfaceOps.ai stays thin: marketing, download, release notes, and later a light
                control plane instead of always-on model hosting.
                </span>
              </p>
            </div>
          </div>
        </section>

        <section
          data-contract-section="landing.workbench"
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
            What the desktop workbench does
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div
              style={{
                padding: "var(--marketing-layout-card-padding)",
                borderRadius: "12px",
                backgroundColor: colors.neutral[0],
                border: `1px solid ${colors.neutral[200]}`,
              }}
            >
              <h3 style={{ fontSize: "16px", fontWeight: 600, margin: "0 0 12px" }}>
                Local contract shaping
              </h3>
              <p style={{ fontSize: "14px", lineHeight: 1.7, margin: 0, color: colors.neutral[600] }}>
                The first desktop alpha wraps the existing React workbench so teams can run the
                contract loop locally, compare baseline versus current output, and keep artifacts on-device.
              </p>
            </div>
            <div
              style={{
                padding: "var(--marketing-layout-card-padding)",
                borderRadius: "12px",
                backgroundColor: colors.neutral[0],
                border: `1px solid ${colors.neutral[200]}`,
              }}
            >
              <h3 style={{ fontSize: "16px", fontWeight: 600, margin: "0 0 12px" }}>
                Later GitHub monitoring
              </h3>
              <p style={{ fontSize: "14px", lineHeight: 1.7, margin: 0, color: colors.neutral[600] }}>
                After the local loop is solid, SurfaceOps grows into a desktop monitor for
                GitHub Actions validation, drift, and build notifications.
              </p>
            </div>
          </div>
        </section>

        <section
          data-contract-section="landing.next"
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
            Public alpha releases publish from clean semver tags, and the same signed build auto-promotes to stable
            after a 72-hour soak unless an operator blocks it for an incident. Track the current feed state on the
            download page and release notes.
          </p>
        </section>
      </div>
    </div>
  );
}
