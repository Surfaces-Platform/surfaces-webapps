import React from "react";
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
