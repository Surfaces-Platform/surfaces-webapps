import type { BenchmarkFixtureGuidanceHints } from "./benchmark-fixtures";

export interface FindingGuidanceContext {
  appPath?: string;
  suggestedPath?: string | null;
  guidanceHints?: BenchmarkFixtureGuidanceHints | null;
}

interface KnownFindingGuidance {
  defaultSuggestedPath: (context: FindingGuidanceContext) => string;
  defaultSummary: (context: FindingGuidanceContext) => string;
  legacySummaries?: string[];
  promptInstructions?: (context: FindingGuidanceContext) => string[];
  unresolvedExplanation?: (context: FindingGuidanceContext) => string;
}

function normalizePath(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed.replace(/\\/g, "/") : null;
}

function stylesPathForContext(context: FindingGuidanceContext): string {
  return normalizePath(context.suggestedPath)
    ?? normalizePath(context.guidanceHints?.stylesPath)
    ?? `${normalizePath(context.appPath) ?? "apps/reference-target-web"}/app/globals.css`;
}

function selectorSummary(context: FindingGuidanceContext): string {
  const selectors = context.guidanceHints?.motionSelectors ?? [".header", ".section", ".card"];
  if (selectors.length === 1) {
    return selectors[0]!;
  }
  if (selectors.length === 2) {
    return `${selectors[0]} or ${selectors[1]}`;
  }
  return `${selectors.slice(0, -1).join(", ")}, or ${selectors[selectors.length - 1]}`;
}

const KNOWN_FINDING_GUIDANCE: Record<string, KnownFindingGuidance> = {
  "motion.none-detected": {
    defaultSuggestedPath: stylesPathForContext,
    defaultSummary: (context) =>
      `In ${stylesPathForContext(context)}, add a real transition or animation declaration to an existing selector such as ${selectorSummary(context)} using literal 120ms linear timing. Do not introduce var(--contract-motion-duration), var(--contract-motion-timing), comments, or unused helper classes.`,
    legacySummaries: [
      "Add contract-compliant motion declarations in existing styles using 120ms linear timing without changing the fixture structure.",
      "In apps/reference-target-web/app/globals.css, define --contract-motion-duration: 120ms; and --contract-motion-timing: linear;, then add a real transition or animation declaration to an existing selector such as .header, .section, or .card. Do not rely on comments, ad hoc motion token names, or unused helper classes.",
    ],
    promptInstructions: (context) => [
      `Patch an existing selector already used by the fixture, such as ${selectorSummary(context)}, and add a real transition or animation declaration using literal 120ms linear timing.`,
      "Use literal 120ms and linear in the actual declaration. Do not introduce var(--contract-motion-duration) or var(--contract-motion-timing) on this surface.",
      "Do not rely on comments, standalone variables, ad hoc motion token names, or unused helper classes as the primary fix.",
    ],
    unresolvedExplanation: (context) =>
      `The last rerun changed files, but the validator still did not observe any real motion declarations. In ${stylesPathForContext(context)}, patch an existing selector such as ${selectorSummary(context)} and add a real transition or animation declaration using literal 120ms linear timing. Do not introduce var(--contract-motion-duration) or var(--contract-motion-timing) on this surface.`,
  },
  "motion.duration": {
    defaultSuggestedPath: stylesPathForContext,
    defaultSummary: (context) =>
      `Update ${stylesPathForContext(context)} so existing transition or animation declarations use literal 120ms timing instead of ad hoc motion duration values.`,
    legacySummaries: [
      "Align the surface motion declarations to the allowed 120ms duration in existing styles.",
    ],
    promptInstructions: (context) => [
      `Apply literal 120ms timing in real transition or animation declarations on existing selectors in ${stylesPathForContext(context)}.`,
      "Do not introduce var(--contract-motion-duration) on this surface.",
    ],
    unresolvedExplanation: (context) =>
      `The last rerun changed files, but motion duration is still out of policy. Update ${stylesPathForContext(context)} so existing transition or animation declarations use literal 120ms timing without introducing var(--contract-motion-duration).`,
  },
  "motion.timing": {
    defaultSuggestedPath: stylesPathForContext,
    defaultSummary: (context) =>
      `Update ${stylesPathForContext(context)} so existing transition or animation declarations use literal linear timing instead of ad hoc timing values.`,
    legacySummaries: [
      "Align the surface motion declarations to the allowed linear timing function in existing styles.",
    ],
    promptInstructions: (context) => [
      `Apply literal linear timing in real transition or animation declarations on existing selectors in ${stylesPathForContext(context)}.`,
      "Do not introduce var(--contract-motion-timing) on this surface.",
    ],
    unresolvedExplanation: (context) =>
      `The last rerun changed files, but motion timing is still out of policy. Update ${stylesPathForContext(context)} so existing transition or animation declarations use literal linear timing without introducing var(--contract-motion-timing).`,
  },
  "token.normalization-skipped": {
    defaultSuggestedPath: stylesPathForContext,
    defaultSummary: (context) =>
      `In ${stylesPathForContext(context)}, insert --font-inter: "Inter", sans-serif; into the existing :root block so typography normalization succeeds.`,
    promptInstructions: (context) => [
      `Insert an actual --font-inter: "Inter", sans-serif; custom property definition into the existing :root block in ${stylesPathForContext(context)}.`,
      "Keep real UI selectors using font-family: var(--font-inter), Inter, sans-serif; so typography normalization succeeds.",
    ],
    unresolvedExplanation: (context) =>
      `The last rerun changed files, but the validator still could not normalize var(--font-inter). Insert --font-inter: "Inter", sans-serif; into the existing :root block in ${stylesPathForContext(context)} and keep the surface using font-family: var(--font-inter), Inter, sans-serif.`,
  },
};

function genericSuggestionSummary(summary: string, findingCode: string): boolean {
  const trimmed = summary.trim();
  return !trimmed || trimmed === `Review and refine ${findingCode}.` || trimmed === `Review and refine ${findingCode}`;
}

export function guidanceForFinding(
  findingCode: string,
): KnownFindingGuidance | null {
  return KNOWN_FINDING_GUIDANCE[findingCode] ?? null;
}

export function suggestionSummaryNeedsRefresh(summary: string, findingCode: string): boolean {
  if (genericSuggestionSummary(summary, findingCode)) {
    return true;
  }
  const guidance = guidanceForFinding(findingCode);
  if (!guidance) {
    return false;
  }
  const trimmed = summary.trim();
  return (guidance.legacySummaries ?? []).includes(trimmed);
}

export function defaultSummaryForKnownFinding(
  findingCode: string,
  context: FindingGuidanceContext = {},
): string | null {
  const guidance = guidanceForFinding(findingCode);
  return guidance ? guidance.defaultSummary(context) : null;
}

export function defaultSuggestedPathForKnownFinding(
  findingCode: string,
  context: FindingGuidanceContext = {},
): string | null {
  const guidance = guidanceForFinding(findingCode);
  return guidance ? guidance.defaultSuggestedPath(context) : null;
}

export function promptInstructionsForFinding(
  findingCode: string,
  context: FindingGuidanceContext = {},
): string[] {
  const guidance = guidanceForFinding(findingCode);
  return guidance?.promptInstructions?.(context) ?? [];
}

export function unresolvedExplanationForFinding(
  findingCode: string,
  context: FindingGuidanceContext = {},
): string | null {
  const guidance = guidanceForFinding(findingCode);
  return guidance?.unresolvedExplanation?.(context) ?? null;
}
