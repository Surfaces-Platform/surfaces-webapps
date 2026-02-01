export type SignalSeverity = "info" | "warning" | "error";

export interface SignalListItem {
  signalKey: string;
  severity: SignalSeverity;
  type: string;
  title: string;
  surface: string;
  lastSeen: string;
}

export interface SignalDetail extends SignalListItem {
  metadata: Record<string, string>;
  occurrences: Array<{ id: string; at: string }>;
}

const mockSignals: SignalDetail[] = [
  {
    signalKey: "drift-surface-tokens-001",
    severity: "warning",
    type: "drift",
    title: "Token value drift in primary button",
    surface: "surfaces-web",
    lastSeen: "2025-01-30T14:22:00Z",
    metadata: { contract: "surfaces.web", boundary: "tokens" },
    occurrences: [
      { id: "occ-1", at: "2025-01-30T14:22:00Z" },
      { id: "occ-2", at: "2025-01-29T09:10:00Z" },
    ],
  },
  {
    signalKey: "validate-fail-002",
    severity: "error",
    type: "validation",
    title: "Required field missing in response",
    surface: "interfacectl",
    lastSeen: "2025-01-30T11:05:00Z",
    metadata: { contract: "surfaces.web", rule: "required" },
    occurrences: [{ id: "occ-3", at: "2025-01-30T11:05:00Z" }],
  },
  {
    signalKey: "info-audit-003",
    severity: "info",
    type: "audit",
    title: "Scheduled diff completed",
    surface: "surfaceops",
    lastSeen: "2025-01-30T08:00:00Z",
    metadata: { job: "nightly-diff" },
    occurrences: [],
  },
];

export function getSignalsList(): SignalListItem[] {
  return mockSignals.map(({ occurrences: _, metadata: __, ...rest }) => rest);
}

export function getSignalByKey(signalKey: string): SignalDetail | undefined {
  return mockSignals.find((s) => s.signalKey === signalKey);
}
