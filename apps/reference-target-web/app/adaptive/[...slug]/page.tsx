export const runtime = "edge";

export default async function AdaptiveReferencePage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await params;
  const path = slug?.join("/") || "(root)";

  return (
    <main className="main" data-contract="page-container">
      <section className="section" data-contract-section="landing.hero">
        <h1 className="heroTitle">Reference Target Adaptive Test</h1>
        <p className="heroText">
          Runtime (edge) checks run on <code>/adaptive/*</code> for the reference target fixture.
        </p>
        <p className="heroText">
          Current path: <code>{path}</code>
        </p>
        <pre>
{`curl -i -H "x-proposed-bg: rgba(15, 23, 42, 0.3)" "http://localhost:3004/adaptive/test?section=hero"`}
        </pre>
        <p className="heroText">
          Missing <code>section</code> yields 422 with a <code>sections.required</code> violation.
        </p>
      </section>
    </main>
  );
}
