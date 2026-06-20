import React from "react";
import { readdirSync, readFileSync } from "node:fs";
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
    expect(html).toContain("Wordmark first, compact mark second.");
    expect(html).toContain("Brand primitives and product semantics stay separate.");
    expect(html).toContain("Release notes for the public reference.");
    expect(renderedPages).toHaveLength(navItems.length);
  });

  it("keeps reference navigation and downloads scoped under /design-system", () => {
    expect(navItems[0].href).toBe(designSystemBasePath);
    expect(navItems.slice(1).every((item) => item.href.startsWith(`${designSystemBasePath}/`))).toBe(true);
    expect(resources.every((item) => item.href.startsWith(`${designSystemBasePath}/`))).toBe(true);
    expect(new Set(resources.map((item) => item.href)).size).toBe(resources.length);
  });

  it("keeps logo assets free of secondary tagline text", () => {
    const logoDirectory = "public/design-system/logo";

    for (const fileName of readdirSync(logoDirectory).filter((item) => item.endsWith(".svg"))) {
      const svg = readFileSync(`${logoDirectory}/${fileName}`, "utf8");

      expect(svg).not.toContain("Platform");
      expect(svg).not.toMatch(/\bfield\b/i);
    }
  });

  it("uses optical-size one-color mark assets", () => {
    const primaryMark = readFileSync("public/design-system/logo/surfaces-mark.svg", "utf8");
    const smallMark = readFileSync("public/design-system/logo/surfaces-mark-small.svg", "utf8");

    expect(primaryMark).toContain('fill-rule="evenodd"');
    expect(primaryMark).toContain("M20 16H44V25");
    expect(primaryMark).not.toMatch(/#575757|#B8B8B2/);
    expect(smallMark).toContain('fill-rule="evenodd"');
    expect(smallMark).toContain("M20 19H44V29");
    expect(smallMark).not.toMatch(/#575757|#B8B8B2/);
  });

  it("uses the documented grayscale canon for reference UI chrome", () => {
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
    ];

    for (const color of oldShellColors) {
      expect(css.toLowerCase()).not.toContain(color);
    }

    for (const color of ["#0D0D0D", "#242424", "#575757", "#767676", "#B8B8B2", "#D6D6D0", "#EFEFEC", "#F7F7F4"]) {
      expect(css).toContain(color);
    }
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

  it("adds a homepage navigation link to the design system reference", () => {
    const html = renderToStaticMarkup(<Home />);

    expect(html).toContain('href="/design-system"');
    expect(html).toContain("Design System");
  });
});
