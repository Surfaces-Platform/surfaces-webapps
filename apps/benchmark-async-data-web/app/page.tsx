import { DataStream } from "./_components/data-stream";
import { HealthPanel } from "./_components/health-panel";
import { QueueRail } from "./_components/queue-rail";
import { getDashboardSnapshot } from "../lib/mock-data";

type Params = {
  state?: string;
  simulateUnobservableFeedback?: string;
  simulateMissingErrorRetry?: string;
  simulatePendingActionEnabled?: string;
  simulateMissingLastGoodContent?: string;
};

type AsyncViewState = "success" | "loading" | "empty" | "error";

function readFlag(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function readAsyncViewState(value: string | undefined): AsyncViewState {
  switch (value?.trim().toLowerCase()) {
    case "loading":
      return "loading";
    case "empty":
      return "empty";
    case "error":
      return "error";
    default:
      return "success";
  }
}

function stateProps(
  enabled: boolean,
  stateId: AsyncViewState,
): Record<string, string> {
  return enabled
    ? {
        "data-contract-state-id": stateId,
        "data-contract-state-kind": stateId,
      }
    : {};
}

function stateIdProps(
  enabled: boolean,
  stateId: AsyncViewState,
): Record<string, string> {
  return enabled ? { "data-contract-state-id": stateId } : {};
}

function preserveLastGoodProps(
  enabled: boolean,
  stateId: AsyncViewState,
): Record<string, string> {
  return enabled ? { "data-contract-state-id": stateId, "data-contract-preserve-last-good": "true" } : {};
}

function heroCopy(state: AsyncViewState) {
  switch (state) {
    case "loading":
      return {
        title: "Refreshing async dashboard",
        description:
          "The dashboard is refreshing stream, queue, and health data while preserving the page structure.",
      };
    case "empty":
      return {
        title: "Async dashboard is clear",
        description:
          "The queue is empty right now, so the dashboard switches to a contract-scoped empty state.",
      };
    case "error":
      return {
        title: "Dashboard refresh failed",
        description:
          "The dashboard keeps the last good sections visible and exposes an explicit recovery action.",
      };
    default:
      return {
        title: "Queue health and release drift",
        description:
          "A server-fetched dashboard that splits async data rendering across multiple components for benchmark repair scenarios.",
      };
  }
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const params = await searchParams;
  const state = readAsyncViewState(params.state);
  const simulateUnobservableFeedback = readFlag(params.simulateUnobservableFeedback);
  const simulateMissingErrorRetry = readFlag(params.simulateMissingErrorRetry);
  const simulatePendingActionEnabled = readFlag(params.simulatePendingActionEnabled);
  const simulateMissingLastGoodContent = readFlag(params.simulateMissingLastGoodContent);
  const includeFeedbackMarkers = !simulateUnobservableFeedback;

  const snapshot = await getDashboardSnapshot();
  const copy = heroCopy(state);

  const streamItems =
    state === "empty" ? [] : snapshot.stream;
  const queueItems =
    state === "empty" ? [] : snapshot.queue;
  const healthItems =
    state === "empty" ? [] : snapshot.health;

  const refreshAction =
    state === "loading" ? (
      <button
        className="heroActionButton"
        type="button"
        data-contract-interaction="submit-refresh"
        {...stateIdProps(includeFeedbackMarkers, state)}
        {...(!simulatePendingActionEnabled ? { disabled: true } : {})}
      >
        Refreshing dashboard
      </button>
    ) : null;

  const retryAction =
    state === "error" && !simulateMissingErrorRetry ? (
      <button
        className="retryButton"
        type="button"
        data-contract-recovery-action="retry"
        {...stateIdProps(includeFeedbackMarkers, state)}
      >
        Retry dashboard
      </button>
    ) : null;

  return (
    <div className="asyncPage">
      <header className="asyncHeader" data-contract="global-header">
        <div className="asyncHeaderInner">
          <div>
            <span className="eyebrow">Benchmark fixture</span>
            <h1 className="heroTitle">Async dashboard benchmark</h1>
          </div>
          <nav aria-label="Primary navigation" role="navigation" data-contract="primary-nav">
            <ul className="asyncNav">
              <li><a href="#stream">Stream</a></li>
              <li><a href="#queue">Queue</a></li>
              <li><a href="#health">Health</a></li>
            </ul>
          </nav>
        </div>
      </header>

      <main
        className="asyncMain"
        data-contract="page-container"
        data-contract-container="page-container"
        style={{ maxWidth: "1180px" }}
        {...stateProps(includeFeedbackMarkers, state)}
        {...(state === "error" && !simulateMissingLastGoodContent
          ? preserveLastGoodProps(includeFeedbackMarkers, state)
          : {})}
      >
        <section
          className="heroPanel"
          data-contract-section="data.hero"
          {...stateIdProps(includeFeedbackMarkers, state)}
        >
          <h2>{copy.title}</h2>
          <p>{copy.description}</p>
          <div className="heroActions">
            {refreshAction}
            {state === "error" ? retryAction : null}
          </div>
        </section>

        <div className="asyncGrid">
          <DataStream items={streamItems} stateId={includeFeedbackMarkers ? state : undefined} />
          <QueueRail items={queueItems} stateId={includeFeedbackMarkers ? state : undefined} />
          <HealthPanel health={healthItems} stateId={includeFeedbackMarkers ? state : undefined} />
        </div>
      </main>
    </div>
  );
}
