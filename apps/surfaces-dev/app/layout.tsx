import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "surfaces.dev - Developer documentation for Surfaces",
  description: "surfaces.dev is the developer interface for Surfaces: docs, specs, schemas, examples, and CLI semantics.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className="antialiased"
        style={{ fontFamily: 'JetBrains Mono, monospace' }}
      >
        {children}
      </body>
    </html>
  );
}
