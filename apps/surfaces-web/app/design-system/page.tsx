import type { Metadata } from "next";
import { ReferencePageView } from "./ReferenceShell";
import { assetBasePath, designSystemOrigin, pages } from "./referenceContent";

export const metadata: Metadata = {
  title: "Surfaces Design System",
  description:
    "Identity, product tokens, patterns, resources, and implementation guidance for building with Surfaces.",
  alternates: {
    canonical: `${designSystemOrigin}/design-system`,
  },
  openGraph: {
    type: "website",
    title: "Surfaces Design System",
    description: "Identity, product tokens, patterns, and resources for building with Surfaces.",
    url: `${designSystemOrigin}/design-system`,
    images: [`${designSystemOrigin}${assetBasePath}/logo/surfaces-social-card.svg`],
  },
  twitter: {
    card: "summary_large_image",
    title: "Surfaces Design System",
    description: "Identity, product tokens, patterns, and resources for building with Surfaces.",
    images: [`${designSystemOrigin}${assetBasePath}/logo/surfaces-social-card.svg`],
  },
};

export default function DesignSystemPage() {
  return <ReferencePageView page={pages.overview} />;
}
