export const runtime = "edge";

export default async function AdaptiveReferencePage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await params;
  const path = slug?.join("/") || "(root)";

  return (
    <main
      className="main"
      data-contract="page-container"
      data-contract-container="page-container"
    >
      <section className="section" data-contract-section="landing.hero">
        <h1 className="heroTitle">Reference Target Adaptive Test</h1>
        <p className="heroText">
          Runtime (edge) checks run on <code>/adaptive/*</code> for the reference target fixture.
        </p>
        <p className="heroText">
          Current path: <code>{path}</code>
        </p>
        <pre>
{`curl -i -H "x-proposed-bg: rgba(15, 23, 42, 0.3)" "http://localhost:3004/adaptive/test?section=landing.hero"
curl -i -H "x-proposed-icon-source: lucide-react" "http://localhost:3004/adaptive/test?section=landing.hero"`}
        </pre>
        <p className="heroText">
          Missing <code>section</code> yields 422 with a <code>sections.required</code> violation.
        </p>
        <p className="heroText">
          Icon-source policy is not runtime-enforced in this increment; icon proposals remain informational here and are authoritative at CI/CD time.
        </p>
      </section>
    </main>
  );
}
