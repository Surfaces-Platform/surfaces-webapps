#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const REPO_ROOT = path.resolve(import.meta.dirname, "..");
const GENERATED_DIR = path.join(REPO_ROOT, "contracts", "generated");

const OVERLAYS = {
  "benchmark-shared-shell-web": {
    maxContentWidth: 1120,
    requiredContainers: ["page-container"],
    requiredSections: [
      { id: "dashboard.hero", description: "Shared shell landing hero for the home route.", intent: "hero" },
      { id: "dashboard.overview", description: "Overview cards for the shared dashboard landing route.", intent: "overview" },
      { id: "reports.metrics", description: "Route-local reports metrics section that should exist beside audit.", intent: "metrics" },
      { id: "reports.audit", description: "Route-local reports audit section.", intent: "audit" },
      { id: "settings.controls", description: "Settings controls section rendered from the shared shell.", intent: "controls" },
    ],
    motion: {
      allowedDurationsMs: [120],
      allowedTimingFunctions: ["linear"],
    },
  },
  "benchmark-destructive-flow-web": {
    maxContentWidth: 1040,
    requiredContainers: ["page-container"],
    targetAcquisition: {
      policy: "warn",
      modality: "touch-mouse",
      minHitAreaPx: 44,
      minGapPx: 8,
      minEdgeInsetPx: 8,
      destructiveGapPx: 16,
    },
    requiredSections: [
      { id: "flow.intro", description: "Introductory framing for the destructive workflow.", intent: "intro" },
      { id: "flow.request", description: "Request capture step for the destructive workflow.", intent: "form" },
      { id: "flow.review", description: "Review checklist step for the destructive workflow.", intent: "review" },
      { id: "flow.confirm", description: "Explicit confirm step for the destructive workflow.", intent: "confirm" },
    ],
    flows: {
      policy: "warn",
      requirements: [
        {
          flowId: "workspace-delete",
          minSteps: 2,
          requiredSteps: ["request", "review", "confirm"],
          requiredTransitions: [
            { from: "request", to: "review" },
            { from: "review", to: "confirm" },
          ],
          terminalSteps: ["confirm"],
        },
      ],
    },
    motion: {
      allowedDurationsMs: [120],
      allowedTimingFunctions: ["linear"],
    },
  },
  "benchmark-design-tokens-web": {
    maxContentWidth: 1320,
    requiredContainers: ["page-container"],
    requiredSections: [
      { id: "design.hero", description: "Hero framing for the dense design token benchmark.", intent: "hero" },
      { id: "design.palette", description: "Reusable token card matrix for palette coverage.", intent: "palette" },
      { id: "design.metrics", description: "Metric strip summarizing token-system counts.", intent: "metrics" },
      { id: "design.audit", description: "Audit panel assembled from a shared component.", intent: "audit" },
    ],
    motion: {
      allowedDurationsMs: [120],
      allowedTimingFunctions: ["linear"],
    },
  },
  "benchmark-async-data-web": {
    maxContentWidth: 1180,
    requiredContainers: ["page-container"],
    chromeTargets: ["layout-container", "page-container", "top-level-section"],
    requiredSections: [
      { id: "data.hero", description: "Server-rendered hero summary for the async dashboard.", intent: "hero" },
      { id: "data.stream", description: "Primary async stream lane for dashboard events.", intent: "stream" },
      { id: "data.queue", description: "Queued review lane for async dashboard data.", intent: "queue" },
      { id: "data.health", description: "Health counters panel for the async dashboard.", intent: "health" },
    ],
    motion: {
      allowedDurationsMs: [180, 220],
      allowedTimingFunctions: ["ease"],
    },
    components: [
      {
        id: "dashboard-actions",
        intent: "actions",
        slots: [{ id: "primary", kind: "action", required: true }],
        interactions: [
          {
            id: "submit-refresh",
            trigger: "click refresh dashboard",
            effect: "submit",
          },
          {
            id: "retry-dashboard",
            trigger: "click retry dashboard",
            effect: "set-state",
          },
        ],
      },
    ],
    runtime: {
      policy: "warn",
      feedbackRecovery: {
        policy: "warn",
        requiredStateKinds: ["loading", "empty", "error", "success"],
      },
      contexts: [
        {
          id: "loading",
          when: "request == pending",
          kind: "loading",
          blockedActionsWhilePending: ["submit-refresh"],
        },
        {
          id: "empty",
          when: "items.length == 0",
          kind: "empty",
        },
        {
          id: "error",
          when: "request == failed",
          kind: "error",
          requiredRecoveryActions: ["retry"],
          preserveSections: ["data.hero", "data.stream", "data.queue", "data.health"],
          preserveLastGoodContent: true,
        },
        {
          id: "success",
          when: "request == fulfilled",
          kind: "success",
        },
      ],
    },
  },
};

async function main() {
  for (const [surfaceId, overlay] of Object.entries(OVERLAYS)) {
    const contractPath = path.join(GENERATED_DIR, `${surfaceId}.contract.json`);
    const contract = JSON.parse(await fs.readFile(contractPath, "utf8"));
    const surface = contract.surfaces?.find((entry) => entry?.id === surfaceId) ?? contract.surfaces?.[0];
    if (!surface) {
      throw new Error(`Could not locate surface "${surfaceId}" inside ${contractPath}.`);
    }

    surface.phase0 = {
      authPosture: "public",
      requiresShell: true,
    };
    surface.layout ??= {};
    surface.layout.maxContentWidth = overlay.maxContentWidth;
    surface.layout.requiredContainers = overlay.requiredContainers;
    if (overlay.targetAcquisition) {
      surface.layout.targetAcquisition = overlay.targetAcquisition;
    }
    if (overlay.chromeTargets && surface.layout.chromePolicy) {
      surface.layout.chromePolicy.targets = overlay.chromeTargets;
    }
    if (overlay.flows) {
      surface.flows = overlay.flows;
    }
    surface.requiredSections = overlay.requiredSections.map((section) => section.id);
    contract.sections = overlay.requiredSections;
    contract.constraints ??= {};
    contract.constraints.motion = overlay.motion;
    if (overlay.components) {
      contract.components = overlay.components;
    }
    if (overlay.runtime) {
      surface.runtime = overlay.runtime;
    }

    await fs.writeFile(contractPath, `${JSON.stringify(contract, null, 2)}\n`, "utf8");
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
