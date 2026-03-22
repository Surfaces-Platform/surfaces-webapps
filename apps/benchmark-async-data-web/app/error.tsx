"use client";

export default function ErrorBoundary(input: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="asyncPage">
      <main
        className="asyncMain"
        data-contract="page-container"
        data-contract-container="page-container"
        data-contract-state-id="error"
        data-contract-state-kind="error"
        data-contract-preserve-last-good="true"
      >
        <section
          className="healthPanel"
          data-contract-section="data.health"
          data-contract-state-id="error"
        >
          <h2>Async snapshot failed</h2>
          <p>{input.error.message || "The benchmark data request failed before the dashboard could render."}</p>
          <button
            className="retryButton"
            data-contract-state-id="error"
            data-contract-recovery-action="retry"
            onClick={input.reset}
            type="button"
          >
            Retry dashboard
          </button>
        </section>
      </main>
    </div>
  );
}
