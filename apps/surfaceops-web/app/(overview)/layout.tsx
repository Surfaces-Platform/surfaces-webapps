import Navigation from "@surfaces/ui/components/Navigation";

/**
 * Public overview layout — no auth required.
 * Auth is enforced only in app/contracts/layout.tsx.
 */
export default function OverviewLayout({
  children,
}: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navigation
        currentSurface="surfaceops"
        currentContext={{ contentType: "overview", subject: "contracts" }}
        sections={[
          { label: "Overview", href: "/" },
          { label: "Surfaces", href: "/contracts" },
        ]}
        utilities={[
          { label: "GitHub", href: "#github" },
          { label: "Login", href: "/auth/login" },
        ]}
        theme="light"
      />
      <main style={{ flex: 1 }}>{children}</main>
    </div>
  );
}
