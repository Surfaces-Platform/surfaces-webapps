import type { Metadata } from "next";
import { publicPageTitleMetadata } from "@/lib/brand-metadata";

export const runtime = "edge";

export const metadata: Metadata = publicPageTitleMetadata("Adaptive Contract Test | Surfaces");

export default async function AdaptiveTestPage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  const path = slug?.join("/") || "(root)";
  return (
    <main className="contract-container" style={{ padding: "2rem" }}>
      <h1>Adaptive Test</h1>
      <p>
        Edge/on-device middleware enforces the contract (including shell-owned primitives) on <code>/adaptive/*</code> routes. Pass a section and optional background via
        query/header. Current path: <code>{path}</code>
      </p>
      <pre>
{`curl -i -H "x-proposed-bg: rgba(15, 23, 42, 0.3)" "http://localhost:3000/adaptive/test?section=hero"`}
      </pre>
      <p>Missing <code>section</code> yields 422 with violation payload.</p>
    </main>
  );
}
