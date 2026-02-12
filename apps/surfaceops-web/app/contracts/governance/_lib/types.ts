export type RuleLevel = "allowed" | "required" | "forbidden";

export type SurfaceId = "marketing" | "app" | "admin" | "cli";
export type ContractState = "draft" | "active" | "proposed";
export type EnvironmentId = "dev" | "staging" | "production";

export type DriftDetectionMode = "onCommit" | "onBuild";
export type SeverityThreshold = "informational" | "warning" | "blocking";
export type AutoFixPolicy = "never" | "safeOnly";
export type GovernanceTabId = "layout" | "navigation" | "generation" | "drift";

export interface SurfaceContract {
  surface: SurfaceId;
  version: string;

  layout: {
    allowedPatterns: {
      singleColumn: RuleLevel;
      sidebarContent: RuleLevel;
      dashboardGrid: RuleLevel;
      wizardFlow: RuleLevel;
    };
    maxContentWidth: number;
    requireGlobalHeader: boolean;
    requirePageContainer: boolean;
  };

  navigation: {
    types: {
      topNav: RuleLevel;
      sideNav: RuleLevel;
      tabs: RuleLevel;
    };
    maxDepth: number;
    disallowDuplicateNavigation: boolean;
    requireSinglePrimaryNav: boolean;
  };

  generation: {
    mustUseDesignTokens: boolean;
    forbidNewLayoutPrimitives: boolean;
    forbidAdditionalNavLayer: boolean;
    structuralChangesRequireReview: boolean;
    autoCorrectMinorDeviation: boolean;
  };

  drift: {
    detectionMode: DriftDetectionMode;
    severityThreshold: SeverityThreshold;
    autoFixPolicy: AutoFixPolicy;
  };
}

export interface ValidationFinding {
  level: "ok" | "warn" | "danger";
  message: string;
  path?: string;
}

export interface SimulationFinding {
  id: string;
  level: "info" | "warn" | "block";
  message: string;
  rulePath?: string;
}
