import type { AttemptView, GenerationWorkbenchData } from "@/lib/generation-benchmarks";

export type ContractWorkbenchPanel = "editor" | "compare" | "history";

export interface ContractProjectSurface {
  id: string;
  label?: string;
  implementationBrief: string;
}

export interface ContractProjectPreviewTarget {
  surfaceId: string;
  url: string;
  waitFor?: string;
  urlTemplate?: string;
  authSessionKey?: string;
}

export interface ContractProjectRecord {
  workspaceId: string;
  projectId: string;
  name: string;
  githubOwner: string;
  githubRepo: string;
  githubDefaultBranch: string;
  contractPath: string;
  surfaces: ContractProjectSurface[];
  previewTargets: ContractProjectPreviewTarget[];
  createdAt: string;
  updatedAt: string;
  latestRunId: string | null;
  latestPublishId: string | null;
}

export interface ContractProjectDraft {
  workspaceId: string;
  projectId: string;
  contractJson: Record<string, unknown>;
  contractSha256: string;
  updatedAt: string;
}

export type ContractProjectRunStatus = "queued" | "running" | "succeeded" | "failed";

export interface ContractProjectRunRecord {
  workspaceId: string;
  projectId: string;
  runId: string;
  surfaceId: string;
  status: ContractProjectRunStatus;
  tool: "codex";
  baseBranch: string;
  baselineBranch: string | null;
  guidedBranch: string | null;
  previewUrl: string | null;
  artifactRootRef: string | null;
  summaryJson: Record<string, unknown> | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export type PublishStatus = "queued" | "running" | "succeeded" | "failed";

export interface ContractProjectPublishRecord {
  workspaceId: string;
  projectId: string;
  publishId: string;
  status: PublishStatus;
  branchName: string;
  commitSha: string | null;
  pullRequestNumber: number | null;
  pullRequestUrl: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface ContractProjectAuthSession {
  workspaceId: string;
  projectId: string;
  authSessionKey: string;
  surfaceId: string;
  environmentId: string;
  previewOrigin: string;
  storageState: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
}

export interface ContractProjectInput {
  name: string;
  githubOwner: string;
  githubRepo: string;
  githubToken: string;
  githubDefaultBranch?: string;
  contractPath: string;
  surfaces?: Array<{
    id: string;
    label?: string;
    implementationBrief?: string;
  }>;
  previewTargets?: Array<{
    surfaceId: string;
    url: string;
    waitFor?: string;
    urlTemplate?: string;
    authSessionKey?: string;
  }>;
}

export interface RerunRequestInput {
  surfaceId: string;
  branchBase?: string;
}

export interface PublishRequestInput {
  title?: string;
  body?: string;
}

export interface SuggestionDecisionInput {
  runId: string;
  decision: "accepted" | "rejected";
  rationale: string;
}

export interface ProjectRunArtifacts {
  rootDir: string;
  comparisonPath: string;
  suggestionsPath: string | null;
  reportPath: string;
}

export interface ProjectWorkspaceData {
  project: ContractProjectRecord;
  draft: {
    text: string;
    sha256: string;
    updatedAt: string;
  };
  selectedSurfaceId: string;
  selectedRunId: string | null;
  selectedPanel: ContractWorkbenchPanel;
  attemptView: AttemptView;
  runs: ContractProjectRunRecord[];
  publishes: ContractProjectPublishRecord[];
  surfaces: ContractProjectSurface[];
  previewTargets: ContractProjectPreviewTarget[];
  selectedRunWorkbench: GenerationWorkbenchData | null;
  selectedRunSuggestionsPath: string | null;
  hasStoredAuthSession: boolean;
}
