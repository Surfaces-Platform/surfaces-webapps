import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Navigation from "@surfaces/ui/components/Navigation";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "SurfaceOps - Operational enforcement and monitoring",
  description: "surfaceops.ai monitors, enforces, and manages interface integrity across evolving systems and AI workflows.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} antialiased font-sans`}
        style={{ fontFamily: 'var(--font-inter), Inter, sans-serif' }}
      >
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
          <Navigation
            currentSurface="surfaceops"
            currentContext={{ contentType: "overview", subject: "contracts" }}
            sections={[
              { label: "Overview", href: "/" },
              { label: "Surfaces", href: "/contracts" },
              { label: "Runs", href: "/contracts/runs" },
            ]}
            utilities={[
              { label: "GitHub", href: "#github" },
            ]}
            theme="light"
          />
          <main style={{ flex: 1 }}>{children}</main>
        </div>
      </body>
    </html>
  );
}
