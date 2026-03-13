export type LocalWorkbenchPreviewMode = "baseline" | "current";
export type LocalWorkbenchTab = "controls" | "chat";
export type LocalWorkbenchRunStatus = "idle" | "running" | "succeeded" | "failed";
export type LocalSuggestionStatus = "proposed" | "accepted" | "rejected";

export interface LocalWorkbenchSuggestion {
  suggestionId: string;
  findingCode: string;
  findingMessage: string;
  summary: string;
  suggestedPath: string;
  status: LocalSuggestionStatus;
  rationale?: string;
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

export interface LocalWorkbenchRun {
  runId: string;
  status: LocalWorkbenchRunStatus;
  createdAt: string;
  completedAt: string | null;
  latestRunLabel: string;
  transcriptPath: string | null;
  touchedFiles: string[];
  errorMessage: string | null;
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

export interface LocalWorkbenchChatMessage {
  id: string;
  role: "system" | "assistant";
  title: string;
  content: string;
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
