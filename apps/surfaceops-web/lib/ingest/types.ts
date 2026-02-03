export interface EventEnvelope {
  eventId: string;
  workspaceId: string;
  projectId: string;
  source: {
    producer: string;
    command: "diff" | "validate" | "enforce" | "compile";
    producerVersion?: string;
  };
  run: {
    runId: string;
    timestamp: string;
  };
  contract?: {
    contractId?: string;
    contractVersion?: string;
    schemaVersion?: string;
  };
  payload: Record<string, unknown>;
}

export interface IngestRequest {
  events: EventEnvelope[];
}

export interface IngestAccepted {
  eventId: string;
}

export interface IngestRejected {
  eventId: string;
  code: string;
  message: string;
}

export interface IngestResponse {
  accepted: IngestAccepted[];
  rejected: IngestRejected[];
}
