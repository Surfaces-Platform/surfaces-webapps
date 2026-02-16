export type InspectorTargetMode = "reference" | "byo";

export type InspectorTargetProfileId = "reference_customer_v1";

export interface InspectorTargetProfile {
  id: InspectorTargetProfileId;
  label: string;
  baseUrl: string;
  defaultRoute: string;
  description: string;
  deterministicChecks: string[];
}

const DEV_REFERENCE_TARGET_FALLBACK = "http://localhost:3004/";
const DEFAULT_TARGET_PROFILE_ID: InspectorTargetProfileId = "reference_customer_v1";

export function getDefaultInspectorTargetProfileId(): InspectorTargetProfileId {
  return DEFAULT_TARGET_PROFILE_ID;
}

export function resolveReferenceTargetBaseUrl(envValue?: string): string {
  const configured = envValue?.trim();
  if (configured) {
    return canonicalizeHttpUrl(configured);
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "NEXT_PUBLIC_GOVERNANCE_REFERENCE_TARGET_URL must be set in production.",
    );
  }
  return DEV_REFERENCE_TARGET_FALLBACK;
}

export function listInspectorTargetProfiles(referenceBaseUrl: string): InspectorTargetProfile[] {
  const baseUrl = canonicalizeHttpUrl(referenceBaseUrl);
  return [
    {
      id: "reference_customer_v1",
      label: "Reference customer v1",
      baseUrl,
      defaultRoute: "/",
      description:
        "Deterministic fixture target for governance demos and repeatable contract checks.",
      deterministicChecks: [
        "layout.requirePageContainer",
        "layout.requireGlobalHeader",
        "navigation.requireSinglePrimaryNav",
        "navigation.disallowDuplicateNavigation",
        "navigation.maxDepth",
        "sections.required",
        "nng.5.error-prevention",
        "generation.mustUseDesignTokens",
      ],
    },
  ];
}

export function getInspectorTargetProfile(
  profiles: InspectorTargetProfile[],
  profileId: string | undefined,
): InspectorTargetProfile {
  if (profileId) {
    const byId = profiles.find((entry) => entry.id === profileId);
    if (byId) return byId;
  }
  return profiles[0];
}

function canonicalizeHttpUrl(value: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`Invalid reference target URL: ${value}`);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`Reference target URL must use http/https: ${value}`);
  }
  parsed.hash = "";
  return parsed.toString();
}
