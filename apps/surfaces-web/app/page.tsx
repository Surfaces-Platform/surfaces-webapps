import { readFileSync } from "node:fs";
import path from "node:path";
import Link from "next/link";
import HomeHeader from "./HomeHeader";
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
  example: extractInnerMarkup("section", 'id="example"'),
  problem: extractInnerMarkup("section", 'class="problem-section"'),
  productDirection: extractInnerMarkup("section", 'id="product-direction"'),
  trust: extractInnerMarkup("section", 'class="trust-section"'),
  proof: extractInnerMarkup("section", 'id="proof"'),
  designPartner: extractInnerMarkup("section", 'id="design-partner"'),
} as const;

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Surfaces Platform",
  url: "https://surfaces.systems/",
  description:
    "Surfaces helps design-system and platform teams compare AI-generated interface directions, test them in product context, and decide what should ship.",
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
          id="example"
          className="example-section"
          aria-labelledby="example-title"
          data-contract-section="landing.demos"
          dangerouslySetInnerHTML={{ __html: markup.example }}
        />

        <section
          className="problem-section"
          dangerouslySetInnerHTML={{ __html: markup.problem }}
        />

        <section
          id="product-direction"
          className="loop-section shell"
          aria-labelledby="product-direction-title"
          data-contract-section="landing.guidance"
          dangerouslySetInnerHTML={{ __html: markup.productDirection }}
        />

        <section
          className="trust-section"
          aria-labelledby="trust-title"
          dangerouslySetInnerHTML={{ __html: markup.trust }}
        />

        <section
          id="proof"
          className="proof-section shell"
          aria-labelledby="proof-title"
          dangerouslySetInnerHTML={{ __html: markup.proof }}
        />

        <section
          id="design-partner"
          className="partner-section"
          aria-labelledby="design-partner-title"
          data-contract-section="landing.actions"
          dangerouslySetInnerHTML={{ __html: markup.designPartner }}
        />
      </main>

      <footer className="site-footer">
        <div className="shell footer-inner">
          <Link
            className="brand footer-brand"
            href="/"
            aria-label="Surfaces Platform home"
          >
            <svg
              className="brand-mark brand-mark-reversed"
              viewBox="0 0 64 64"
              aria-hidden="true"
            >
              <polygon points="14,14 50,6 50,19 14,27" />
              <polygon points="10,29 50,29 50,40 10,40" />
              <polygon
                className="brand-mark-muted"
                points="14,43 50,51 50,58 14,50"
              />
            </svg>
            <span>Surfaces</span>
          </Link>
          <p>AI-native interface experimentation.</p>
          <p>© {new Date().getFullYear()} Surfaces Platform</p>
        </div>
      </footer>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
    </div>
  );
}
