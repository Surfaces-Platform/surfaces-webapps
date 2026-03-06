import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import Home from "@/app/(overview)/page";

describe("surfaceops landing page", () => {
  it("renders invite-first messaging and hides login CTA copy", () => {
    const html = renderToStaticMarkup(React.createElement(Home));
    const heroIndex = html.indexOf('data-contract-section="landing.hero"');
    const guidanceIndex = html.indexOf('data-contract-section="landing.guidance"');
    const actionsIndex = html.indexOf('data-contract-section="landing.actions"');
    const inviteButtonIndex = html.indexOf("Request An Invite");

    expect(html).toContain("Request An Invite");
    expect(html).toContain("Invite-only preview");
    expect(html).toContain("What happens next");
    expect(html).not.toContain("radial-gradient");
    expect(html).not.toContain("Log in to view surfaces");
    expect(html).not.toContain(">Login<");
    expect(heroIndex).toBeLessThan(guidanceIndex);
    expect(guidanceIndex).toBeLessThan(actionsIndex);
    expect(heroIndex).toBeLessThan(inviteButtonIndex);
    expect(inviteButtonIndex).toBeLessThan(guidanceIndex);
  });
});
