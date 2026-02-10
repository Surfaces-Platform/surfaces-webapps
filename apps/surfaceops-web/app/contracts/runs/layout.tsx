import { getSession, getLogoutUrl } from "@surfaces/platform-auth";
import { headers } from "next/headers";
import Link from "next/link";
import { colors } from "@surfaces/ui/tokens/colors";

function getLogoutHref(): string {
  const base = process.env.OIDC_POST_LOGOUT_REDIRECT_URI ?? "http://localhost:3001/";
  const origin = new URL(base).origin;
  const logoutUrl = getLogoutUrl({ returnTo: `${origin}/auth/logout/complete` });
  return logoutUrl || "/auth/logout?global=1";
}

export default async function RunsLayout({
  children,
}: { children: React.ReactNode }) {
  const bypassAuth = process.env.SURFACEOPS_TEST_BYPASS_AUTH === "1";
  const logoutHref = getLogoutHref();
  if (!bypassAuth) {
    const headersList = await headers();
    const req = new Request("http://localhost", {
      headers: Object.fromEntries(headersList.entries()),
    });
    const result = await getSession(req);
    if (!result.ok) {
      return (
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
          <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
            <div style={{ textAlign: "center", maxWidth: 400 }}>
              <h2 style={{ fontSize: "18px", fontWeight: 600, marginBottom: 8 }}>Sign in to view runs</h2>
              <p style={{ fontSize: "14px", color: colors.neutral[600], marginBottom: 24 }}>
                Contract runs and validation history require authentication.
              </p>
              <Link
                href="/auth/login?returnTo=/contracts/runs"
                style={{
                  display: "inline-block",
                  fontSize: "14px",
                  fontWeight: 600,
                  padding: "12px 24px",
                  backgroundColor: colors.structure.primary,
                  color: colors.neutral[0],
                  textDecoration: "none",
                  borderRadius: "6px",
                }}
              >
                Sign in
              </Link>
            </div>
          </main>
        </div>
      );
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <main style={{ flex: 1 }}>{children}</main>
    </div>
  );
}
