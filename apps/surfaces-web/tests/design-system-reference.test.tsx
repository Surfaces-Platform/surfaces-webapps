import React from "react";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("motion/react", async () => {
  const ReactModule = await import("react");
  const blockedProps = new Set([
    "animate",
    "initial",
    "transition",
    "variants",
    "viewport",
    "whileInView",
  ]);

  return {
    motion: new Proxy({}, {
      get: (_target, tag: string) => {
        return function MockMotionComponent({
          children,
          ...props
        }: React.HTMLAttributes<HTMLElement> & Record<string, unknown>) {
          const filteredProps = Object.fromEntries(
            Object.entries(props).filter(([key]) => !blockedProps.has(key)),
          );
          return ReactModule.createElement(tag, filteredProps, children);
        };
      },
    }),
  };
});

vi.mock("@surfaces/ui/components/Navigation", async () => {
  const ReactModule = await import("react");

  return {
    __esModule: true,
    default: function MockNavigation({
      sections,
    }: {
      sections: Array<{ label: string; href: string }>;
    }) {
      return ReactModule.createElement(
        "nav",
        { "data-testid": "navigation" },
        sections.map((section) =>
          ReactModule.createElement("a", { href: section.href, key: section.href }, section.label),
        ),
      );
    },
  };
});

import Home from "@/app/page";
import { ReferencePageView } from "@/app/design-system/ReferenceShell";
import { brandAssetBase } from "@/lib/brand-metadata";
import {
  designSystemBasePath,
  navItems,
  pages,
  resources,
} from "@/app/design-system/referenceContent";

const leakagePatterns = [
  /\bprompt\b/i,
  /judgmentkit/i,
  /\bmcp\b/i,
  /\btreatment\b/i,
  /\baperture\b/i,
  /\bfield\b/i,
  /\bregister\b/i,
  /\broute\b/i,
  /\bcompetitor\b/i,
  /\bresearch\b/i,
  /\bdeploy(?:ment)?\b/i,
  /local qa/i,
  /\binternal\b/i,
  /\bprocess\b/i,
  /\btool(?:ing|s)?\b/i,
  /\blinear\b/i,
  /\bstripe\b/i,
  /\bretool\b/i,
  /\bpalantir\b/i,
  /\bdatadog\b/i,
  /\bsnowflake\b/i,
  /\bopenai\b/i,
  /\banthropic\b/i,
];

describe("Surfaces Design System reference", () => {
  it("renders the overview and all section pages from typed content", () => {
    const renderedPages = Object.values(pages).map((page) =>
      renderToStaticMarkup(<ReferencePageView page={page} />),
    );
    const html = renderedPages.join("\n");

    expect(html).toContain("Surfaces Design System");
    expect(html).toContain("Use the Simple Slab mark exactly as drawn.");
    expect(html).toContain("Brand primitives and review signals stay separate.");
    expect(html).toContain("Generated screens should carry their rationale.");
    expect(html).toContain("Release notes for the public reference.");
    expect(renderedPages).toHaveLength(navItems.length);
    expect(html).toContain(`src="${brandAssetBase}/favicon-light.svg"`);
    expect(html).not.toContain('src="/design-system/logo/favicon.svg"');
  });

  it("keeps reference navigation and downloads scoped under /design-system", () => {
    expect(navItems[0].href).toBe(designSystemBasePath);
    expect(navItems.slice(1).every((item) => item.href.startsWith(`${designSystemBasePath}/`))).toBe(true);
    expect(resources.every((item) => item.href.startsWith(`${designSystemBasePath}/`))).toBe(true);
    expect(new Set(resources.map((item) => item.href)).size).toBe(resources.length);
    expect(resources.some((item) => item.href.endsWith("surfaces-brand-kit-v0.2.zip"))).toBe(true);
    expect(resources.every((item) => !item.href.endsWith("surfaces-brand-kit-v1.0.zip"))).toBe(true);
  });

  it("keeps every published resource href backed by a public file", () => {
    for (const resource of resources) {
      const publicPath = resource.href.replace("/design-system/", "public/design-system/");

      expect(existsSync(publicPath), `${resource.title} should exist at ${publicPath}`).toBe(true);
    }
  });

  it("keeps the brand kit version and contents aligned with public files", () => {
    const kitPath = "public/design-system/brand-kit/surfaces-brand-kit-v0.2.zip";
    const listing = execFileSync("unzip", ["-l", kitPath], { encoding: "utf8" });
    const mark = execFileSync("unzip", ["-p", kitPath, "surfaces-mark.svg"], { encoding: "utf8" });
    const readme = execFileSync("unzip", ["-p", kitPath, "README.txt"], { encoding: "utf8" });
    const zippedBrandTokens = execFileSync("unzip", ["-p", kitPath, "surfaces.tokens.json"], { encoding: "utf8" });

    expect(existsSync(kitPath)).toBe(true);
    expect(existsSync("public/design-system/brand-kit/surfaces-brand-kit-v1.0.zip")).toBe(false);
    expect(listing).toContain("surfaces.tokens.json");
    expect(listing).toContain("surfaces.product.tokens.json");
    expect(readme).toContain("Version 0.2.0");
    expect(readme).not.toMatch(/\/Users\/|SurfacesBrand/);
    expect(zippedBrandTokens).not.toMatch(/\/Users\/|SurfacesBrand/);
    expect(mark).toContain('points="14,14 50,6 50,19 14,27"');
    expect(mark).toContain("#0B0D0E");
  });

  it("keeps logo assets free of secondary tagline text", () => {
    const logoDirectory = "public/design-system/logo";

    for (const fileName of readdirSync(logoDirectory).filter((item) => item.endsWith(".svg"))) {
      const svg = readFileSync(`${logoDirectory}/${fileName}`, "utf8");

      expect(svg).not.toContain("Platform");
      expect(svg).not.toMatch(/\bfield\b/i);
      expect(svg).not.toContain("M16 8H48");
      expect(svg).not.toContain("clip-rule");
    }
  });

  it("uses the active Simple Slab geometry for mark assets", () => {
    const primaryMark = readFileSync("public/design-system/logo/surfaces-mark.svg", "utf8");
    const smallMark = readFileSync("public/design-system/logo/surfaces-mark-small.svg", "utf8");
    const favicon = readFileSync("public/design-system/logo/favicon.svg", "utf8");
    const expectedPolygons = [
      "14,14 50,6 50,19 14,27",
      "10,29 50,29 50,40 10,40",
      "14,43 50,51 50,58 14,50",
    ];

    for (const polygon of expectedPolygons) {
      expect(primaryMark).toContain(`points="${polygon}"`);
      expect(smallMark).toContain(`points="${polygon}"`);
      expect(favicon).toContain(`points="${polygon}"`);
    }

    expect(primaryMark).toContain("#0B0D0E");
    expect(primaryMark).toContain("#8B9096");
    expect(primaryMark).not.toMatch(/#575757|#B8B8B2|#0D0D0D|M16 8H48/);
  });

  it("uses the documented Simple Slab canon for reference UI chrome", () => {
    const css = readFileSync("app/design-system/reference.module.css", "utf8");
    const oldShellColors = [
      "#0f172a",
      "#1e293b",
      "#475569",
      "#64748b",
      "#94a3b8",
      "#cbd5e1",
      "#f1f5f9",
      "#f8fafc",
      "#1d4ed8",
      "#0D0D0D",
      "#242424",
      "#575757",
      "#767676",
      "#B8B8B2",
      "#D6D6D0",
      "#EFEFEC",
      "#F7F7F4",
    ];

    for (const color of oldShellColors) {
      expect(css.toLowerCase()).not.toContain(color.toLowerCase());
    }

    for (const color of ["#0B0D0E", "#F7F6F2", "#8B9096", "#DAD7CF", "#3C4145", "#555B60"]) {
      expect(css).toContain(color);
    }
  });

  it("publishes token files from the active Simple Slab system", () => {
    const brandTokens = readFileSync("public/design-system/tokens/surfaces.tokens.json", "utf8");
    const productTokens = readFileSync("public/design-system/tokens/surfaces.product.tokens.json", "utf8");
    const cssTokens = readFileSync("public/design-system/tokens/surfaces.css", "utf8");

    for (const content of [brandTokens, productTokens, cssTokens]) {
      expect(content).toContain("#0B0D0E");
      expect(content).toContain("#F7F6F2");
      expect(content).toContain("#DAD7CF");
      expect(content).not.toMatch(/#0D0D0D|#F7F7F4|#B8B8B2|#D6D6D0/);
    }

    expect(brandTokens).toContain("Simple Slab");
    expect(cssTokens).toContain("--sp-color-proof: #00A7C8");
  });

  it("only renders the top hero specimen on the identity page", () => {
    expect(renderToStaticMarkup(<ReferencePageView page={pages.identity} />)).toContain(
      'aria-label="Identity specimen"',
    );

    for (const page of Object.values(pages).filter((item) => item.slug !== "overview" && item.slug !== "identity")) {
      const html = renderToStaticMarkup(<ReferencePageView page={page} />);

      expect(html).not.toContain(`aria-label="${page.label} specimen"`);
    }
  });

  it("does not render public leakage terms in reference pages", () => {
    const html = Object.values(pages)
      .map((page) => renderToStaticMarkup(<ReferencePageView page={page} />))
      .join("\n");

    for (const pattern of leakagePatterns) {
      expect(html).not.toMatch(pattern);
    }
  });

  it("does not expose the design system reference in homepage navigation", () => {
    const html = renderToStaticMarkup(<Home />);

    expect(html).not.toContain('href="/design-system"');
    expect(html).not.toContain("Design System");
  });
});
