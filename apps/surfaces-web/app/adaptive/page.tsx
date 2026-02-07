export const runtime = "edge";

export default function AdaptiveTestPage() {
  return (
    <main className="contract-container" style={{ padding: "2rem" }}>
      <h1>Adaptive Test</h1>
      <p>
        Middleware enforces contract on <code>/adaptive</code> routes. Pass a section and optional background via query/header:
      </p>
      <pre>
        {`curl -i -H "x-proposed-bg: rgba(15, 23, 42, 0.3)" "http://localhost:3000/adaptive/test?section=hero"`}
      </pre>
      <p>Missing <code>section</code> yields 422 with violation payload.</p>
    </main>
  );
}
