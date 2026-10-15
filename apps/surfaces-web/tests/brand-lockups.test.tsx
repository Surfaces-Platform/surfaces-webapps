// @vitest-environment jsdom

import React from "react";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import HomeBrand from "@/app/HomeBrand";
import { ReferencePageView } from "@/app/design-system/ReferenceShell";
import { pages } from "@/app/design-system/referenceContent";

const directory = "public/design-system/logo";
const archive = "public/design-system/brand-kit/surfaces-brand-kit-v0.2.zip";
const primary = [
  ["surfaces-lockup-horizontal.svg", "32354a8c79fd7a174098fdb05debec61df946149054993dd97e523e28bd68fa6"],
  ["surfaces-lockup-horizontal-reverse.svg", "8174df02add7d2509950fad5c1d6d11492be0538ad12cfa3222f3bc6efac4987"],
] as const;
const read = (name: string) => readFileSync(`${directory}/${name}`, "utf8");
const glyphs = (svg: string) => [...svg.matchAll(/<path d="([^"]+)"/g)].map((match) => match[1]);

describe("canonical Surfaces lockups", () => {
  it.each(primary)("serves the exact approved %s and includes identical archive bytes", (name, expectedHash) => {
    const source = read(name);
    expect(createHash("sha256").update(source).digest("hex")).toBe(expectedHash);
    expect(source).not.toMatch(/<text\b/);
    expect(source).toContain('data-font-family="Inter"');
    expect(source).toContain('data-font-weight="780"');
    expect(source).toContain('data-font-optical-size="32"');
    expect(source).toContain('data-mark-height="60"');
    expect(source).toContain('data-cap-height="38"');
    expect(source).toContain('data-ink-gap="20"');
    expect(source).toContain("#8B9096");
    expect(execFileSync("unzip", ["-p", archive, name], { encoding: "utf8" })).toBe(source);
  });

  it("uses complete reversed artwork in fixed-dark homepage chrome and primary artwork in fixed-light reference chrome", () => {
    const template = document.createElement("template");
    template.innerHTML = renderToStaticMarkup(<HomeBrand />);
    const homepageImage = template.content.querySelector("img");
    expect(homepageImage?.getAttribute("src")).toBe("/design-system/logo/surfaces-lockup-horizontal-reverse.svg");
    expect(homepageImage?.getAttribute("alt")).toBe("");
    expect(template.content.querySelector("svg, text, span")).toBeNull();

    template.innerHTML = renderToStaticMarkup(<ReferencePageView page={pages.overview} />);
    const homeLinks = template.content.querySelectorAll('a[aria-label="Surfaces Design System home"]');
    expect(homeLinks).toHaveLength(2);
    for (const link of homeLinks) {
      expect(link.querySelector("img")?.getAttribute("src")).toBe("/design-system/logo/surfaces-lockup-horizontal.svg");
      expect(link.querySelector("img")?.getAttribute("alt")).toBe("");
      expect(link.querySelectorAll("img")).toHaveLength(1);
      expect(link.textContent?.trim()).toBe("");
    }
  });

  it("keeps all secondary lockups outlined and the archived files aligned with their public sources", () => {
    const expectedGlyphs = glyphs(read(primary[0][0]));
    expect(expectedGlyphs).toHaveLength(8);
    for (const name of readdirSync(directory).filter((file) => file.startsWith("surfaces-lockup-") && file.endsWith(".svg"))) {
      const svg = read(name);
      expect(svg).not.toMatch(/<text\b/);
      expect(glyphs(svg)).toEqual(expectedGlyphs);
      expect(svg).toContain('data-mark-height="60"');
      expect(svg).toContain('data-cap-height="38"');
      if (name.includes("monochrome")) expect(svg).not.toContain("#8B9096");
      else expect(svg).toContain("#8B9096");
      expect(execFileSync("unzip", ["-p", archive, name], { encoding: "utf8" })).toBe(svg);
    }
  });

  it("uses approved outlined glyphs for the standalone wordmark and social-card identity", () => {
    const expectedGlyphs = glyphs(read(primary[0][0]));
    expect(glyphs(read("surfaces-wordmark.svg"))).toEqual(expectedGlyphs);
    const social = read("surfaces-social-card.svg");
    expect(glyphs(social.split('data-role="social-copy"')[0])).toEqual(expectedGlyphs);
    expect(social).not.toMatch(/<text\b[^>]*>Surfaces<\/text>/);
    expect(social).toContain('data-role="canonical-lockup" transform="translate(131.345321573800 162.400000000000) scale(2.8)"');
    expect(social).not.toContain('data-role="social-copy"');
  });
});
