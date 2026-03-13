import { getSession } from "@surfaces/platform-auth";
import { headers } from "next/headers";
import Link from "next/link";
import { colors } from "@surfaces/ui/tokens/colors";
import { isSurfaceOpsAuthBypassEnabled } from "@/lib/auth-bypass";

export default async function ContractsLayout({
  children,
}: { children: React.ReactNode }) {
  const bypassAuth = isSurfaceOpsAuthBypassEnabled();
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
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <main style={{ flex: 1 }}>{children}</main>
    </div>
  );
}
