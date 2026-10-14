import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { brandAssetBase, brandIcons, brandManifest, homeSocialImage } from "@/lib/brand-metadata";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://surfaces.systems"),
  applicationName: "Surfaces",
  appleWebApp: { capable: true, title: "Surfaces", statusBarStyle: "black-translucent" },
  icons: brandIcons,
  manifest: brandManifest,
  title: "Make Every Release Decision Reusable | Surfaces",
  description:
    "Surfaces is exploring how decisions about agent-produced UI changes can become reusable guidance, so clear repeat violations can be resolved before senior review.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: "Surfaces",
    title: "Make every release decision reusable.",
    description:
      "Turn decisions about agent-produced UI changes into guidance that can resolve clear repeat violations before senior review.",
    url: "/",
    images: [homeSocialImage],
  },
  twitter: {
    card: "summary_large_image",
    title: "Make every release decision reusable.",
    description:
      "Turn decisions about agent-produced UI changes into guidance that can resolve clear repeat violations before senior review.",
    images: [homeSocialImage],
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
      <head>
        <link rel="mask-icon" href={`${brandAssetBase}/pinned-tab.svg`} color="#0B0D0E" />
      </head>
      <body className={`${inter.variable} antialiased font-sans`}>{children}</body>
    </html>
  );
}
