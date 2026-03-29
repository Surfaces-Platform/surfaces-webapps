import type { LocalWorkbenchAcceptedSuggestion, LocalWorkbenchDesignerNote } from "./types";

export type BenchmarkGuidanceStrategy = "prompt-summary" | "json-primary" | "unguided";

export interface BenchmarkFixtureGuidanceHints {
  stylesPath: string;
  motionSelectors: string[];
  primaryPagePath: string;
  pageFramePath: string;
  widthPath: string;
  sectionPaths: Record<string, string>;
}

export interface BenchmarkFixture {
  id: string;
  label: string;
  appPath: string;
  contractPath: string;
  astPath?: string;
  implementationBrief: string;
  devPort: number;
  defaultStrategies: BenchmarkGuidanceStrategy[];
  primaryEditableFiles: string[];
  stylesheetFiles: string[];
  tokenFiles: string[];
  guidanceHints: BenchmarkFixtureGuidanceHints;
}

export interface BenchmarkFixtureProfile {
  profileId: string;
  profileName: string;
  surfaceId: string;
  tool: "local-llm";
  implementationBrief: string;
  defaultStrategies: BenchmarkGuidanceStrategy[];
  acceptedSuggestions: LocalWorkbenchAcceptedSuggestion[];
  designerNotes: LocalWorkbenchDesignerNote[];
}

function createProfile(fixture: BenchmarkFixture): BenchmarkFixtureProfile {
  return {
    profileId: `${fixture.id}/default`,
    profileName: `${fixture.label} Default`,
    surfaceId: fixture.id,
    tool: "local-llm",
    implementationBrief: fixture.implementationBrief,
    defaultStrategies: [...fixture.defaultStrategies],
    acceptedSuggestions: [],
    designerNotes: [],
  };
}

export const REFERENCE_TARGET_FIXTURE = {
  id: "reference-target-web",
  label: "Reference Target Web",
  appPath: "apps/reference-target-web",
  contractPath: "contracts/generated/reference-target-web.contract.json",
  astPath: "contracts/generated/reference-target-web.ui.surface.ast.json",
  implementationBrief:
    "Refine the reference target UI to better match the UI AST-guided surface while preserving deterministic fixture behavior.",
  devPort: 3004,
  defaultStrategies: ["prompt-summary", "json-primary"],
  primaryEditableFiles: ["apps/reference-target-web/app/page.tsx"],
  stylesheetFiles: ["apps/reference-target-web/app/globals.css"],
  tokenFiles: ["apps/reference-target-web/app/globals.css"],
  guidanceHints: {
    stylesPath: "apps/reference-target-web/app/globals.css",
    motionSelectors: [".header", ".section", ".card"],
    primaryPagePath: "apps/reference-target-web/app/page.tsx",
    pageFramePath: "apps/reference-target-web/app/page.tsx",
    widthPath: "apps/reference-target-web/app/globals.css",
    sectionPaths: {
      "landing.hero": "apps/reference-target-web/app/page.tsx",
      "landing.capabilities": "apps/reference-target-web/app/page.tsx",
      "landing.contracts": "apps/reference-target-web/app/page.tsx",
      "landing.tokens": "apps/reference-target-web/app/page.tsx",
      "landing.observability": "apps/reference-target-web/app/page.tsx",
      "landing.actions": "apps/reference-target-web/app/page.tsx",
    },
  },
} as const satisfies BenchmarkFixture;

export const REFERENCE_FLOW_FIXTURE = {
  id: "reference-flow-web",
  label: "Reference Flow Web",
  appPath: "apps/reference-flow-web",
  contractPath: "contracts/generated/reference-flow-web.contract.json",
  implementationBrief:
    "Refine the reference flow UI so the staged request, review, and confirm path stays observable and contract-compliant across runtime flow checks.",
  devPort: 3009,
  defaultStrategies: ["prompt-summary", "json-primary"],
  primaryEditableFiles: ["apps/reference-flow-web/app/page.tsx"],
  stylesheetFiles: ["apps/reference-flow-web/app/globals.css"],
  tokenFiles: ["apps/reference-flow-web/app/globals.css"],
  guidanceHints: {
    stylesPath: "apps/reference-flow-web/app/globals.css",
    motionSelectors: [".surfaceSection", ".flowStep", ".stepLink"],
    primaryPagePath: "apps/reference-flow-web/app/page.tsx",
    pageFramePath: "apps/reference-flow-web/app/page.tsx",
    widthPath: "apps/reference-flow-web/app/globals.css",
    sectionPaths: {
      "flow.hero": "apps/reference-flow-web/app/page.tsx",
      "flow.request": "apps/reference-flow-web/app/page.tsx",
      "flow.review": "apps/reference-flow-web/app/page.tsx",
      "flow.confirm": "apps/reference-flow-web/app/page.tsx",
    },
  },
} as const satisfies BenchmarkFixture;

export const BENCHMARK_SHARED_SHELL_FIXTURE = {
  id: "benchmark-shared-shell-web",
  label: "Benchmark Shared Shell Web",
  appPath: "apps/benchmark-shared-shell-web",
  contractPath: "contracts/generated/benchmark-shared-shell-web.contract.json",
  implementationBrief:
    "Repair the shared-shell benchmark fixture so all routes satisfy the contract while preserving the app's multi-route dashboard structure.",
  devPort: 3005,
  defaultStrategies: ["prompt-summary", "json-primary"],
  primaryEditableFiles: [
    "apps/benchmark-shared-shell-web/app/_components/shared-shell.tsx",
    "apps/benchmark-shared-shell-web/app/page.tsx",
    "apps/benchmark-shared-shell-web/app/reports/page.tsx",
    "apps/benchmark-shared-shell-web/app/settings/page.tsx",
  ],
  stylesheetFiles: ["apps/benchmark-shared-shell-web/app/globals.css"],
  tokenFiles: ["apps/benchmark-shared-shell-web/app/globals.css"],
  guidanceHints: {
    stylesPath: "apps/benchmark-shared-shell-web/app/globals.css",
    motionSelectors: [".shellLink", ".surfaceCard", ".statusPill"],
    primaryPagePath: "apps/benchmark-shared-shell-web/app/page.tsx",
    pageFramePath: "apps/benchmark-shared-shell-web/app/_components/shared-shell.tsx",
    widthPath: "apps/benchmark-shared-shell-web/app/globals.css",
    sectionPaths: {
      "dashboard.hero": "apps/benchmark-shared-shell-web/app/page.tsx",
      "dashboard.overview": "apps/benchmark-shared-shell-web/app/page.tsx",
      "reports.metrics": "apps/benchmark-shared-shell-web/app/reports/page.tsx",
      "reports.audit": "apps/benchmark-shared-shell-web/app/reports/page.tsx",
      "settings.controls": "apps/benchmark-shared-shell-web/app/settings/page.tsx",
    },
  },
} as const satisfies BenchmarkFixture;

export const BENCHMARK_DESTRUCTIVE_FLOW_FIXTURE = {
  id: "benchmark-destructive-flow-web",
  label: "Benchmark Destructive Flow Web",
  appPath: "apps/benchmark-destructive-flow-web",
  contractPath: "contracts/generated/benchmark-destructive-flow-web.contract.json",
  implementationBrief:
    "Repair the destructive-flow benchmark fixture so the staged request, review, and confirm experience satisfies the contract without flattening the stateful flow.",
  devPort: 3006,
  defaultStrategies: ["prompt-summary", "json-primary"],
  primaryEditableFiles: [
    "apps/benchmark-destructive-flow-web/app/page.tsx",
    "apps/benchmark-destructive-flow-web/app/_components/flow-workbench.tsx",
    "apps/benchmark-destructive-flow-web/app/_components/request-form.tsx",
    "apps/benchmark-destructive-flow-web/app/_components/review-step.tsx",
    "apps/benchmark-destructive-flow-web/app/_components/confirm-step.tsx",
  ],
  stylesheetFiles: ["apps/benchmark-destructive-flow-web/app/globals.css"],
  tokenFiles: ["apps/benchmark-destructive-flow-web/app/globals.css"],
  guidanceHints: {
    stylesPath: "apps/benchmark-destructive-flow-web/app/globals.css",
    motionSelectors: [".flowPanel", ".dangerButton", ".reviewList"],
    primaryPagePath: "apps/benchmark-destructive-flow-web/app/page.tsx",
    pageFramePath: "apps/benchmark-destructive-flow-web/app/page.tsx",
    widthPath: "apps/benchmark-destructive-flow-web/app/globals.css",
    sectionPaths: {
      "flow.intro": "apps/benchmark-destructive-flow-web/app/page.tsx",
      "flow.request": "apps/benchmark-destructive-flow-web/app/_components/request-form.tsx",
      "flow.review": "apps/benchmark-destructive-flow-web/app/_components/review-step.tsx",
      "flow.confirm": "apps/benchmark-destructive-flow-web/app/_components/confirm-step.tsx",
    },
  },
} as const satisfies BenchmarkFixture;

export const BENCHMARK_DESIGN_TOKENS_FIXTURE = {
  id: "benchmark-design-tokens-web",
  label: "Benchmark Design Tokens Web",
  appPath: "apps/benchmark-design-tokens-web",
  contractPath: "contracts/generated/benchmark-design-tokens-web.contract.json",
  implementationBrief:
    "Repair the dense token-heavy benchmark fixture so the reusable card and metrics system satisfies the contract without collapsing the component hierarchy.",
  devPort: 3007,
  defaultStrategies: ["prompt-summary", "json-primary"],
  primaryEditableFiles: [
    "apps/benchmark-design-tokens-web/app/page.tsx",
    "apps/benchmark-design-tokens-web/app/_components/token-matrix.tsx",
    "apps/benchmark-design-tokens-web/app/_components/metric-strip.tsx",
    "apps/benchmark-design-tokens-web/app/_components/token-audit.tsx",
  ],
  stylesheetFiles: ["apps/benchmark-design-tokens-web/app/globals.css"],
  tokenFiles: ["apps/benchmark-design-tokens-web/app/globals.css"],
  guidanceHints: {
    stylesPath: "apps/benchmark-design-tokens-web/app/globals.css",
    motionSelectors: [".tokenCard", ".metricBar", ".heroBadge"],
    primaryPagePath: "apps/benchmark-design-tokens-web/app/page.tsx",
    pageFramePath: "apps/benchmark-design-tokens-web/app/page.tsx",
    widthPath: "apps/benchmark-design-tokens-web/app/globals.css",
    sectionPaths: {
      "design.hero": "apps/benchmark-design-tokens-web/app/page.tsx",
      "design.palette": "apps/benchmark-design-tokens-web/app/_components/token-matrix.tsx",
      "design.metrics": "apps/benchmark-design-tokens-web/app/_components/metric-strip.tsx",
      "design.audit": "apps/benchmark-design-tokens-web/app/_components/token-audit.tsx",
    },
  },
} as const satisfies BenchmarkFixture;

export const BENCHMARK_ASYNC_DATA_FIXTURE = {
  id: "benchmark-async-data-web",
  label: "Benchmark Async Data Web",
  appPath: "apps/benchmark-async-data-web",
  contractPath: "contracts/generated/benchmark-async-data-web.contract.json",
  astPath: "contracts/generated/benchmark-async-data-web.ui.surface.ast.json",
  implementationBrief:
    "Repair the async data benchmark fixture so the server-driven dashboard and supporting panels satisfy the UI AST while preserving the async data split.",
  devPort: 3008,
  defaultStrategies: ["prompt-summary", "json-primary"],
  primaryEditableFiles: [
    "apps/benchmark-async-data-web/app/page.tsx",
    "apps/benchmark-async-data-web/app/loading.tsx",
    "apps/benchmark-async-data-web/app/error.tsx",
    "apps/benchmark-async-data-web/app/_components/data-stream.tsx",
    "apps/benchmark-async-data-web/app/_components/queue-rail.tsx",
    "apps/benchmark-async-data-web/app/_components/health-panel.tsx",
    "apps/benchmark-async-data-web/lib/mock-data.ts",
  ],
  stylesheetFiles: ["apps/benchmark-async-data-web/app/globals.css"],
  tokenFiles: ["apps/benchmark-async-data-web/app/globals.css"],
  guidanceHints: {
    stylesPath: "apps/benchmark-async-data-web/app/globals.css",
    motionSelectors: [".streamCard", ".queueRail", ".statusRow"],
    primaryPagePath: "apps/benchmark-async-data-web/app/page.tsx",
    pageFramePath: "apps/benchmark-async-data-web/app/page.tsx",
    widthPath: "apps/benchmark-async-data-web/app/globals.css",
    sectionPaths: {
      "data.hero": "apps/benchmark-async-data-web/app/page.tsx",
      "data.stream": "apps/benchmark-async-data-web/app/_components/data-stream.tsx",
      "data.queue": "apps/benchmark-async-data-web/app/_components/queue-rail.tsx",
      "data.health": "apps/benchmark-async-data-web/app/_components/health-panel.tsx",
    },
  },
} as const satisfies BenchmarkFixture;

export const BENCHMARK_FIXTURES = [
  REFERENCE_TARGET_FIXTURE,
  BENCHMARK_SHARED_SHELL_FIXTURE,
  BENCHMARK_DESTRUCTIVE_FLOW_FIXTURE,
  BENCHMARK_DESIGN_TOKENS_FIXTURE,
  BENCHMARK_ASYNC_DATA_FIXTURE,
] as const;

export type BenchmarkFixtureId = (typeof BENCHMARK_FIXTURES)[number]["id"];

export const BENCHMARK_FIXTURE_IDS = BENCHMARK_FIXTURES.map((fixture) => fixture.id);

export const BENCHMARK_FIXTURES_BY_ID = new Map<string, BenchmarkFixture>(
  BENCHMARK_FIXTURES.map((fixture) => [fixture.id, fixture]),
);

export const BENCHMARK_PROFILES_BY_ID = new Map<string, BenchmarkFixtureProfile>(
  BENCHMARK_FIXTURES.map((fixture) => [fixture.id, createProfile(fixture)]),
);

export function getBenchmarkFixture(id: string): BenchmarkFixture {
  const fixture = BENCHMARK_FIXTURES_BY_ID.get(id);
  if (!fixture) {
    throw new Error(`Unknown benchmark fixture: ${id}`);
  }
  return fixture;
}

export function getBenchmarkFixtureProfile(id: string): BenchmarkFixtureProfile {
  const profile = BENCHMARK_PROFILES_BY_ID.get(id);
  if (!profile) {
    throw new Error(`Unknown benchmark fixture profile: ${id}`);
  }
  return profile;
}
