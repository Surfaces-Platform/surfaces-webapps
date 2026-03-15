type Snapshot = {
  title: string;
  description: string;
  stream: Array<{ id: string; title: string; detail: string }>;
  queue: Array<{ id: string; label: string; detail: string }>;
  health: Array<{ id: string; label: string; value: string }>;
};

const SNAPSHOT: Snapshot = {
  title: "Queue health and release drift",
  description:
    "A server-fetched dashboard that splits async data rendering across multiple components for benchmark repair scenarios.",
  stream: [
    { id: "deploy", title: "Deploy sync", detail: "Contract deltas merged into the preview queue in 3m." },
    { id: "audit", title: "Audit ingest", detail: "Governance run artifacts ingested and normalized." },
  ],
  queue: [
    { id: "red", label: "Priority review", detail: "2 surfaces waiting on layout repairs." },
    { id: "amber", label: "Token cleanup", detail: "4 follow-up edits remain in the next batch." },
  ],
  health: [
    { id: "latency", label: "Adapter latency", value: "184ms" },
    { id: "preview", label: "Preview success", value: "98.4%" },
    { id: "coverage", label: "Section coverage", value: "91%" },
  ],
};

export async function getDashboardSnapshot(): Promise<Snapshot> {
  await new Promise((resolve) => setTimeout(resolve, 5));
  return SNAPSHOT;
}
