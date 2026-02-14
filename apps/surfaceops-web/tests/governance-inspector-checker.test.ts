import { describe, expect, it } from "vitest";
import { makeDefaultContract } from "@/app/contracts/governance/_lib/default-contract";
import { runInspectorChecks } from "@/app/contracts/governance/inspector/_lib/checker";
import { INSPECTOR_CHANNEL, INSPECTOR_VERSION, isInspectorMessage } from "@/app/contracts/governance/inspector/_lib/protocol";

describe("governance inspector checker", () => {
  it("flags missing required page container and header", () => {
    const contract = makeDefaultContract("app");
    const violations = runInspectorChecks({
      contractDraft: contract,
      domSnapshot: {
        capturedAt: "2026-02-13T00:00:00.000Z",
        nodes: [],
      },
      requiredSections: [],
    });
    expect(violations.some((entry) => entry.rulePath === "layout.requirePageContainer")).toBe(true);
    expect(violations.some((entry) => entry.rulePath === "layout.requireGlobalHeader")).toBe(true);
  });

  it("flags duplicate navigation and depth overflow", () => {
    const contract = makeDefaultContract("app");
    const violations = runInspectorChecks({
      contractDraft: contract,
      domSnapshot: {
        capturedAt: "2026-02-13T00:00:00.000Z",
        nodes: [
          {
            nodeId: "nav-1",
            tagName: "nav",
            label: "Primary nav",
            rect: { top: 0, left: 0, width: 100, height: 40 },
            attributes: {},
            style: { inline: "", navDepth: 4 },
          },
          {
            nodeId: "nav-2",
            tagName: "nav",
            label: "Secondary nav",
            rect: { top: 40, left: 0, width: 100, height: 40 },
            attributes: {},
            style: { inline: "", navDepth: 1 },
          },
        ],
      },
      requiredSections: [],
    });
    expect(
      violations.some((entry) => entry.rulePath === "navigation.disallowDuplicateNavigation"),
    ).toBe(true);
    expect(violations.some((entry) => entry.rulePath === "navigation.maxDepth")).toBe(true);
  });

  it("flags raw color inline styles when design tokens are required", () => {
    const contract = makeDefaultContract("app");
    const violations = runInspectorChecks({
      contractDraft: contract,
      domSnapshot: {
        capturedAt: "2026-02-13T00:00:00.000Z",
        nodes: [
          {
            nodeId: "section-1",
            tagName: "section",
            label: "Hero",
            rect: { top: 0, left: 0, width: 400, height: 160 },
            attributes: { style: "color: #ff0000;" },
            style: { inline: "color: #ff0000;" },
          },
        ],
      },
      requiredSections: [],
    });
    expect(violations.some((entry) => entry.rulePath === "generation.mustUseDesignTokens")).toBe(true);
  });
});

describe("inspector protocol", () => {
  it("validates message channel and version", () => {
    expect(
      isInspectorMessage({
        channel: INSPECTOR_CHANNEL,
        version: INSPECTOR_VERSION,
        type: "INSPECTOR_READY",
      }),
    ).toBe(true);
    expect(
      isInspectorMessage({
        channel: "wrong",
        version: INSPECTOR_VERSION,
        type: "INSPECTOR_READY",
      }),
    ).toBe(false);
  });
});

describe("inspector route URL state", () => {
  it("keeps absolute route URL from query", async () => {
    const { readInspectorUrlState } = await import(
      "@/app/contracts/governance/inspector/_lib/url-state"
    );
    const state = readInspectorUrlState({
      prototype: "p0004",
      snapshot: "abc",
      route: "https://example.com/surface",
    });
    expect(state.route).toBe("https://example.com/surface");
  });

  it("normalizes bare domains to https", async () => {
    const { normalizeInspectorRouteInput } = await import(
      "@/app/contracts/governance/inspector/_lib/url-state"
    );
    expect(normalizeInspectorRouteInput("surfaces.systems")).toBe("https://surfaces.systems");
    expect(normalizeInspectorRouteInput("surfaces.systems/demo")).toBe(
      "https://surfaces.systems/demo",
    );
  });

  it("normalizes route-like inputs to relative paths", async () => {
    const { normalizeInspectorRouteInput } = await import(
      "@/app/contracts/governance/inspector/_lib/url-state"
    );
    expect(normalizeInspectorRouteInput("pricing")).toBe("/pricing");
    expect(normalizeInspectorRouteInput("/")).toBe("/");
  });
});
