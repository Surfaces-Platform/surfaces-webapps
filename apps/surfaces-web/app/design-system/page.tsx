import type { Metadata } from "next";
import { ReferencePageView } from "./ReferenceShell";
import { assetBasePath, designSystemOrigin, pages } from "./referenceContent";

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
    images: [`${designSystemOrigin}${assetBasePath}/logo/surfaces-social-card.svg`],
  },
  twitter: {
    card: "summary_large_image",
    title: "Surfaces Design System",
    description: "Simple Slab identity, public-page tokens, and generated-screen review patterns.",
    images: [`${designSystemOrigin}${assetBasePath}/logo/surfaces-social-card.svg`],
  },
};

export default function DesignSystemPage() {
  return <ReferencePageView page={pages.overview} />;
}
