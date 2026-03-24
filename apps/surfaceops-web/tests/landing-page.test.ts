import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import Home from "@/app/(overview)/page";

describe("surfaceops landing page", () => {
  it("renders the desktop-product positioning with release updates in the hero", () => {
    const html = renderToStaticMarkup(React.createElement(Home));
    const heroIndex = html.indexOf('data-contract-section="landing.hero"');
    const whyDesktopIndex = html.indexOf('data-contract-section="landing.whydesktop"');
    const workbenchIndex = html.indexOf('data-contract-section="landing.workbench"');
    const nextIndex = html.indexOf('data-contract-section="landing.next"');
    const releaseUpdatesIndex = html.indexOf("Get release updates");

    expect(html).toContain("Public alpha");
    expect(html).toContain("Shape interface contracts locally, then ship with less drift.");
    expect(html).toContain("Get release updates");
    expect(html).toContain("Why move SurfaceOps to desktop");
    expect(html).not.toContain("radial-gradient");
    expect(html).not.toContain("Log in to view surfaces");
    expect(html).not.toContain("Request An Invite");
    expect(html).not.toContain("Download Public Alpha");
    expect(html).not.toContain("Read Release Notes");
    expect(html).not.toContain("Open Local Workbench");
    expect(heroIndex).toBeLessThan(whyDesktopIndex);
    expect(whyDesktopIndex).toBeLessThan(workbenchIndex);
    expect(workbenchIndex).toBeLessThan(nextIndex);
    expect(heroIndex).toBeLessThan(releaseUpdatesIndex);
    expect(releaseUpdatesIndex).toBeLessThan(whyDesktopIndex);
  });
});
