const TARGET_GLOBALS_PATH = "apps/reference-target-web/app/globals.css";

interface KnownFindingGuidance {
  defaultSuggestedPath: string;
  defaultSummary: string;
  legacySummaries?: string[];
  promptInstructions?: string[];
  unresolvedExplanation?: string;
}

const KNOWN_FINDING_GUIDANCE: Record<string, KnownFindingGuidance> = {
  "motion.none-detected": {
    defaultSuggestedPath: TARGET_GLOBALS_PATH,
    defaultSummary:
      "In apps/reference-target-web/app/globals.css, add a real transition or animation declaration to an existing selector such as .header, .section, or .card using literal 120ms linear timing. Do not introduce var(--contract-motion-duration), var(--contract-motion-timing), comments, or unused helper classes.",
    legacySummaries: [
      "Add contract-compliant motion declarations in existing styles using 120ms linear timing without changing the fixture structure.",
      "In apps/reference-target-web/app/globals.css, define --contract-motion-duration: 120ms; and --contract-motion-timing: linear;, then add a real transition or animation declaration to an existing selector such as .header, .section, or .card. Do not rely on comments, ad hoc motion token names, or unused helper classes.",
    ],
    promptInstructions: [
      "Patch an existing selector already used by the fixture, such as .header, .section, or .card, and add a real transition or animation declaration using literal 120ms linear timing.",
      "Use literal 120ms and linear in the actual declaration. Do not introduce var(--contract-motion-duration) or var(--contract-motion-timing) on this surface.",
      "Do not rely on comments, standalone variables, ad hoc motion token names, or unused helper classes as the primary fix.",
    ],
    unresolvedExplanation:
      "The last rerun changed files, but the validator still did not observe any real motion declarations. In apps/reference-target-web/app/globals.css, patch an existing selector such as .header, .section, or .card and add a real transition or animation declaration using literal 120ms linear timing. Do not introduce var(--contract-motion-duration) or var(--contract-motion-timing) on this surface.",
  },
  "motion.duration": {
    defaultSuggestedPath: TARGET_GLOBALS_PATH,
    defaultSummary:
      "Update apps/reference-target-web/app/globals.css so existing transition or animation declarations use literal 120ms timing instead of ad hoc motion duration values.",
    legacySummaries: [
      "Align the surface motion declarations to the allowed 120ms duration in existing styles.",
    ],
    promptInstructions: [
      "Apply literal 120ms timing in real transition or animation declarations on existing selectors in apps/reference-target-web/app/globals.css.",
      "Do not introduce var(--contract-motion-duration) on this surface.",
    ],
    unresolvedExplanation:
      "The last rerun changed files, but motion duration is still out of policy. Update apps/reference-target-web/app/globals.css so existing transition or animation declarations use literal 120ms timing without introducing var(--contract-motion-duration).",
  },
  "motion.timing": {
    defaultSuggestedPath: TARGET_GLOBALS_PATH,
    defaultSummary:
      "Update apps/reference-target-web/app/globals.css so existing transition or animation declarations use literal linear timing instead of ad hoc timing values.",
    legacySummaries: [
      "Align the surface motion declarations to the allowed linear timing function in existing styles.",
    ],
    promptInstructions: [
      "Apply literal linear timing in real transition or animation declarations on existing selectors in apps/reference-target-web/app/globals.css.",
      "Do not introduce var(--contract-motion-timing) on this surface.",
    ],
    unresolvedExplanation:
      "The last rerun changed files, but motion timing is still out of policy. Update apps/reference-target-web/app/globals.css so existing transition or animation declarations use literal linear timing without introducing var(--contract-motion-timing).",
  },
  "token.normalization-skipped": {
    defaultSuggestedPath: TARGET_GLOBALS_PATH,
    defaultSummary:
      "In apps/reference-target-web/app/globals.css, insert --font-inter: \"Inter\", sans-serif; into the existing :root block so typography normalization succeeds.",
    promptInstructions: [
      "Insert an actual --font-inter: \"Inter\", sans-serif; custom property definition into the existing :root block in apps/reference-target-web/app/globals.css.",
      "Keep real UI selectors using font-family: var(--font-inter), Inter, sans-serif; so typography normalization succeeds.",
    ],
    unresolvedExplanation:
      "The last rerun changed files, but the validator still could not normalize var(--font-inter). Insert --font-inter: \"Inter\", sans-serif; into the existing :root block in apps/reference-target-web/app/globals.css and keep the surface using font-family: var(--font-inter), Inter, sans-serif.",
  },
};

function genericSuggestionSummary(summary: string, findingCode: string): boolean {
  const trimmed = summary.trim();
  return !trimmed || trimmed === `Review and refine ${findingCode}.` || trimmed === `Review and refine ${findingCode}`;
}

export function guidanceForFinding(findingCode: string): KnownFindingGuidance | null {
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

export function defaultSummaryForKnownFinding(findingCode: string): string | null {
  return guidanceForFinding(findingCode)?.defaultSummary ?? null;
}

export function defaultSuggestedPathForKnownFinding(findingCode: string): string | null {
  return guidanceForFinding(findingCode)?.defaultSuggestedPath ?? null;
}

export function promptInstructionsForFinding(findingCode: string): string[] {
  return guidanceForFinding(findingCode)?.promptInstructions ?? [];
}

export function unresolvedExplanationForFinding(findingCode: string): string | null {
  return guidanceForFinding(findingCode)?.unresolvedExplanation ?? null;
}
