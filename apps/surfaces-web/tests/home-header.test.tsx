// @vitest-environment jsdom

import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import HomeHeader from "@/app/HomeHeader";

let container: HTMLDivElement;
let root: Root;

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

describe("homepage header", () => {
  beforeEach(async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root.render(<HomeHeader />);
    });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    document.body.classList.remove("menu-open");
  });

  it("opens the mobile navigation and closes it with Escape while restoring focus", async () => {
    const button = container.querySelector<HTMLButtonElement>(".menu-button");
    const navigation = container.querySelector<HTMLElement>("#site-navigation");

    expect(button).not.toBeNull();
    expect(navigation).not.toBeNull();
    expect(button?.getAttribute("aria-expanded")).toBe("false");
    expect(navigation?.dataset.open).toBe("false");

    await act(async () => {
      button?.click();
    });

    expect(button?.getAttribute("aria-expanded")).toBe("true");
    expect(navigation?.dataset.open).toBe("true");
    expect(document.body.classList.contains("menu-open")).toBe(true);

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });

    expect(button?.getAttribute("aria-expanded")).toBe("false");
    expect(navigation?.dataset.open).toBe("false");
    expect(document.body.classList.contains("menu-open")).toBe(false);
    expect(document.activeElement).toBe(button);
  });

  it("closes an open mobile menu when the viewport reaches desktop width", async () => {
    const button = container.querySelector<HTMLButtonElement>(".menu-button");

    await act(async () => {
      button?.click();
    });

    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 821,
    });

    await act(async () => {
      window.dispatchEvent(new Event("resize"));
    });

    expect(button?.getAttribute("aria-expanded")).toBe("false");
    expect(document.body.classList.contains("menu-open")).toBe(false);
  });
});
