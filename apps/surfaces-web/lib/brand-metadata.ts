import type { Metadata } from "next";
import brandContract from "@/brand-source/contract.json";

export const brandRevision = brandContract.revision;
export const brandAssetBase = `/brand/${brandRevision}`;
export const brandManifest = `/site.webmanifest?v=${brandRevision}`;

export const brandIcons: Metadata["icons"] = {
  icon: [
    { url: `${brandAssetBase}/favicon.ico`, sizes: "16x16 32x32 48x48", type: "image/x-icon" },
    ...(["light", "dark"] as const).flatMap((theme) => [
      ...([16, 32] as const).map((size) => ({
        url: `${brandAssetBase}/favicon-${theme}-${size}.png`,
        sizes: `${size}x${size}`,
        type: "image/png",
        media: `(prefers-color-scheme: ${theme})`,
      })),
      {
        url: `${brandAssetBase}/favicon-${theme}.svg`,
        sizes: "any",
        type: "image/svg+xml",
        media: `(prefers-color-scheme: ${theme})`,
      },
    ]),
  ],
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
