import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://surfaces.systems"),
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
    images: [
      {
        url: "/assets/surfaces-platform-og.png",
        width: 1280,
        height: 720,
        alt: "Surfaces",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Make every release decision reusable.",
    description:
      "Turn decisions about agent-produced UI changes into guidance that can resolve clear repeat violations before senior review.",
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
