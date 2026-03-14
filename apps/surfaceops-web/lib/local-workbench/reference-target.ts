import type { LocalWorkbenchAcceptedSuggestion, LocalWorkbenchDesignerNote } from "./types";

export type ReferenceTargetGuidanceStrategy = "prompt-summary" | "json-primary" | "unguided";

export const REFERENCE_TARGET = {
  id: "reference-target-web",
  label: "Reference Target Web",
  appPath: "apps/reference-target-web",
  contractPath: "contracts/generated/reference-target-web.contract.json",
  implementationBrief:
    "Refine the reference target UI to better match the contract-guided surface while preserving deterministic fixture behavior.",
} as const;

export interface ReferenceTargetBenchmarkProfile {
  profileId: string;
  profileName: string;
  surfaceId: typeof REFERENCE_TARGET.id;
  tool: "local-llm";
  implementationBrief: string;
  defaultStrategies: ReferenceTargetGuidanceStrategy[];
  acceptedSuggestions: LocalWorkbenchAcceptedSuggestion[];
  designerNotes: LocalWorkbenchDesignerNote[];
}

export const REFERENCE_TARGET_BENCHMARK_PROFILE: ReferenceTargetBenchmarkProfile = {
  profileId: "reference-target-web/default",
  profileName: "Reference Target Web Default",
  surfaceId: REFERENCE_TARGET.id,
  tool: "local-llm",
  implementationBrief: REFERENCE_TARGET.implementationBrief,
  defaultStrategies: ["prompt-summary", "json-primary"],
  acceptedSuggestions: [],
  designerNotes: [],
};
