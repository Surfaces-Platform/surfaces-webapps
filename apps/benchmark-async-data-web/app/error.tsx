"use client";

export default function ErrorBoundary(input: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="asyncPage">
      <main className="asyncMain">
        <section className="healthPanel">
          <h2>Async snapshot failed</h2>
          <p>{input.error.message || "The benchmark data request failed before the dashboard could render."}</p>
          <button className="retryButton" onClick={input.reset} type="button">
            Retry dashboard
          </button>
        </section>
      </main>
    </div>
  );
}
