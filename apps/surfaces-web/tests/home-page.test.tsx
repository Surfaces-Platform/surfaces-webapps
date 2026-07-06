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
    default: function MockNavigation() {
      return ReactModule.createElement("nav", { "data-testid": "navigation" });
    },
  };
});

import Home from "@/app/page";

describe("surfaces.systems home page", () => {
  it("renders the 12B landing page with required contract sections", () => {
    const html = renderToStaticMarkup(React.createElement(Home));

    expect(html).toContain("AI can make a screen. Your team decides what belongs.");
    expect(html).toContain("Looks right is the dangerous part.");
    expect(html).toContain("The few questions that change the outcome.");
    expect(html).toContain("Make the next generated screen easier to review.");
    expect(html).toContain("Request access");
    expect(html).toContain("b2b-renewal-unguided.png");
    expect(html).toContain("b2b-renewal-guided.png");
    expect(html).toContain('data-contract-section="landing.hero"');
    expect(html).toContain('data-contract-section="landing.demos"');
    expect(html).toContain('data-contract-section="landing.guidance"');
    expect(html).toContain('data-contract-section="landing.actions"');
    expect(html).toContain('data-contract="page-container"');
    expect(html).not.toContain("Get release updates");
    expect(html).not.toContain("Canonical source of interface truth");
    expect(html).not.toContain("Proof check");
    expect(html).not.toContain("CI-style check");
    expect(html).not.toContain("See the demos");
    expect(html).not.toContain("Read the philosophy");
    expect(html).not.toContain("Start with Surfaces");
    expect(html).not.toContain("View documentation");
  });
});
