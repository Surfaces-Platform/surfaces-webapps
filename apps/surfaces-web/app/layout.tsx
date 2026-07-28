import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://surfaces.systems"),
  title: "Turn Interface Ideas Into Product Evidence | Surfaces Platform",
  description:
    "Explore the Surfaces product direction for turning interface ideas into product evidence, and request a guided review of one generated workflow.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: "Surfaces Platform",
    title: "Turn interface ideas into product evidence.",
    description:
      "Explore the Surfaces product direction for turning interface ideas into product evidence, and request a guided review of one generated workflow.",
    url: "/",
    images: [
      {
        url: "/assets/surfaces-platform-og.png",
        width: 1280,
        height: 720,
        alt: "Surfaces Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Turn interface ideas into product evidence.",
    description:
      "Explore the Surfaces product direction for turning interface ideas into product evidence, and request a guided review of one generated workflow.",
    images: ["/assets/surfaces-platform-og.png"],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7F6F2" },
    { media: "(prefers-color-scheme: dark)", color: "#0B0D0E" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased font-sans`}>{children}</body>
    </html>
  );
}
