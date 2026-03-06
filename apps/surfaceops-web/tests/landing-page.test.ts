import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import Home from "@/app/(overview)/page";

describe("surfaceops landing page", () => {
  it("renders invite-first messaging and hides login CTA copy", () => {
    const html = renderToStaticMarkup(React.createElement(Home));

    expect(html).toContain("Request An Invite");
    expect(html).toContain("Invite-only preview");
    expect(html).not.toContain("radial-gradient");
    expect(html).not.toContain("Log in to view surfaces");
    expect(html).not.toContain(">Login<");
    expect(html.indexOf("data-contract-section=\"landing.hero\"")).toBeLessThan(
      html.indexOf("data-contract-section=\"landing.guidance\""),
    );
    expect(html.indexOf("data-contract-section=\"landing.guidance\"")).toBeLessThan(
      html.indexOf("data-contract-section=\"landing.actions\""),
    );
  });
});
