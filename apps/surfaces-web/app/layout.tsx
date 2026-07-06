import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Surfaces Platform - Product decisions for AI-generated UI",
  description:
    "Surfaces keeps the decision behind an AI-generated interface visible before anyone treats the work as ready.",
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
        {children}
      </body>
    </html>
  );
}
