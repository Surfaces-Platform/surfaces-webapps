import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Navigation from "@surfaces/ui/components/Navigation";
import { resolveSurfaceOpsRootChrome } from "@/lib/root-layout";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "SurfaceOps - Desktop contract shaping for designers",
  description: "SurfaceOps is a local desktop workbench for shaping interface contracts with fast local feedback, open models, and a thin hosted control surface.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { navigation } = resolveSurfaceOpsRootChrome();

  return (
    <html lang="en">
      <body
        className={`${inter.variable} antialiased font-sans`}
        style={{ fontFamily: 'var(--font-inter), Inter, sans-serif' }}
      >
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
          {navigation ? (
            <Navigation
              currentSurface="surfaceops"
              currentContext={navigation.currentContext}
              sections={navigation.sections}
              utilities={navigation.utilities}
              theme="light"
            />
          ) : null}
          <main style={{ flex: 1 }}>{children}</main>
        </div>
      </body>
    </html>
  );
}
