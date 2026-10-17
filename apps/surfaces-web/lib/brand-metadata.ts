import type { Metadata } from "next";
import brandContract from "@/brand-source/contract.json";

export const brandRevision = brandContract.revision;
export const brandAssetBase = `/brand/${brandRevision}`;
export const brandManifest = `/site.webmanifest?v=${brandRevision}`;

export const brandIcons: Metadata["icons"] = {
  apple: [{ url: `${brandAssetBase}/apple-touch-icon-180.png`, sizes: "180x180", type: "image/png" }],
};

export const homeSocialImage = {
  url: `${brandAssetBase}/surfaces-social.png`,
  width: 1200,
  height: 630,
  type: "image/png",
  alt: "Surfaces",
};

export const designSystemSocialImage = {
  ...homeSocialImage,
};

// Keep inherited sharing fields when a public page overrides its title.
export function publicPageTitleMetadata(title: string): Metadata {
  const description =
    "Surfaces is testing how prior decisions can guide later UI reviews, with an owner confirming or correcting proposed guidance.";

  return {
    title,
    description,
    openGraph: {
      type: "website",
      siteName: "Surfaces",
      title,
      description,
      url: "/",
      images: [homeSocialImage],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [homeSocialImage],
    },
  };
}
