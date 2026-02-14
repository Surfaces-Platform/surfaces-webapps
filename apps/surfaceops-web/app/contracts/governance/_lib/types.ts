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

export type GovernanceDecisionAction = "accept" | "reject" | "evolve";

export interface GovernanceSnapshotIndexEntry {
  snapshotId: string;
  createdAt: string;
  filePath: string;
}

export interface GovernanceSnapshotIndex {
  schemaVersion: 1;
  prototypeId: string;
  snapshotIds: string[];
  entries: Record<string, GovernanceSnapshotIndexEntry>;
  latestSnapshotId: string | null;
  baselineSnapshotId: string | null;
}

export interface GovernanceDecisionRecord {
  decisionId: string;
  snapshotId: string;
  diffItemId: string;
  action: GovernanceDecisionAction;
  reason: string | null;
  actor: string;
  createdAt: string;
}

export interface GovernanceDecisionLog {
  schemaVersion: 1;
  prototypeId: string;
  decisions: GovernanceDecisionRecord[];
}

export interface GovernanceApplyItemResult {
  diffItemId: string;
  status: "applied" | "skipped";
  reason?: string;
}

export interface GovernanceApplyRecord {
  applyId: string;
  snapshotId: string;
  actor: string;
  createdAt: string;
  items: GovernanceApplyItemResult[];
}

export interface GovernanceApplyLog {
  schemaVersion: 1;
  prototypeId: string;
  applies: GovernanceApplyRecord[];
}

export interface GovernanceInspectorBaselineRecord {
  targetUrl: string;
  contract: SurfaceContract;
  requiredSections: string[];
  sourceSnapshotCapturedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface GovernanceInspectorBaselineLog {
  schemaVersion: 1;
  prototypeId: string;
  baselines: GovernanceInspectorBaselineRecord[];
}
