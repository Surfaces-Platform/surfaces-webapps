import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "surfaces.dev - Contract Enforcement Quick Starts",
  description: "Generation, integration, and runtime quick starts for enforcing the Surfaces web contract with AI UI tools.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${jetbrainsMono.variable} antialiased`}
        style={{ fontFamily: 'var(--font-geist-mono), JetBrains Mono, monospace' }}
      >
        {children}
      </body>
    </html>
  );
}
