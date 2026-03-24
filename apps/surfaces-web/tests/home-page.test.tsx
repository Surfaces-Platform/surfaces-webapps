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
  it("renders release updates in the hero and removes the old CTA sections", () => {
    const html = renderToStaticMarkup(React.createElement(Home));
    const releaseUpdatesMatches = html.match(/Get release updates/g) ?? [];

    expect(html).toContain("Get release updates");
    expect(html).toContain("data-testid=\"release-updates-panel\"");
    expect(releaseUpdatesMatches).toHaveLength(1);
    expect(html).not.toContain("See the demos");
    expect(html).not.toContain("Read the philosophy");
    expect(html).not.toContain("Start with Surfaces");
    expect(html).not.toContain("View documentation");
    expect(html).toContain('data-contract-section="landing.actions"');
    expect(html).toContain('aria-hidden="true"');
  });
});
