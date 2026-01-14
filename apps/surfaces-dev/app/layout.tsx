import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

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
      <body
        className={`${jetbrainsMono.variable} antialiased font-mono`}
        style={{ fontFamily: 'var(--font-geist-mono), JetBrains Mono, monospace' }}
      >
        {children}
      </body>
    </html>
  );
}
