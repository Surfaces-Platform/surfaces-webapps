import type { Metadata } from "next";
import { ReferencePageView } from "./ReferenceShell";
import { designSystemOrigin, pages } from "./referenceContent";
import { designSystemSocialImage } from "@/lib/brand-metadata";

export const metadata: Metadata = {
  title: "Surfaces Design System",
  description:
    "Simple Slab identity, public-page tokens, and proof-oriented patterns for reviewable generated UI.",
  alternates: {
    canonical: `${designSystemOrigin}/design-system`,
  },
  openGraph: {
    type: "website",
    title: "Surfaces Design System",
    description: "Simple Slab identity, public-page tokens, and generated-screen review patterns.",
    url: `${designSystemOrigin}/design-system`,
    images: [designSystemSocialImage],
  },
  twitter: {
    card: "summary_large_image",
    title: "Surfaces Design System",
    description: "Simple Slab identity, public-page tokens, and generated-screen review patterns.",
    images: [designSystemSocialImage],
  },
};

export default function DesignSystemPage() {
  return <ReferencePageView page={pages.overview} />;
}
