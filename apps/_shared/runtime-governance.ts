export type RuntimePolicy = "off" | "warn" | "strict";

export interface RuntimeChange {
  surfaceId: string;
  sectionId?: string;
  proposedStyles?: {
    background?: string;
  };
}

export interface PreparedRuntimeManifest {
  surface?: {
    surfaceId?: string;
    displayName?: string;
    type?: string;
  };
  contract?: {
    id?: string;
    version?: string;
  };
  runtime?: {
    policy?: RuntimePolicy;
    policySeverities?: Record<string, RuntimePolicy>;
    mutationEnvelope?: {
      mode?: string;
      allowedSections?: string[];
      prohibitedSections?: string[];
    };
    structure?: {
      requiredSections?: string[];
      allowedSections?: string[];
    };
    visual?: {
      color?: {
        policy?: RuntimePolicy;
        allowedValues?: string[];
      };
    };
  };
}

export interface RuntimeViolation {
  contractId: string;
  version: string;
  surfaceId: string;
  rule: string;
  policy: "warn" | "strict";
  severity: "warn" | "error";
  action: "warn" | "block";
  evidence: unknown;
}

export interface RuntimeValidationResult {
  allowed: boolean;
  violations: RuntimeViolation[];
  contract: {
    id: string;
    version: string;
    surfaceId: string;
  };
}

function resolvePolicy(
  manifest: PreparedRuntimeManifest,
  category: string,
  fallback: RuntimePolicy = "warn",
): RuntimePolicy {
  return manifest.runtime?.policySeverities?.[category] ?? manifest.runtime?.policy ?? fallback;
}

function normalizeViolationPolicy(policy: RuntimePolicy): "warn" | "strict" {
  return policy === "strict" ? "strict" : "warn";
}

function makeViolation(
  manifest: PreparedRuntimeManifest,
  rule: string,
  policy: RuntimePolicy,
  evidence: unknown,
): RuntimeViolation {
  const effectivePolicy = normalizeViolationPolicy(policy);
  const surfaceId = manifest.surface?.surfaceId ?? "unknown";
  return {
    contractId: manifest.contract?.id ?? "unknown",
    version: manifest.contract?.version ?? "unknown",
    surfaceId,
    rule,
    policy: effectivePolicy,
    severity: effectivePolicy === "strict" ? "error" : "warn",
    action: effectivePolicy === "strict" ? "block" : "warn",
    evidence,
  };
}

export function validateRuntimeChange(
  manifest: PreparedRuntimeManifest,
  change: RuntimeChange,
): RuntimeValidationResult {
  const surfaceId = manifest.surface?.surfaceId ?? "unknown";
  const contract = {
    id: manifest.contract?.id ?? "unknown",
    version: manifest.contract?.version ?? "unknown",
    surfaceId,
  };

  if (!change || change.surfaceId !== surfaceId) {
    return {
      allowed: false,
      violations: [
        makeViolation(manifest, "surface.mismatch", "strict", {
          surfaceId: change?.surfaceId,
        }),
      ],
      contract,
    };
  }

  const violations: RuntimeViolation[] = [];
  const runtime = manifest.runtime ?? {};
  const structure = runtime.structure ?? {};
  const mutationEnvelope = runtime.mutationEnvelope ?? {};
  const allowedSections = mutationEnvelope.allowedSections?.length
    ? mutationEnvelope.allowedSections
    : structure.allowedSections ?? [];
  const prohibitedSections = mutationEnvelope.prohibitedSections ?? [];

  if (!change.sectionId) {
    violations.push(
      makeViolation(
        manifest,
        "sections.required",
        resolvePolicy(manifest, "structure", "strict"),
        { sectionId: change.sectionId },
      ),
    );
  } else {
    if (allowedSections.length > 0 && !allowedSections.includes(change.sectionId)) {
      violations.push(
        makeViolation(
          manifest,
          mutationEnvelope.allowedSections?.length
            ? "runtime.mutation.section-disallowed"
            : "section.disallowed",
          mutationEnvelope.allowedSections?.length
            ? resolvePolicy(manifest, "runtime", "strict")
            : resolvePolicy(manifest, "structure", "strict"),
          {
            sectionId: change.sectionId,
            allowedSections,
          },
        ),
      );
    }

    if (prohibitedSections.includes(change.sectionId)) {
      violations.push(
        makeViolation(
          manifest,
          "runtime.mutation.section-prohibited",
          resolvePolicy(manifest, "runtime", "strict"),
          {
            sectionId: change.sectionId,
            prohibitedSections,
          },
        ),
      );
    }
  }

  const proposedBackground = change.proposedStyles?.background ?? "";
  const colorPolicy = runtime.visual?.color;
  if (colorPolicy?.policy && colorPolicy.policy !== "off" && proposedBackground.length > 0) {
    const allowedValues = new Set(colorPolicy.allowedValues ?? []);
    if (!allowedValues.has(proposedBackground)) {
      violations.push(
        makeViolation(manifest, "color.disallowed", colorPolicy.policy, {
          property: "background",
          value: proposedBackground,
          allowedValues: [...allowedValues],
        }),
      );
    }
  }

  return {
    allowed: !violations.some((violation) => violation.policy === "strict"),
    violations,
    contract,
  };
}
