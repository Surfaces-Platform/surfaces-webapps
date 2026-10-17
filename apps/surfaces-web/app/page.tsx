import { readFileSync } from "node:fs";
import path from "node:path";
import Link from "next/link";
import HomeHeader from "./HomeHeader";
import HomeBrand from "./HomeBrand";
import "./homepage.css";

const appRoot = process.cwd().endsWith(path.join("apps", "surfaces-web"))
  ? process.cwd()
  : path.join(process.cwd(), "apps", "surfaces-web");

const homepageDocument = readFileSync(
  path.join(appRoot, "app", "homepage-content.html"),
  "utf8",
);

function extractInnerMarkup(tagName: string, marker: string) {
  const markerIndex = homepageDocument.indexOf(marker);
  const openingTagIndex = homepageDocument.lastIndexOf(`<${tagName}`, markerIndex);
  const innerStartIndex = homepageDocument.indexOf(">", markerIndex) + 1;
  const innerEndIndex = homepageDocument.indexOf(`</${tagName}>`, innerStartIndex);

  if (
    markerIndex === -1 ||
    openingTagIndex === -1 ||
    innerStartIndex === 0 ||
    innerEndIndex === -1
  ) {
    throw new Error(`Could not extract ${tagName} marked by ${marker}.`);
  }

  return homepageDocument.slice(innerStartIndex, innerEndIndex);
}

const markup = {
  hero: extractInnerMarkup("section", 'class="hero"'),
  workload: extractInnerMarkup("section", 'id="workload"'),
  productDirection: extractInnerMarkup("section", 'id="product-direction"'),
} as const;

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Surfaces",
  url: "https://surfaces.systems/",
  description:
    "Surfaces is testing how prior decisions can guide later UI reviews, with an owner confirming or correcting proposed guidance.",
};

export default function Home() {
  return (
    <div className="surfaces-homepage">
      <a className="skip-link" href="#main">
        Skip to main content
      </a>

      <HomeHeader />

      <main id="main" data-contract="page-container">
        <section
          className="hero"
          aria-labelledby="hero-title"
          data-contract-section="landing.hero"
          dangerouslySetInnerHTML={{ __html: markup.hero }}
        />

        <section
          id="workload"
          className="problem-section"
          aria-labelledby="workload-title"
          data-contract-section="landing.workload"
          dangerouslySetInnerHTML={{ __html: markup.workload }}
        />

        <section
          id="product-direction"
          className="loop-section shell"
          aria-labelledby="product-direction-title"
          data-contract-section="landing.guidance"
          dangerouslySetInnerHTML={{ __html: markup.productDirection }}
        />

      </main>

      <footer className="site-footer">
        <div className="shell footer-inner">
          <Link
            className="brand footer-brand"
            href="/"
            aria-label="Surfaces home"
          >
            <HomeBrand />
          </Link>
          <p>UI review decisions and proposed guidance.</p>
          <p>© {new Date().getFullYear()} Surfaces</p>
        </div>
      </footer>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
    </div>
  );
}
