// @vitest-environment jsdom

import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import Navigation from "@surfaces/ui/components/Navigation";
import type { NavigationSurfaceId } from "@surfaces/ui/components/Navigation";

let container: HTMLDivElement;
let root: Root;

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function getSystemMenuButton(label = "surfaces.systems"): HTMLButtonElement {
  const button = Array.from(container.querySelectorAll("button")).find(
    (element) => element.textContent?.includes(label),
  );
  if (!button) {
    throw new Error("Expected system menu button to be rendered.");
  }
  return button as HTMLButtonElement;
}

async function renderNavigation(currentSurface: NavigationSurfaceId = "surfaces") {
  await act(async () => {
    root.render(
      <Navigation
        currentSurface={currentSurface}
        currentContext={{ contentType: "concepts", subject: "contracts" }}
        sections={[
          { label: "Philosophy", href: "#philosophy" },
          { label: "System", href: "#system" },
        ]}
        theme="light"
      />,
    );
  });
}

async function openSystemMenu(label?: string) {
  await act(async () => {
    getSystemMenuButton(label).dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

function getDropdownLink(label: string): HTMLAnchorElement {
  const link = Array.from(container.querySelectorAll("a")).find(
    (element) => element.textContent?.includes(label),
  );
  if (!link) {
    throw new Error(`Expected dropdown link for ${label}.`);
  }
  return link as HTMLAnchorElement;
}

describe("Navigation", () => {
  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it("includes judgmentkit.ai as a same-tab shared system dropdown item", async () => {
    await renderNavigation();
    await openSystemMenu();

    const judgmentKitLink = getDropdownLink("judgmentkit.ai");

    expect(judgmentKitLink.href).toBe("http://localhost:3004/");
    expect(judgmentKitLink.getAttribute("target")).toBeNull();
    expect(judgmentKitLink.getAttribute("rel")).toBeNull();
    expect(judgmentKitLink.querySelector("svg")).toBeNull();
    expect(container.textContent).toContain("Embedded MCP judgment for live design decisions");
  });

  it("marks judgmentkit.ai active when JudgmentKit renders the shared navigation", async () => {
    await renderNavigation("judgmentkit");
    await openSystemMenu("judgmentkit.ai");

    const judgmentKitLink = getDropdownLink("judgmentkit.ai");

    expect(getSystemMenuButton("judgmentkit.ai").textContent).toContain("judgmentkit.ai");
    expect(judgmentKitLink.getAttribute("aria-current")).toBe("page");
    expect(judgmentKitLink.href).toBe("http://localhost:3004/");
    expect(judgmentKitLink.getAttribute("target")).toBeNull();
    expect(judgmentKitLink.getAttribute("rel")).toBeNull();
  });

  it("keeps first-party surfaces on contextual routing targets", async () => {
    await renderNavigation();
    await openSystemMenu();

    const surfaceOpsLink = getDropdownLink("surfaceops.ai");

    expect(surfaceOpsLink.href).toBe("http://localhost:3001/#overview");
  });

  it("routes from judgmentkit.ai back to Surfaces sites in the same tab", async () => {
    await renderNavigation("judgmentkit");
    await openSystemMenu("judgmentkit.ai");

    const surfacesLink = getDropdownLink("surfaces.systems");

    expect(surfacesLink.href).toBe("http://localhost:3000/");
    expect(surfacesLink.getAttribute("target")).toBeNull();
    expect(surfacesLink.getAttribute("rel")).toBeNull();
  });
});
