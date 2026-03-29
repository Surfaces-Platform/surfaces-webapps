import type {
  SurfaceOpsBenchmarkSummary,
  SurfaceOpsModelInstallState,
  SurfaceOpsRuntimeStatus,
} from "@surfaces/surfaceops-desktop-bridge";

export type LocalWorkbenchPreviewMode = "baseline" | "current";
export type LocalWorkbenchTab = "controls" | "trace" | "chat";
export type LocalWorkbenchRunStatus = "idle" | "running" | "succeeded" | "failed";
export type LocalSuggestionStatus = "proposed" | "accepted" | "rejected";
export type LocalWorkbenchPublishStatus = "published";
export type LocalWorkbenchRunPhase =
  | "compile"
  | "prepare"
  | "baseline-validation"
  | "baseline-preview"
  | "agent"
  | "current-validation"
  | "current-preview"
  | "finalize";
export type LocalWorkbenchRunPhaseStatus = "running" | "succeeded" | "failed";

export interface LocalWorkbenchSuggestion {
  suggestionId: string;
  findingCode: string;
  findingMessage: string;
  summary: string;
  suggestedPath: string;
  status: LocalSuggestionStatus;
  rationale?: string;
}

export interface LocalWorkbenchAcceptedSuggestion {
  findingCode: string;
  findingMessage: string;
  summary: string;
  suggestedPath: string;
  rationale?: string;
  sourceRunId: string;
  acceptedAt: string;
}

export interface LocalWorkbenchComparison {
  baselineStatus: string;
  currentStatus: string;
  baselineFindingCount: number;
  currentFindingCount: number;
  baselineBlockingCount: number;
  currentBlockingCount: number;
  findingCountDelta: number;
  blockingCountDelta: number;
  newFindingCodes: string[];
  resolvedFindingCodes: string[];
}

export interface LocalWorkbenchRunPhaseEntry {
  phase: LocalWorkbenchRunPhase;
  status: LocalWorkbenchRunPhaseStatus;
  startedAt: string;
  completedAt: string | null;
  message: string | null;
}

export interface LocalWorkbenchRunError {
  phase: LocalWorkbenchRunPhase | "unknown";
  message: string;
}

export interface LocalWorkbenchRun {
  runId: string;
  status: LocalWorkbenchRunStatus;
  createdAt: string;
  completedAt: string | null;
  latestRunLabel: string;
  model: string | null;
  currentPhase: LocalWorkbenchRunPhase | null;
  phaseHistory: LocalWorkbenchRunPhaseEntry[];
  agentSummary: string | null;
  noChanges: boolean;
  toolCallCount: number;
  writeCount: number;
  lastToolName: string | null;
  lastError: LocalWorkbenchRunError | null;
  transcriptPath: string | null;
  touchedFiles: string[];
  errorMessage: string | null;
  effectiveAstPath: string | null;
  guidanceStrategy: string | null;
  guidanceHandoffPath: string | null;
  agentInputPath: string | null;
  explainabilityPath: string | null;
  baselinePreview: {
    path: string | null;
    dataUrl: string | null;
  };
  currentPreview: {
    path: string | null;
    dataUrl: string | null;
  };
  baselineSummaryPath: string | null;
  currentSummaryPath: string | null;
  suggestionsPath: string | null;
  comparison: LocalWorkbenchComparison | null;
  suggestions: LocalWorkbenchSuggestion[];
}

export interface LocalWorkbenchTranscriptEntry {
  type: "request" | "assistant" | "tool" | "finish";
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface LocalWorkbenchRunDetail {
  run: LocalWorkbenchRun;
  transcript: LocalWorkbenchTranscriptEntry[];
  durationMs: number | null;
  previewDebug: {
    baseline: {
      url: string | null;
      stdoutPath: string | null;
      stderrPath: string | null;
      stderrTail: string[];
    };
    current: {
      url: string | null;
      stdoutPath: string | null;
      stderrPath: string | null;
      stderrTail: string[];
    };
  };
  lastToolCall: {
    name: string;
    args: Record<string, unknown> | null;
    result: Record<string, unknown> | null;
  } | null;
}

export interface LocalWorkbenchChatMessage {
  id: string;
  role: "system" | "assistant" | "user";
  title: string;
  content: string;
  createdAt: string;
}

export type LocalWorkbenchAstChangeField =
  | "color.allowedValues"
  | "color.policy"
  | "surfaces[reference-target-web].owner"
  | "surfaces[reference-target-web].governance.status"
  | "surfaces[reference-target-web].governance.roles.designers"
  | "surfaces[reference-target-web].governance.roles.engineers"
  | "surfaces[reference-target-web].runtime.policy"
  | "surfaces[reference-target-web].runtime.mutationEnvelope.mode"
  | "surfaces[reference-target-web].runtime.mutationEnvelope.allowedSections"
  | "surfaces[reference-target-web].platforms[web].allowedFonts"
  | "surfaces[reference-target-web].platforms[web].layout.maxContentWidth";

export interface LocalWorkbenchAstChange {
  id: string;
  path: LocalWorkbenchAstChangeField;
  action: "set" | "add";
  value: string | number;
  summary: string;
  createdAt: string;
  sourceMessageId: string;
}

export interface LocalWorkbenchDesignerNote {
  id: string;
  content: string;
  createdAt: string;
  sourceMessageId: string;
}

export interface LocalWorkbenchAgentInput {
  path: string | null;
  content: string | null;
}

export interface PromotionReadinessRunRef {
  runId: string;
  createdAt: string;
  status: string;
  contract: {
    id: string | null;
    version: string | null;
    sha256: string | null;
  };
  artifacts: {
    extractionPath: string | null;
    reportPath: string | null;
  };
}

export interface PromotionReadinessCheck {
  source: string;
  ready: boolean;
  code: string;
  message: string;
  latestRun: PromotionReadinessRunRef | null;
}

export interface PromotionReadinessSourceKpi {
  source: string;
  totalRuns: number;
  passedRuns: number;
  nonFailingRuns: number;
  blockingRuns: number;
  passRate: number | null;
  blockingRate: number | null;
  recurringFindingCodes: { code: string; count: number }[];
  timeToGreen: {
    latestMs: number | null;
    averageMs: number | null;
    samples: number;
    insufficientHistory: boolean;
  };
  latestRun: PromotionReadinessRunRef | null;
}

export interface PromotionReadinessSurface {
  surfaceId: string;
  ready: boolean;
  checks: PromotionReadinessCheck[];
  sourceKpis: PromotionReadinessSourceKpi[];
}

export interface PromotionReadinessReport {
  schemaVersion: number;
  generatedAt: string;
  mode: "advisory" | "block";
  freshnessDays: number;
  requiredSources: string[];
  contract: {
    path: string;
    id: string;
    version: string;
    sha256: string;
  };
  summary: {
    totalSurfaces: number;
    readySurfaces: number;
    notReadySurfaces: number;
    readyForPromotion: boolean;
  };
  surfaces: PromotionReadinessSurface[];
}

export interface LocalWorkbenchLifecycleSummary {
  stage: string;
  validationStatus: string;
  approvalStatus: string;
  publicationStatus: string;
  observationStatus: string;
  requiredRoles: string[];
}

export interface LocalWorkbenchReviewSummary {
  status: string;
  requiresHumanReview: boolean;
  changeCount: number;
  nodeChangeCount: number;
  governanceChangeCount: number;
  platformChangeCount: number;
}

export interface LocalWorkbenchIntegrationEvidenceSummary {
  consumer: string;
  platform: string;
  integratedAt: string;
  passCount: number;
  warnCount: number;
  blockCount: number;
  exceptionCount: number;
}

export interface LocalWorkbenchPublish {
  publishId: string;
  status: LocalWorkbenchPublishStatus;
  createdAt: string;
  sourceRunId: string | null;
  astPath: string;
  bundleRoot: string;
  manifestPath: string;
  generationPayloadPath: string;
  runtimePayloadPath: string;
  lifecycleStage: string;
  integrationEvidencePath: string | null;
  promotionRecordPath: string | null;
  integrationEvidence: LocalWorkbenchIntegrationEvidenceSummary | null;
  promotionReadinessPath: string | null;
  promotionReadiness: PromotionReadinessReport | null;
}

export interface LocalWorkbenchAstSummary {
  astId: string;
  version: string;
  description: string;
  surfaceCount: number;
  platformCount: number;
  nodeCount: number;
  migrationEscalationCount: number;
  platformIds: string[];
  requiredSections: string[];
  allowedFonts: string[];
  maxContentWidth: number | null;
  colorPolicy: string;
  allowedColors: string[];
  owner: string | null;
  governanceStatus: string | null;
  runtimePolicy: string;
  mutationMode: string | null;
}

export interface LocalWorkbenchData {
  enabled: boolean;
  runRoot: string;
  target: {
    id: string;
    label: string;
    appRoot: string;
    astPath: string;
    implementationBrief: string;
  };
  ast: LocalWorkbenchAstSummary;
  lifecycle: LocalWorkbenchLifecycleSummary;
  review: LocalWorkbenchReviewSummary;
  latestRun: LocalWorkbenchRun | null;
  runs: LocalWorkbenchRun[];
  latestPublish: LocalWorkbenchPublish | null;
  publishes: LocalWorkbenchPublish[];
  promotionReadiness: PromotionReadinessReport | null;
  activeAcceptedSuggestions: LocalWorkbenchAcceptedSuggestion[];
  latestRunOperatorNote: string | null;
  activeAstChanges: LocalWorkbenchAstChange[];
  activeDesignerNotes: LocalWorkbenchDesignerNote[];
  latestRunAgentInput: LocalWorkbenchAgentInput;
  latestRunGuidanceHandoff: LocalWorkbenchAgentInput;
  chat: LocalWorkbenchChatMessage[];
  localModel: {
    configured: boolean;
    baseUrl: string | null;
    model: string | null;
    managementPath: string | null;
    installState: SurfaceOpsModelInstallState | null;
    runtimeStatus: SurfaceOpsRuntimeStatus | null;
    lastBenchmarkSummary: SurfaceOpsBenchmarkSummary | null;
  };
}

export interface StartLocalRerunResult {
  runId: string;
  status: LocalWorkbenchRunStatus;
}
