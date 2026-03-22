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

function pagePathForContext(context: FindingGuidanceContext): string {
  return normalizePath(context.suggestedPath)
    ?? normalizePath(context.guidanceHints?.primaryPagePath)
    ?? `${normalizePath(context.appPath) ?? "apps/reference-target-web"}/app/page.tsx`;
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
  "descriptor.flows.missing": {
    defaultSuggestedPath: pagePathForContext,
    defaultSummary: (context) =>
      `Restore explicit data-contract-flow-id, data-contract-flow-step, and data-contract-flow-transition-to markers in ${pagePathForContext(context)} so the declared task flow is observable again.`,
    promptInstructions: (context) => [
      `Patch ${pagePathForContext(context)} so the declared flow renders visible data-contract-flow-id, data-contract-flow-step, and data-contract-flow-transition-to markers.`,
      "Keep the staged experience intact; restore observability rather than flattening the workflow.",
    ],
    unresolvedExplanation: (context) =>
      `The last rerun changed files, but the validator still cannot observe the declared flow. Restore explicit visible flow markers in ${pagePathForContext(context)}.`,
  },
  "flow.required.missing": {
    defaultSuggestedPath: pagePathForContext,
    defaultSummary: (context) =>
      `Restore the required task flow in ${pagePathForContext(context)} so the declared request, review, and confirm path is present again.`,
    promptInstructions: (context) => [
      `Patch ${pagePathForContext(context)} so the required flow wrapper and step markers render for the declared task flow.`,
      "Preserve the staged interaction pattern; do not replace it with a single flat action.",
    ],
    unresolvedExplanation: (context) =>
      `The last rerun changed files, but the required task flow is still missing. Restore the declared flow wrapper and step markers in ${pagePathForContext(context)}.`,
  },
  "flow.steps.min": {
    defaultSuggestedPath: pagePathForContext,
    defaultSummary: (context) =>
      `Restore enough contract-scoped steps in ${pagePathForContext(context)} so the observed flow meets the minimum step count without collapsing the staged experience.`,
    promptInstructions: (context) => [
      `Patch ${pagePathForContext(context)} so the observed flow includes enough visible contract-scoped steps to satisfy the minimum step count.`,
      "Add back the missing staged step instead of merging multiple steps into one panel.",
    ],
    unresolvedExplanation: (context) =>
      `The last rerun changed files, but the observed flow still does not meet the required minimum step count. Restore the missing staged step in ${pagePathForContext(context)}.`,
  },
  "flow.steps.required": {
    defaultSuggestedPath: pagePathForContext,
    defaultSummary: (context) =>
      `Restore the missing required flow step marker in ${pagePathForContext(context)} so the observed flow includes every declared step.`,
    promptInstructions: (context) => [
      `Patch ${pagePathForContext(context)} so each declared step renders a visible data-contract-flow-step marker.`,
      "Keep the existing step content visible and restore the missing marker or wrapper instead of removing adjacent steps.",
    ],
    unresolvedExplanation: (context) =>
      `The last rerun changed files, but a required flow step is still missing. Restore the missing step marker in ${pagePathForContext(context)}.`,
  },
  "flow.transition.required": {
    defaultSuggestedPath: pagePathForContext,
    defaultSummary: (context) =>
      `Restore the missing transition marker in ${pagePathForContext(context)} so the observed flow preserves the declared step-to-step path.`,
    promptInstructions: (context) => [
      `Patch ${pagePathForContext(context)} so the relevant control renders the required data-contract-flow-transition-to marker.`,
      "Keep the adjacent steps intact and restore the missing flow edge instead of deleting the stage.",
    ],
    unresolvedExplanation: (context) =>
      `The last rerun changed files, but the validator still cannot observe the required step-to-step transition. Restore the missing transition marker in ${pagePathForContext(context)}.`,
  },
  "flow.terminal.invalid": {
    defaultSuggestedPath: pagePathForContext,
    defaultSummary: (context) =>
      `Remove the outgoing transition from the terminal step in ${pagePathForContext(context)} so the declared final step stays terminal.`,
    promptInstructions: (context) => [
      `Patch ${pagePathForContext(context)} so the terminal step does not render any outgoing data-contract-flow-transition-to markers.`,
      "Keep the terminal step visible and reachable; fix the outgoing edge rather than deleting the confirm stage.",
    ],
    unresolvedExplanation: (context) =>
      `The last rerun changed files, but the terminal step still exposes an outgoing flow edge. Remove that transition marker in ${pagePathForContext(context)}.`,
  },
  "flow.unobservable": {
    defaultSuggestedPath: pagePathForContext,
    defaultSummary: (context) =>
      `Make the declared flow observable in ${pagePathForContext(context)} so runtime validation can see contract-scoped flow wrappers, steps, and transitions.`,
    promptInstructions: (context) => [
      `Patch ${pagePathForContext(context)} so the active flow renders explicit visible data-contract-flow-id, data-contract-flow-step, and data-contract-flow-transition-to markers.`,
      "Do not rely on generic DOM order or text labels; restore explicit contract-scoped flow markers.",
    ],
    unresolvedExplanation: (context) =>
      `The last rerun changed files, but runtime validation still cannot observe the declared flow. Restore explicit visible flow markers in ${pagePathForContext(context)}.`,
  },
  "target.hit-area-too-small": {
    defaultSuggestedPath: pagePathForContext,
    defaultSummary: (context) =>
      `Increase the affected control hit area in ${pagePathForContext(context)} so each observed target renders at least 44x44 CSS px without removing the existing action.`,
    promptInstructions: (context) => [
      `Patch the authored control in ${pagePathForContext(context)} so the rendered hit area reaches at least 44x44 CSS px.`,
      "Keep the existing action semantics and surrounding layout intact while enlarging the tappable area.",
    ],
    unresolvedExplanation: (context) =>
      `The last rerun changed files, but at least one observed control is still below the 44x44 floor. Increase the affected hit area in ${pagePathForContext(context)} without removing the action.`,
  },
  "target.gap-too-tight": {
    defaultSuggestedPath: pagePathForContext,
    defaultSummary: (context) =>
      `Increase spacing between adjacent controls in ${pagePathForContext(context)} so observed targets keep at least 8px separation.`,
    promptInstructions: (context) => [
      `Adjust the authored controls in ${pagePathForContext(context)} so adjacent targets keep at least 8px separation.`,
      "Preserve the action set; fix the spacing rather than deleting or hiding controls.",
    ],
    unresolvedExplanation: (context) =>
      `The last rerun changed files, but at least one observed control is still too close to its nearest neighbor. Increase the spacing in ${pagePathForContext(context)} to at least 8px.`,
  },
  "target.edge-inset-too-small": {
    defaultSuggestedPath: pagePathForContext,
    defaultSummary: (context) =>
      `Move edge-pinned controls inward in ${pagePathForContext(context)} so observed targets keep at least 8px inset from the viewport edge.`,
    promptInstructions: (context) => [
      `Patch the relevant control in ${pagePathForContext(context)} so it sits at least 8px from the viewport edge.`,
      "Keep the control visible and reachable; do not solve this by removing it.",
    ],
    unresolvedExplanation: (context) =>
      `The last rerun changed files, but at least one observed control still sits too close to the viewport edge. Move it inward in ${pagePathForContext(context)} so it keeps at least 8px inset.`,
  },
  "target.destructive-too-close": {
    defaultSuggestedPath: pagePathForContext,
    defaultSummary: (context) =>
      `Separate destructive controls from adjacent safe actions in ${pagePathForContext(context)} so destructive targets keep at least 16px clearance.`,
    promptInstructions: (context) => [
      `Patch the authored destructive control cluster in ${pagePathForContext(context)} so destructive actions keep at least 16px separation from adjacent non-destructive actions.`,
      "Preserve the destructive action and nearby safe actions; fix the spacing and grouping instead of removing controls.",
    ],
    unresolvedExplanation: (context) =>
      `The last rerun changed files, but a destructive action still sits too close to a non-destructive neighbor. Separate that control cluster in ${pagePathForContext(context)} so it keeps at least 16px clearance.`,
  },
  "target.unobservable": {
    defaultSuggestedPath: pagePathForContext,
    defaultSummary: (context) =>
      `Make the affected controls observable in ${pagePathForContext(context)} so hit area, spacing, and edge inset can be measured deterministically.`,
    promptInstructions: (context) => [
      `Patch the authored controls in ${pagePathForContext(context)} so their hit area, spacing, and edge inset can be measured deterministically.`,
      "Prefer explicit authored sizing and spacing over comments or dead helper code.",
    ],
    unresolvedExplanation: (context) =>
      `The last rerun changed files, but the validator still cannot fully measure at least one control. Make the affected controls observable in ${pagePathForContext(context)} with deterministic sizing and spacing.`,
  },
  "feedback.state-missing": {
    defaultSuggestedPath: pagePathForContext,
    defaultSummary: (context) =>
      `Add the missing async state markers and UI in ${pagePathForContext(context)} so loading, empty, error, and any declared success or partial states are contract-observable.`,
    promptInstructions: (context) => [
      `Patch ${pagePathForContext(context)} so every contract-declared async state renders explicit data-contract-state-kind and data-contract-state-id markers.`,
      "Keep the state-specific UI real and observable; do not satisfy this with comments or dead helper code.",
    ],
    unresolvedExplanation: (context) =>
      `The last rerun changed files, but at least one required async state is still missing or unmarked. Add explicit async state UI and markers in ${pagePathForContext(context)}.`,
  },
  "feedback.recovery-action-missing": {
    defaultSuggestedPath: pagePathForContext,
    defaultSummary: (context) =>
      `Add the required recovery action in ${pagePathForContext(context)} so the error state exposes an explicit retry or corrective affordance.`,
    promptInstructions: (context) => [
      `Patch ${pagePathForContext(context)} so the failing async state renders the required recovery action with a data-contract-recovery-action marker.`,
      "Preserve the state content and add the missing corrective affordance instead of removing the error state.",
    ],
    unresolvedExplanation: (context) =>
      `The last rerun changed files, but the validator still cannot find the required recovery action. Add the missing retry or corrective affordance in ${pagePathForContext(context)} with an explicit data-contract-recovery-action marker.`,
  },
  "feedback.pending-action-not-blocked": {
    defaultSuggestedPath: pagePathForContext,
    defaultSummary: (context) =>
      `Disable pending submit actions in ${pagePathForContext(context)} so the loading state blocks the declared interactions while work is in flight.`,
    promptInstructions: (context) => [
      `Patch ${pagePathForContext(context)} so pending submit controls render disabled or aria-disabled while the loading state is active.`,
      "Keep the existing action visible; the fix is to block it during the pending state, not to delete it.",
    ],
    unresolvedExplanation: (context) =>
      `The last rerun changed files, but at least one pending action still remains enabled. Disable the declared loading-state interactions in ${pagePathForContext(context)} while work is in flight.`,
  },
  "feedback.last-good-content-missing": {
    defaultSuggestedPath: pagePathForContext,
    defaultSummary: (context) =>
      `Preserve the last good content in ${pagePathForContext(context)} so the failing async state keeps the required sections visible and marked as preserved.`,
    promptInstructions: (context) => [
      `Patch ${pagePathForContext(context)} so the affected async state keeps the required sections visible and marks preserved content with data-contract-preserve-last-good="true".`,
      "Do not replace the entire page with a blank error shell when the contract requires preserved content.",
    ],
    unresolvedExplanation: (context) =>
      `The last rerun changed files, but the validator still cannot confirm preserved last-good content. Keep the required sections visible in ${pagePathForContext(context)} and mark the preserved state explicitly.`,
  },
  "feedback.unobservable": {
    defaultSuggestedPath: pagePathForContext,
    defaultSummary: (context) =>
      `Make the async state observable in ${pagePathForContext(context)} so runtime validation can see the contract-scoped state wrapper, sections, and recovery affordances.`,
    promptInstructions: (context) => [
      `Patch ${pagePathForContext(context)} so the active async state renders explicit data-contract-state-kind and data-contract-state-id markers.`,
      "Ensure the contract-scoped state wrapper is visible and measurable at runtime; do not rely on fallback text heuristics.",
    ],
    unresolvedExplanation: (context) =>
      `The last rerun changed files, but runtime validation still cannot observe the contract-scoped async state. Add explicit visible state markers in ${pagePathForContext(context)}.`,
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
