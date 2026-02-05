import { getSession } from "@surfaces/platform-auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Navigation from "@surfaces/ui/components/Navigation";

export default async function ContractsLayout({
  children,
}: { children: React.ReactNode }) {
  const headersList = await headers();
  const req = new Request("http://localhost", {
    headers: Object.fromEntries(headersList.entries()),
  });
  const result = await getSession(req);
  if (!result.ok) {
    redirect("/auth/login?returnTo=/contracts");
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
          { label: "Logout", href: "/auth/logout" },
        ]}
        theme="light"
      />
      <main style={{ flex: 1 }}>{children}</main>
    </div>
  );
}
