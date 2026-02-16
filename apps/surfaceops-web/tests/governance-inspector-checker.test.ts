import { describe, expect, it } from "vitest";
import { makeDefaultContract } from "@/app/contracts/governance/_lib/default-contract";
import { runInspectorChecks } from "@/app/contracts/governance/inspector/_lib/checker";
import {
  INSPECTOR_CHANNEL,
  INSPECTOR_VERSION,
  isInspectorMessage,
} from "@/app/contracts/governance/inspector/_lib/protocol";

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
      reliabilityTier: "full",
      reliabilityReasons: [],
    });
    expect(violations.some((entry) => entry.rulePath === "layout.requirePageContainer")).toBe(true);
    expect(violations.some((entry) => entry.rulePath === "layout.requireGlobalHeader")).toBe(true);
  });

  it("downgrades marker-dependent blocking checks in degraded mode", () => {
    const contract = makeDefaultContract("app");
    const violations = runInspectorChecks({
      contractDraft: contract,
      domSnapshot: {
        capturedAt: "2026-02-13T00:00:00.000Z",
        nodes: [],
      },
      requiredSections: [],
      reliabilityTier: "degraded",
      reliabilityReasons: ["byo_target"],
    });

    const headerViolation = violations.find((entry) => entry.rulePath === "layout.requireGlobalHeader");
    expect(headerViolation?.severity).toBe("warning");
    expect(headerViolation?.heuristic).toBe(true);
    expect(headerViolation?.confidence).toBe("medium");
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
      reliabilityTier: "full",
      reliabilityReasons: [],
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
      reliabilityTier: "full",
      reliabilityReasons: [],
    });
    expect(violations.some((entry) => entry.rulePath === "generation.mustUseDesignTokens")).toBe(true);
  });

  it("flags destructive action without confirmation or undo guard markers", () => {
    const contract = makeDefaultContract("app");
    const violations = runInspectorChecks({
      contractDraft: contract,
      domSnapshot: {
        capturedAt: "2026-02-16T00:00:00.000Z",
        nodes: [
          {
            nodeId: "delete-btn",
            tagName: "button",
            label: "Delete workspace",
            rect: { top: 120, left: 40, width: 180, height: 40 },
            attributes: {
              "data-contract-action-risk": "destructive",
            },
            style: { inline: "" },
          },
        ],
      },
      requiredSections: [],
      reliabilityTier: "full",
      reliabilityReasons: [],
    });
    const violation = violations.find((entry) => entry.rulePath === "nng.5.error-prevention");
    expect(violation).toBeDefined();
    expect(violation?.severity).toBe("blocking");
    expect(violation?.heuristic).toBe(true);
    expect(violation?.confidence).toBe("medium");
  });

  it("does not flag destructive action when confirmation marker is present", () => {
    const contract = makeDefaultContract("app");
    const violations = runInspectorChecks({
      contractDraft: contract,
      domSnapshot: {
        capturedAt: "2026-02-16T00:00:00.000Z",
        nodes: [
          {
            nodeId: "delete-btn",
            tagName: "button",
            label: "Delete workspace",
            rect: { top: 120, left: 40, width: 180, height: 40 },
            attributes: {
              "data-contract-action-risk": "destructive",
              "data-contract-guard-confirm": "true",
            },
            style: { inline: "" },
          },
        ],
      },
      requiredSections: [],
      reliabilityTier: "full",
      reliabilityReasons: [],
    });
    expect(violations.some((entry) => entry.rulePath === "nng.5.error-prevention")).toBe(false);
  });

  it("downgrades nng.5 blocking check in degraded reliability mode", () => {
    const contract = makeDefaultContract("app");
    const violations = runInspectorChecks({
      contractDraft: contract,
      domSnapshot: {
        capturedAt: "2026-02-16T00:00:00.000Z",
        nodes: [
          {
            nodeId: "delete-btn",
            tagName: "button",
            label: "Delete workspace",
            rect: { top: 120, left: 40, width: 180, height: 40 },
            attributes: {
              "data-contract-action-risk": "destructive",
            },
            style: { inline: "" },
          },
        ],
      },
      requiredSections: [],
      reliabilityTier: "degraded",
      reliabilityReasons: ["byo_target"],
    });
    const violation = violations.find((entry) => entry.rulePath === "nng.5.error-prevention");
    expect(violation?.severity).toBe("warning");
    expect(violation?.heuristic).toBe(true);
    expect(violation?.confidence).toBe("medium");
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
    expect(state.targetMode).toBe("byo");
    expect(state.targetProfile).toBe("reference_customer_v1");
  });

  it("normalizes bare domains to https", async () => {
    const { normalizeInspectorRouteInput } = await import(
      "@/app/contracts/governance/inspector/_lib/url-state"
    );
    expect(normalizeInspectorRouteInput("example.com")).toBe("https://example.com");
    expect(normalizeInspectorRouteInput("example.com/demo")).toBe(
      "https://example.com/demo",
    );
  });

  it("normalizes route-like inputs to relative paths", async () => {
    const { normalizeInspectorRouteInput } = await import(
      "@/app/contracts/governance/inspector/_lib/url-state"
    );
    expect(normalizeInspectorRouteInput("pricing")).toBe("/pricing");
    expect(normalizeInspectorRouteInput("/")).toBe("/");
  });

  it("infers reference mode for relative routes", async () => {
    const { readInspectorUrlState } = await import(
      "@/app/contracts/governance/inspector/_lib/url-state"
    );
    const state = readInspectorUrlState({
      prototype: "p0004",
      route: "/docs",
    });
    expect(state.targetMode).toBe("reference");
  });

  it("serializes target mode and profile in query state", async () => {
    const { buildInspectorQuery } = await import(
      "@/app/contracts/governance/inspector/_lib/url-state"
    );
    const query = buildInspectorQuery({
      prototype: "p0004",
      snapshot: "snap-1",
      route: "/",
      targetMode: "reference",
      targetProfile: "reference_customer_v1",
      panel: "default",
    });
    expect(query).toContain("targetMode=reference");
    expect(query).toContain("targetProfile=reference_customer_v1");
  });
});
