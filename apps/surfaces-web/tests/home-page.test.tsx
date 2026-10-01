// @vitest-environment jsdom

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import Home from "@/app/page";

const homepageCss = readFileSync(resolve(process.cwd(), "app/homepage.css"), "utf8");
const slabAsset = readFileSync(
  resolve(process.cwd(), "public/assets/surfaces-slab-environment.webp"),
);
const openGraphAsset = readFileSync(
  resolve(process.cwd(), "public/assets/surfaces-platform-og.png"),
);
const appIcon = readFileSync(resolve(process.cwd(), "app/icon.svg"));
const homepageContentSource = readFileSync(
  resolve(process.cwd(), "app/homepage-content.html"),
  "utf8",
);
const layoutSource = readFileSync(resolve(process.cwd(), "app/layout.tsx"), "utf8");
const emailSubject = "A recent interface release decision";
const emailBody = [
  "Hi Mike,",
  "",
  "I’d like to compare notes on:",
  "",
  "[ ] AI UX when interfaces can act or decide",
  "[ ] What Human Above The Loop should look like in practice",
  "[ ] Something else:",
].join("\n");
const emailHref = `mailto:mike@surfaces.systems?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;

function sha256(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

function renderHomeDocument() {
  const html = renderToStaticMarkup(React.createElement(Home));
  const template = document.createElement("template");
  template.innerHTML = html;

  return { page: template.content, html };
}

describe("surfaces.systems home page", () => {
  it("leads with the customer outcome and a compact decision-to-guidance story", () => {
    const { page, html } = renderHomeDocument();
    const sectionMarkers = Array.from(
      page.querySelectorAll("[data-contract-section]"),
      (element) => element.getAttribute("data-contract-section"),
    );

    expect(page.querySelector("h1")?.textContent?.replace(/\s+/g, " ").trim()).toBe(
      "Make every release decision reusable.",
    );
    expect(
      page.querySelector(".hero-copy > .eyebrow")?.textContent?.replace(/\s+/g, " ").trim(),
    ).toBe("For design system and platform teams");
    expect(page.querySelector(".hero-copy > .eyebrow + h1")?.id).toBe("hero-title");
    const heroLead = page.querySelector(".hero-lead")?.textContent?.replace(/\s+/g, " ").trim();
    expect(heroLead).toBe(
      "Resolve clear, repeated violations sooner, so senior judgment stays focused on what’s genuinely new or contested.",
    );
    expect(
      page.querySelector("#workload-title")?.textContent?.replace(/\s+/g, " ").trim(),
    ).toBe("The same violation should not require the same review twice.");
    expect(
      Array.from(page.querySelectorAll(".loop-fragment strong"), (heading) =>
        heading.textContent?.trim(),
      ),
    ).toEqual([
      "Context hunting",
      "Re-explaining the decision",
      "Chasing rework",
    ]);
    expect(page.querySelector(".loop-break")).toBeNull();
    expect(html).toContain("Each decision should make the next clear repeat easier to resolve.");
    expect(
      Array.from(page.querySelectorAll(".cycle-card h3"), (heading) => heading.textContent?.trim()),
    ).toEqual(["Assemble context", "Decide", "Propose guidance", "Confirm changes", "Reuse"]);
    expect(html).toContain("Every decision · including no change needed");
    expect(html).toContain("The owner confirms or corrects proposed changes");
    expect(html).toContain("Accepted guidance checks the next candidate");
    expect(html).toContain("Clear repeats use guidance");
    expect(html).toContain("New cases reach the owner");
    expect(html).toContain(
      "Surfaces directs what happens next and delegates the work. Agents execute in the tools your team already uses.",
    );
    expect(html).toContain(
      "Surfaces is an early product hypothesis. We’re testing it with recent interface release decisions.",
    );
    expect(html).toContain("/assets/surfaces-slab-environment.webp");
    expect(page.querySelectorAll("h1")).toHaveLength(1);
    expect(page.querySelectorAll('[data-contract="page-container"]')).toHaveLength(1);
    expect(sectionMarkers).toEqual([
      "landing.hero",
      "landing.workload",
      "landing.guidance",
    ]);
    expect(page.querySelectorAll('[href="/design-system"]')).toHaveLength(0);
    expect(page.querySelectorAll("[style]")).toHaveLength(0);
  });

  it("preserves the production visual system while removing obsolete content structures", () => {
    const { page } = renderHomeDocument();

    expect(page.querySelectorAll(".hero-visual")).toHaveLength(1);
    expect(page.querySelector(".hero-visual figcaption")).toBeNull();
    expect(page.querySelector(".hero-proof-label")).toBeNull();
    expect(page.querySelector(".hero-proof-list")).toBeNull();
    expect(page.querySelectorAll(".broken-loop > li")).toHaveLength(3);
    expect(page.querySelectorAll(".cycle-card")).toHaveLength(5);
    expect(page.querySelectorAll(".example-section")).toHaveLength(0);
    expect(page.querySelectorAll(".experiment-board")).toHaveLength(0);
    expect(page.querySelectorAll(".trust-section")).toHaveLength(0);
    expect(page.querySelectorAll(".proof-section")).toHaveLength(0);
    expect(page.querySelectorAll(".partner-section")).toHaveLength(0);
    expect(sha256(homepageCss)).toBe(
      "3d22d674dc5350896d8da634a4f34996b4ea2743b3a6fb470ed933d3513109db",
    );
    expect(sha256(slabAsset)).toBe(
      "8901f5ad73c5a96aeb10647e98fc9e9f6151bf55152911e948e3be0343e3a64f",
    );
    expect(sha256(openGraphAsset)).toBe(
      "8af4466090468bb17af25e313016b77ea56ffa7b9c1abb0c9a5e751a0d1ce56b",
    );
    expect(sha256(appIcon)).toBe(
      "24f9543c8228d7955505f0a11928b4d29b89fd1f37c8080b301cbbd8be5bf8ca",
    );
  });

  it("pairs the hero actions and links to JudgmentKit MCP after How it works", () => {
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
      "#workload",
      "#product-direction",
      "https://judgmentkit.ai/",
    ]);
    expect(navLinks.map((link) => link.textContent?.trim())).toEqual([
      "The workload",
      "How it works",
      "JudgmentKit MCP",
    ]);

    const heroActions = Array.from(page.querySelectorAll(".hero .action-row a"));
    expect(heroActions.map((link) => link.getAttribute("href"))).toEqual([
      "#product-direction",
      emailHref,
    ]);
    expect(
      heroActions.map((link) => link.textContent?.replace(/\s+/g, " ").trim()),
    ).toEqual(["See how it works", "Share a recent release decision"]);

    const emailLinks = Array.from(page.querySelectorAll('a[href^="mailto:"]'));
    const emailLink = emailLinks[0];
    const hypothesisNote = Array.from(
      page.querySelectorAll("#product-direction .loop-note"),
    ).find(
      (note) => note.textContent?.replace(/\s+/g, " ").trim() ===
        "Surfaces is an early product hypothesis. We’re testing it with recent interface release decisions.",
    );
    const heroActionRow = page.querySelector(".hero .action-row");
    const judgmentKitLink = navLinks[2];
    const mailto = new URL(emailLink?.getAttribute("href") ?? "");

    expect(emailLinks).toHaveLength(1);
    expect(emailLink?.textContent?.replace(/\s+/g, " ").trim()).toBe(
      "Share a recent release decision",
    );
    expect(emailLink?.getAttribute("aria-label")).toBe(
      "Share a recent release decision by email with Mike",
    );
    expect(emailLink?.matches(".button.button-secondary")).toBe(true);
    expect(emailLink?.getAttribute("href")).toBe(emailHref);
    expect(homepageContentSource).toContain(emailHref.replace("&body=", "&amp;body="));
    expect(mailto.protocol).toBe("mailto:");
    expect(mailto.pathname).toBe("mike@surfaces.systems");
    expect(mailto.searchParams.get("subject")).toBe(emailSubject);
    expect(mailto.searchParams.get("body")).toBe(emailBody);
    expect(mailto.searchParams.get("body")).not.toContain("A little context:");
    expect(heroActions[1]).toBe(emailLink);
    expect(heroActionRow?.lastElementChild).toBe(emailLink);
    expect(emailLink?.closest(".hero-copy")).not.toBeNull();
    expect(emailLink?.closest("header")).toBeNull();
    expect(hypothesisNote?.nextElementSibling).toBeNull();
    expect(page.querySelector("#product-direction .loop-action-row")).toBeNull();
    expect(page.querySelector("#product-direction")?.nextElementSibling).toBeNull();
    expect(page.querySelector("main")?.nextElementSibling?.classList.contains("site-footer")).toBe(
      true,
    );
    expect(homepageCss).toMatch(
      /@media \(max-width: 620px\)[\s\S]*?\.surfaces-homepage \.button \{\s*width: 100%;\s*\}/,
    );
    expect(page.querySelectorAll(".nav-action")).toHaveLength(0);
    expect(page.querySelectorAll('a[href^="http"]')).toHaveLength(1);
    expect(judgmentKitLink?.closest("header")).not.toBeNull();
    expect(judgmentKitLink?.getAttribute("target")).toBeNull();
    expect(judgmentKitLink?.getAttribute("rel")).toBeNull();
    expect(judgmentKitLink?.querySelector("svg")).toBeNull();
    expect(homepageContentSource).toContain(
      '<a href="https://judgmentkit.ai/">JudgmentKit MCP</a>',
    );
    expect(page.querySelectorAll('header [aria-haspopup="menu"]')).toHaveLength(0);
    expect(page.querySelectorAll('header [role="menu"]')).toHaveLength(0);
    expect(page.querySelectorAll('header [role="menuitem"]')).toHaveLength(0);
    expect(page.querySelectorAll("header select")).toHaveLength(0);
    expect(
      page.querySelector(
        'button.menu-button[aria-controls="site-navigation"][aria-expanded="false"]',
      ),
    ).not.toBeNull();
    expect(html).not.toContain("JudgmentKit.ai");
    expect(html).not.toContain("Request a workflow review");
  });

  it("shows only the three observable recurring burdens", () => {
    const { page } = renderHomeDocument();

    expect(page.querySelectorAll(".broken-loop > .loop-fragment")).toHaveLength(3);
    expect(
      page.querySelector(".broken-loop > .loop-fragment:nth-child(3):last-child"),
    ).not.toBeNull();
    expect(page.querySelector(".loop-break")).toBeNull();
    expect(homepageCss).toMatch(
      /grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/,
    );
  });

  it("removes retired positioning, internal research operations, and service language", () => {
    const { html } = renderHomeDocument();

    for (const retiredCopy of [
      "AI can generate options. Surfaces helps your team decide what to ship.",
      "For design-system and frontend-platform owners",
      "Illustrative decision model",
      "Product hypothesis</span>",
      "Product hypothesis · not customer evidence",
      "The decision never became reusable guidance",
      "Evidence status",
      "Qualified customer evidence",
      "0 of 4",
      "One internal episode",
      "Customer value: not demonstrated",
      "Discuss a recent decision",
      "Discuss the decision",
      "Surfaces does not execute work",
      "kanban.cards remains the status layer",
      "above the agent work loop",
      "Release admission",
      "admission boundary",
      "governance harness",
      "Decision record",
    ]) {
      expect(html).not.toContain(retiredCopy);
    }
  });

  it("keeps standalone and root metadata inside a concise hypothesis boundary", () => {
    const publicSources = `${homepageContentSource}\n${layoutSource}`;

    expect(publicSources).toContain(
      "Make Every Release Decision Reusable | Surfaces",
    );
    expect(publicSources).toContain("Make every release decision reusable.");
    expect(publicSources).toContain(
      "Surfaces is exploring how decisions about agent-produced UI changes can become reusable guidance, so clear repeat violations can be resolved before senior review.",
    );
    expect(homepageContentSource).toContain('href="https://surfaces.systems/"');
    expect(layoutSource).toContain('canonical: "/"');
    for (const internalCopy of [
      "Qualified customer evidence",
      "0 of 4",
      "above the agent work loop",
      "release admission",
      "Request a workflow review",
    ]) {
      expect(publicSources).not.toContain(internalCopy);
    }
  });
});
