import Link from "next/link";
import { redirect } from "next/navigation";
import { colors } from "@surfaces/ui/tokens/colors";
import { InviteRequestPanel } from "../_components/invite-request-panel";
import {
  buildDesktopUpdateAssetPath,
  getPromotedDesktopRelease,
  loadDesktopReleaseManifest,
} from "@/lib/desktop-release-manifest";
import {
  SURFACEOPS_DESKTOP_ALPHA_TARGET,
  SURFACEOPS_DESKTOP_WORKBENCH_PATH,
  shouldRedirectToSurfaceOpsDesktopWorkbench,
} from "@/lib/product-surface";

export const metadata = {
  title: "Download | SurfaceOps",
};

export const dynamic = "force-dynamic";

function infoCard(title: string, body: string) {
  return (
    <div
      style={{
        padding: "20px",
        borderRadius: "14px",
        border: `1px solid ${colors.neutral[200]}`,
        backgroundColor: colors.neutral[0],
      }}
    >
      <h3 style={{ fontSize: "16px", fontWeight: 700, margin: "0 0 10px" }}>{title}</h3>
      <p style={{ margin: 0, fontSize: "14px", lineHeight: 1.7, color: colors.neutral[600] }}>{body}</p>
    </div>
  );
}

export default async function DownloadPage() {
  if (shouldRedirectToSurfaceOpsDesktopWorkbench("/download")) {
    redirect(SURFACEOPS_DESKTOP_WORKBENCH_PATH);
  }

  const manifest = await loadDesktopReleaseManifest();
  const latestRelease = getPromotedDesktopRelease(manifest, "alpha");
  const stableRelease = getPromotedDesktopRelease(manifest, "stable");
  const alphaDmgPath = latestRelease?.platforms["darwin-arm64"].dmg.url
    ? buildDesktopUpdateAssetPath("alpha", "darwin-arm64", "download.dmg")
    : null;
  const stableDmgPath = stableRelease?.platforms["darwin-arm64"].dmg.url
    ? buildDesktopUpdateAssetPath("stable", "darwin-arm64", "download.dmg")
    : null;

  return (
    <div
      className="min-h-screen w-full"
      style={{
        backgroundColor: colors.neutral[50],
        color: colors.neutral[900],
      }}
    >
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "72px 24px 96px" }}>
        <section
          style={{
            display: "grid",
            gap: "24px",
            paddingBottom: "48px",
            borderBottom: `1px solid ${colors.neutral[200]}`,
          }}
        >
          <div style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: colors.neutral[600] }}>
            Download SurfaceOps
          </div>
          <h1 style={{ fontSize: "42px", lineHeight: 1.1, fontWeight: 700, maxWidth: 760, margin: 0 }}>
            SurfaceOps is shipping as a Mac desktop workbench first.
          </h1>
          <p style={{ fontSize: "16px", lineHeight: 1.8, color: colors.neutral[600], maxWidth: 760, margin: 0 }}>
            {alphaDmgPath
              ? "The public alpha DMG is available below. The updater feed, release notes, and download links all resolve from the same canonical release manifest."
              : "The public alpha feed is wired. The first signed DMG appears here as soon as the latest clean semver desktop release is promoted."}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {infoCard("Target platform", SURFACEOPS_DESKTOP_ALPHA_TARGET.platform)}
            {infoCard("Delivery", SURFACEOPS_DESKTOP_ALPHA_TARGET.delivery)}
            {infoCard("Model policy", SURFACEOPS_DESKTOP_ALPHA_TARGET.modelPolicy)}
          </div>
        </section>

        <section
          style={{
            display: "grid",
            gap: "18px",
            padding: "36px 0 18px",
            borderBottom: `1px solid ${colors.neutral[200]}`,
          }}
        >
          <h2 style={{ fontSize: "28px", fontWeight: 700, margin: 0 }}>Current public channels</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              style={{
                padding: "20px",
                borderRadius: "14px",
                border: `1px solid ${colors.neutral[200]}`,
                backgroundColor: colors.neutral[0],
              }}
            >
              <div style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.08em", color: colors.neutral[600], marginBottom: "8px" }}>
                Alpha
              </div>
              <div style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>
                {latestRelease ? latestRelease.version : "Public alpha pending"}
              </div>
              <p style={{ margin: "0 0 16px", color: colors.neutral[600], lineHeight: 1.7 }}>
                {latestRelease?.notes.summary ?? "Alpha is the default desktop channel and receives the newest public SurfaceOps builds first."}
              </p>
              {alphaDmgPath ? (
                <Link
                  href={alphaDmgPath}
                  style={{
                    display: "inline-flex",
                    minHeight: "42px",
                    alignItems: "center",
                    padding: "0 18px",
                    borderRadius: "999px",
                    textDecoration: "none",
                    fontWeight: 700,
                    backgroundColor: colors.structure.primary,
                    color: colors.neutral[0],
                  }}
                >
                  Download public alpha DMG
                </Link>
              ) : (
                <div style={{ fontSize: "13px", color: colors.neutral[600] }}>Signed public alpha DMG pending the next promoted release.</div>
              )}
            </div>

            <div
              style={{
                padding: "20px",
                borderRadius: "14px",
                border: `1px solid ${colors.neutral[200]}`,
                backgroundColor: colors.neutral[0],
              }}
            >
              <div style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.08em", color: colors.neutral[600], marginBottom: "8px" }}>
                Stable
              </div>
              <div style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>
                {stableRelease ? stableRelease.version : "Coming after soak"}
              </div>
              <p style={{ margin: "0 0 16px", color: colors.neutral[600], lineHeight: 1.7 }}>
                {stableRelease?.notes.summary ?? "Stable automatically promotes the exact alpha build that has soaked for 72 hours without being blocked."}
              </p>
              {stableDmgPath ? (
                <Link
                  href={stableDmgPath}
                  style={{
                    display: "inline-flex",
                    minHeight: "42px",
                    alignItems: "center",
                    padding: "0 18px",
                    borderRadius: "999px",
                    textDecoration: "none",
                    fontWeight: 700,
                    backgroundColor: colors.neutral[900],
                    color: colors.neutral[0],
                  }}
                >
                  Download stable DMG
                </Link>
              ) : (
                <div style={{ fontSize: "13px", color: colors.neutral[600] }}>Stable download appears here after the alpha soak window completes.</div>
              )}
            </div>
          </div>
        </section>

        <section
          id="release-updates"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.2fr) minmax(320px, 420px)",
            gap: "32px",
            padding: "48px 0",
            alignItems: "start",
          }}
        >
          <div style={{ display: "grid", gap: "18px" }}>
            <h2 style={{ fontSize: "28px", fontWeight: 700, margin: 0 }}>Get desktop release updates</h2>
            <p style={{ fontSize: "15px", lineHeight: 1.8, color: colors.neutral[600], margin: 0 }}>
              The public alpha is focused on the local contract workbench. Use this list if you want release announcements,
              stable-promotion notices, and future rollout updates without polling the site.
            </p>
            <div
              style={{
                padding: "18px 20px",
                borderRadius: "14px",
                border: `1px solid ${colors.neutral[200]}`,
                backgroundColor: colors.neutral[0],
              }}
            >
              <div style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.08em", color: colors.neutral[600], marginBottom: "10px" }}>
                Latest milestone
              </div>
              <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "8px" }}>{latestRelease?.name ?? "Public alpha feed pending first release"}</div>
              <p style={{ margin: 0, fontSize: "14px", lineHeight: 1.7, color: colors.neutral[600] }}>{latestRelease?.notes.summary ?? "The updater feed, public downloads, and release notes all promote from the same release manifest."}</p>
            </div>
            <div style={{ fontSize: "14px", lineHeight: 1.8, color: colors.neutral[600] }}>
              Need the implementation details first? Read the{" "}
              <Link href="/release-notes" style={{ color: colors.structure.primary, fontWeight: 700, textDecoration: "none" }}>
                release notes
              </Link>
              {" "}before requesting access.
            </div>
          </div>

          <div
            style={{
              padding: "24px",
              borderRadius: "18px",
              border: `1px solid ${colors.neutral[200]}`,
              backgroundColor: colors.neutral[0],
              boxShadow: "0 24px 56px rgba(15, 23, 42, 0.08)",
            }}
          >
            <InviteRequestPanel
              buttonLabel="Get release updates"
              idleMessage="Enter your work email and we’ll send SurfaceOps desktop alpha announcements, stable promotions, and major rollout updates."
              successMessage="Thanks. We’ll send SurfaceOps desktop release updates to this email."
            />
          </div>
        </section>
      </div>
    </div>
  );
}
