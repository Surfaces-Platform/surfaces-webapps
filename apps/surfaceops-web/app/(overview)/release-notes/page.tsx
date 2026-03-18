import { redirect } from "next/navigation";
import { colors } from "@surfaces/ui/tokens/colors";
import { getAllDesktopReleases, loadDesktopReleaseManifest } from "@/lib/desktop-release-manifest";
import {
  SURFACEOPS_DESKTOP_WORKBENCH_PATH,
  shouldRedirectToSurfaceOpsDesktopWorkbench,
} from "@/lib/product-surface";

export const metadata = {
  title: "Release Notes | SurfaceOps",
};

export const dynamic = "force-dynamic";

export default async function ReleaseNotesPage() {
  if (shouldRedirectToSurfaceOpsDesktopWorkbench("/release-notes")) {
    redirect(SURFACEOPS_DESKTOP_WORKBENCH_PATH);
  }

  const manifest = await loadDesktopReleaseManifest();
  const releases = getAllDesktopReleases(manifest);

  return (
    <div
      className="min-h-screen w-full"
      style={{
        backgroundColor: colors.neutral[50],
        color: colors.neutral[900],
      }}
    >
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "72px 24px 96px" }}>
        <section style={{ paddingBottom: "32px", borderBottom: `1px solid ${colors.neutral[200]}` }}>
          <div style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.08em", color: colors.neutral[600], marginBottom: "12px" }}>
            SurfaceOps release notes
          </div>
          <h1 style={{ fontSize: "42px", lineHeight: 1.1, fontWeight: 700, margin: 0 }}>Desktop release history</h1>
          <p style={{ maxWidth: 700, margin: "20px 0 0", fontSize: "16px", lineHeight: 1.8, color: colors.neutral[600] }}>
            Track public alpha releases, stable promotions, and the rollout history that powers the canonical
            SurfaceOps desktop update feed.
          </p>
        </section>

        <section style={{ display: "grid", gap: "20px", paddingTop: "36px" }}>
          {releases.map((note) => (
            <article
              key={note.id}
              id={note.id}
              style={{
                padding: "24px",
                borderRadius: "18px",
                border: `1px solid ${colors.neutral[200]}`,
                backgroundColor: colors.neutral[0],
              }}
            >
              <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center", marginBottom: "12px" }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    borderRadius: "999px",
                    padding: "6px 10px",
                    fontSize: "12px",
                    fontWeight: 700,
                    backgroundColor: colors.neutral[100],
                  color: colors.neutral[600],
                  }}
                >
                  {note.channel}
                </span>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    borderRadius: "999px",
                    padding: "6px 10px",
                    fontSize: "12px",
                    fontWeight: 700,
                    backgroundColor: colors.neutral[100],
                    color: colors.neutral[800],
                  }}
                >
                  {note.version}
                </span>
                <span style={{ fontSize: "13px", color: colors.neutral[600] }}>{note.publishedAt.slice(0, 10)}</span>
              </div>
              <h2 style={{ fontSize: "24px", fontWeight: 700, margin: "0 0 10px" }}>{note.notes.title}</h2>
              <p style={{ margin: "0 0 16px", fontSize: "15px", lineHeight: 1.8, color: colors.neutral[600] }}>{note.notes.summary}</p>
              <ul style={{ margin: 0, paddingLeft: "20px", color: colors.neutral[600], lineHeight: 1.8 }}>
                {note.notes.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}
