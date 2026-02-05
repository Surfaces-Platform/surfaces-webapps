import { getSession, getLogoutUrl } from "@surfaces/platform-auth";
import { headers } from "next/headers";
import Link from "next/link";
import Navigation from "@surfaces/ui/components/Navigation";
import { colors } from "@surfaces/ui/tokens/colors";

function getLogoutHref(): string {
  const base = process.env.OIDC_POST_LOGOUT_REDIRECT_URI ?? "http://localhost:3001/";
  const origin = new URL(base).origin;
  const logoutUrl = getLogoutUrl({ returnTo: `${origin}/auth/logout/complete` });
  return logoutUrl || "/auth/logout?global=1";
}

export default async function ContractsLayout({
  children,
}: { children: React.ReactNode }) {
  const headersList = await headers();
  const req = new Request("http://localhost", {
    headers: Object.fromEntries(headersList.entries()),
  });
  const result = await getSession(req);
  const logoutHref = getLogoutHref();
  if (!result.ok) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <Navigation
          currentSurface="surfaceops"
          currentContext={{ contentType: "operations", subject: "contracts" }}
          sections={[
            { label: "Overview", href: "/" },
            { label: "Surfaces", href: "/contracts" },
          ]}
          utilities={[
            { label: "GitHub", href: "#github" },
            { label: "Logout", href: logoutHref },
          ]}
          theme="light"
        />
        <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ textAlign: "center", maxWidth: 400 }}>
            <h2 style={{ fontSize: "18px", fontWeight: 600, marginBottom: 8 }}>Sign in to view surfaces</h2>
            <p style={{ fontSize: "14px", color: colors.neutral[600], marginBottom: 24 }}>
              Contract status and validation details require authentication.
            </p>
            <Link
              href="/auth/login?returnTo=/contracts"
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
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navigation
        currentSurface="surfaceops"
        currentContext={{ contentType: "operations", subject: "contracts" }}
        sections={[
          { label: "Overview", href: "/" },
          { label: "Surfaces", href: "/contracts" },
        ]}
        utilities={[
          { label: "GitHub", href: "#github" },
          { label: "Logout", href: logoutHref },
        ]}
        theme="light"
      />
      <main style={{ flex: 1 }}>{children}</main>
    </div>
  );
}
