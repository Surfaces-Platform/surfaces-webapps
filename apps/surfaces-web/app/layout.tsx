import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://surfaces.systems"),
  title: "Decide Which AI-Generated Interface Should Ship | Surfaces Platform",
  description:
    "Compare AI-generated interface directions, test selected variants in product context, and use outcomes to decide what should move forward.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: "Surfaces Platform",
    title: "AI can generate options. Surfaces helps your team decide what to ship.",
    description:
      "Compare AI-generated interface directions, test selected variants in product context, and use outcomes to decide what should move forward.",
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
    title: "AI can generate options. Surfaces helps your team decide what to ship.",
    description:
      "Compare AI-generated interface directions, test selected variants in product context, and use outcomes to decide what should move forward.",
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
