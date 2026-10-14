import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReferencePageView } from "../ReferenceShell";
import {
  designSystemBasePath,
  designSystemOrigin,
  getPage,
  navItems,
} from "../referenceContent";
import { designSystemSocialImage } from "@/lib/brand-metadata";

interface SectionPageProps {
  params: Promise<{
    section: string;
  }>;
}

export function generateStaticParams() {
  return navItems
    .filter((item) => item.slug !== "overview")
    .map((item) => ({ section: item.slug }));
}

export async function generateMetadata({ params }: SectionPageProps): Promise<Metadata> {
  const { section } = await params;
  const page = getPage(section);

  if (!page || page.slug === "overview") {
    return {};
  }

  const title = `${page.label} - Surfaces Design System`;
  const url = `${designSystemOrigin}${designSystemBasePath}/${page.slug}`;

  return {
    title,
    description: page.description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      type: "website",
      title,
      description: page.description,
      url,
      images: [designSystemSocialImage],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: page.description,
      images: [designSystemSocialImage],
    },
  };
}

export default async function DesignSystemSectionPage({ params }: SectionPageProps) {
  const { section } = await params;
  const page = getPage(section);

  if (!page || page.slug === "overview") {
    notFound();
  }

  return <ReferencePageView page={page} />;
}
