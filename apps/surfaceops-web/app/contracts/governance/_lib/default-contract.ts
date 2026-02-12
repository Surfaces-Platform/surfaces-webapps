import type { SurfaceContract } from "./types";

export function makeDefaultContract(
  surface: SurfaceContract["surface"] = "app",
): SurfaceContract {
  return {
    surface,
    version: "0.1.0",
    layout: {
      allowedPatterns: {
        singleColumn: "allowed",
        sidebarContent: "required",
        dashboardGrid: "forbidden",
        wizardFlow: "allowed",
      },
      maxContentWidth: 1120,
      requireGlobalHeader: true,
      requirePageContainer: true,
    },
    navigation: {
      types: {
        topNav: "allowed",
        sideNav: "required",
        tabs: "allowed",
      },
      maxDepth: 2,
      disallowDuplicateNavigation: true,
      requireSinglePrimaryNav: true,
    },
    generation: {
      mustUseDesignTokens: true,
      forbidNewLayoutPrimitives: true,
      forbidAdditionalNavLayer: true,
      structuralChangesRequireReview: true,
      autoCorrectMinorDeviation: true,
    },
    drift: {
      detectionMode: "onCommit",
      severityThreshold: "warning",
      autoFixPolicy: "safeOnly",
    },
  };
}
