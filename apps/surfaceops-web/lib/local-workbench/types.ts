export type LocalWorkbenchPreviewMode = "baseline" | "current";
export type LocalWorkbenchTab = "controls" | "trace" | "chat";
export type LocalWorkbenchRunStatus = "idle" | "running" | "succeeded" | "failed";
export type LocalSuggestionStatus = "proposed" | "accepted" | "rejected";
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
  effectiveContractPath: string | null;
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

export interface LocalWorkbenchContractChange {
  id: string;
  field:
    | "color.allowedValues"
    | "color.policy"
    | "surfaces.reference-target-web.layout.maxContentWidth"
    | "surfaces.reference-target-web.allowedFonts";
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

export interface LocalWorkbenchData {
  enabled: boolean;
  runRoot: string;
  target: {
    id: string;
    label: string;
    appRoot: string;
    contractPath: string;
    implementationBrief: string;
  };
  contract: {
    contractId: string;
    version: string;
    description: string;
    requiredSections: string[];
    allowedFonts: string[];
    maxContentWidth: number | null;
    colorPolicy: string;
  };
  latestRun: LocalWorkbenchRun | null;
  runs: LocalWorkbenchRun[];
  activeAcceptedSuggestions: LocalWorkbenchAcceptedSuggestion[];
  latestRunOperatorNote: string | null;
  activeContractChanges: LocalWorkbenchContractChange[];
  activeDesignerNotes: LocalWorkbenchDesignerNote[];
  latestRunAgentInput: LocalWorkbenchAgentInput;
  chat: LocalWorkbenchChatMessage[];
  localModel: {
    configured: boolean;
    baseUrl: string | null;
    model: string | null;
  };
}

export interface StartLocalRerunResult {
  runId: string;
  status: LocalWorkbenchRunStatus;
}
