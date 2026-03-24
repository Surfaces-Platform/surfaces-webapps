// @vitest-environment jsdom

import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { ReleaseUpdatesPanel } from "@surfaces/ui/components/ReleaseUpdatesPanel";
import type { ReleaseUpdatesPanelProps } from "@surfaces/ui/components/ReleaseUpdatesPanel";

let container: HTMLDivElement;
let root: Root;

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function getTrigger(): HTMLButtonElement {
  return container.querySelector('[data-testid="release-updates-trigger"]') as HTMLButtonElement;
}

function getForm(): HTMLFormElement | null {
  return container.querySelector('[data-testid="release-updates-form"]');
}

function getStatus(): HTMLElement {
  return container.querySelector('[data-testid="release-updates-status"]') as HTMLElement;
}

function getEmailInput(): HTMLInputElement {
  return container.querySelector('input[name="email"]') as HTMLInputElement;
}

async function renderPanel(props: Partial<ReleaseUpdatesPanelProps> = {}) {
  await act(async () => {
    root.render(
      <ReleaseUpdatesPanel
        buttonLabel="Get release updates"
        idleMessage="Enter your work email and we'll send SurfaceOps desktop alpha announcements, stable promotions, and major rollout updates."
        successMessage="Thanks. We'll send SurfaceOps desktop release updates to this email."
        submitUrl="/api/invite-request"
        {...props}
      />,
    );
  });
}

async function openForm() {
  await act(async () => {
    getTrigger().dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

async function submitForm() {
  const form = getForm();
  if (!form) {
    throw new Error("Expected release updates form to be rendered.");
  }

  await act(async () => {
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await Promise.resolve();
  });
}

async function setEmailValue(value: string) {
  const input = getEmailInput();
  const descriptor = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value");
  await act(async () => {
    descriptor?.set?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

describe("ReleaseUpdatesPanel", () => {
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
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("opens the signup form from the collapsed trigger", async () => {
    await renderPanel();

    expect(getForm()).toBeNull();

    await openForm();

    expect(getForm()).not.toBeNull();
    expect(getStatus().textContent).toContain("Enter your work email");
  });

  it("renders the hero variant with the top-cta pill styling", async () => {
    await renderPanel({ variant: "hero" });

    expect(getTrigger().style.borderRadius).toBe("999px");
    expect(getTrigger().style.minHeight).toBe("46px");

    await openForm();

    expect(getForm()).not.toBeNull();
  });

  it("submits successfully and shows the success message", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ ok: true }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    ));
    vi.stubGlobal("fetch", fetchMock);

    await renderPanel();
    await openForm();
    await setEmailValue("team@example.com");
    await submitForm();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/invite-request",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "team@example.com" }),
      }),
    );
    expect(getStatus().textContent).toContain("Thanks. We'll send SurfaceOps desktop release updates to this email.");
    expect(getEmailInput().value).toBe("");
  });

  it("shows the upstream error message when submission fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ ok: false, error: "Unable to save invite request." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    ));
    vi.stubGlobal("fetch", fetchMock);

    await renderPanel();
    await openForm();
    await setEmailValue("team@example.com");
    await submitForm();

    expect(getStatus().textContent).toContain("Unable to save invite request.");
  });
});
