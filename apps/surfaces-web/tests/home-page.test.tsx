// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import Home from "@/app/page";

const homepageCss = readFileSync(resolve(process.cwd(), "app/homepage.css"), "utf8");
const reviewHref =
  "mailto:hello@surfaces.systems?subject=Request%20a%20workflow%20review&body=Generated%20workflow%20or%20screen%3A%0ADecision%20your%20team%20needs%20to%20make%3A%0AProduct%20rules%20or%20design-system%20source%3A";

function renderHomeDocument() {
  const html = renderToStaticMarkup(React.createElement(Home));
  const template = document.createElement("template");
  template.innerHTML = html;

  return { page: template.content, html };
}

describe("surfaces.systems home page", () => {
  it("renders the visual-first narrative and required contract sections", () => {
    const { page, html } = renderHomeDocument();
    const sectionMarkers = Array.from(
      page.querySelectorAll("[data-contract-section]"),
      (element) => element.getAttribute("data-contract-section"),
    );

    expect(page.querySelector("h1")?.textContent).toBe(
      "AI can generate options. Surfaces helps your team decide what should ship.",
    );
    expect(page.querySelector(".eyebrow")?.textContent?.replace(/\s+/g, " ").trim()).toBe(
      "For design-system and platform teams",
    );
    expect(
      page.querySelector(".hero-lead")?.textContent?.replace(/\s+/g, " ").trim(),
    ).toBe(
      "Compare interface directions, test the strongest one in product context, and use outcomes to decide what moves forward.",
    );
    expect(html).toContain("See one decision end to end");
    expect(html).not.toContain("Turn interface ideas into product evidence.");
    expect(html).not.toContain(
      "Product direction for design-system and platform teams",
    );
    expect(html).toContain("One experiment—from directions to a decision.");
    expect(html).toContain("One continuous design loop.");
    expect(html).toContain(
      "Bring one generated workflow, its product rules, and the decision.",
    );
    expect(html).toContain("/assets/surfaces-slab-environment.webp");
    expect(page.querySelectorAll("h1")).toHaveLength(1);
    expect(page.querySelectorAll('[data-contract="page-container"]')).toHaveLength(1);
    expect(sectionMarkers).toEqual([
      "landing.hero",
      "landing.demos",
      "landing.guidance",
      "landing.actions",
    ]);
    expect(page.querySelectorAll('[href="/design-system"]')).toHaveLength(0);
    expect(page.querySelectorAll("[style]")).toHaveLength(0);
    expect(html).not.toContain("AI can make a screen. Your team decides what belongs.");
    expect(html).not.toContain("Request access");
  });

  it("keeps the decision-break connector on the action surface", () => {
    const { page } = renderHomeDocument();

    expect(
      page.querySelector(
        ".broken-loop > .loop-break + .loop-fragment-muted",
      ),
    ).not.toBeNull();
    expect(homepageCss).toMatch(
      /\.surfaces-homepage \.broken-loop > \.loop-break::after\s*\{\s*background:\s*var\(--sp-ui-action\);\s*\}/,
    );
  });

  it("uses one direct JudgmentKit link and no company dropdown", () => {
    const { page, html } = renderHomeDocument();
    const primaryNav = page.querySelector(
      'header nav[aria-label="Primary navigation"]',
    );

    expect(primaryNav).not.toBeNull();
    expect(page.querySelectorAll('header nav[aria-label="Primary navigation"]')).toHaveLength(
      1,
    );

    const navLinks = Array.from(primaryNav?.querySelectorAll("a") ?? []);
    expect(navLinks.map((link) => link.getAttribute("href"))).toEqual([
      "#example",
      "#product-direction",
      "https://judgmentkit.ai/",
      reviewHref,
    ]);

    const externalLinks = Array.from(page.querySelectorAll("a")).filter((link) =>
      /^https?:\/\//.test(link.getAttribute("href") ?? ""),
    );
    expect(externalLinks).toHaveLength(1);
    expect(externalLinks[0]?.textContent?.trim()).toBe("JudgmentKit.ai");
    expect(externalLinks[0]?.closest("header")).not.toBeNull();
    expect(externalLinks[0]?.getAttribute("target")).toBeNull();
    expect(externalLinks[0]?.getAttribute("rel")).toBeNull();
    expect(externalLinks[0]?.querySelector("svg")).toBeNull();

    const reviewLinks = Array.from(page.querySelectorAll('a[href^="mailto:"]'));
    expect(reviewLinks).toHaveLength(3);
    expect(new Set(reviewLinks.map((link) => link.getAttribute("href")))).toEqual(
      new Set([reviewHref]),
    );
    const heroActions = Array.from(page.querySelectorAll(".hero .action-row a"));
    expect(heroActions.map((link) => link.getAttribute("href"))).toEqual([
      "#example",
      reviewHref,
    ]);
    expect(
      heroActions.map((link) => link.textContent?.replace(/\s+/g, " ").trim()),
    ).toEqual([
      "See one decision end to end",
      "Request a workflow review",
    ]);
    expect(page.querySelectorAll('header [aria-haspopup="menu"]')).toHaveLength(0);
    expect(page.querySelectorAll('header [role="menu"]')).toHaveLength(0);
    expect(page.querySelectorAll('header [role="menuitem"]')).toHaveLength(0);
    expect(page.querySelectorAll("header select")).toHaveLength(0);
    expect(
      page.querySelector(
        'button.menu-button[aria-controls="site-navigation"][aria-expanded="false"]',
      ),
    ).not.toBeNull();
    expect(html).not.toContain("surfaceops.ai");
    expect(html).not.toContain("interfacectl.com");
    expect(html).not.toContain("surfaces.dev");
  });
});
