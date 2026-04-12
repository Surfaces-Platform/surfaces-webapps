// @vitest-environment jsdom

import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import Navigation from "@surfaces/ui/components/Navigation";

let container: HTMLDivElement;
let root: Root;

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function getSystemMenuButton(): HTMLButtonElement {
  const button = Array.from(container.querySelectorAll("button")).find(
    (element) => element.textContent?.includes("surfaces.systems"),
  );
  if (!button) {
    throw new Error("Expected system menu button to be rendered.");
  }
  return button as HTMLButtonElement;
}

async function renderNavigation() {
  await act(async () => {
    root.render(
      <Navigation
        currentSurface="surfaces"
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

async function openSystemMenu() {
  await act(async () => {
    getSystemMenuButton().dispatchEvent(new MouseEvent("click", { bubbles: true }));
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

  it("includes judgmentkit.ai in the shared system dropdown", async () => {
    await renderNavigation();
    await openSystemMenu();

    const judgmentKitLink = getDropdownLink("judgmentkit.ai");

    expect(judgmentKitLink.href).toBe("https://judgmentkit.ai/");
    expect(container.textContent).toContain("Embedded MCP judgment for live design decisions");
  });

  it("keeps first-party surfaces on contextual routing targets", async () => {
    await renderNavigation();
    await openSystemMenu();

    const surfaceOpsLink = getDropdownLink("surfaceops.ai");

    expect(surfaceOpsLink.href).toBe("http://localhost:3001/#overview");
  });
});
