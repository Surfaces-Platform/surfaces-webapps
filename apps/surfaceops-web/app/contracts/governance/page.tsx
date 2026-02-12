import { GovernanceWorkspace } from "./_components/governance-workspace";
import { buildExtractionDiff } from "./_lib/prototype-diff";
import { loadGovernancePrototypeSelection } from "./_lib/prototype-registry";

export default async function GovernancePage({
  searchParams,
}: {
  searchParams: Promise<{ prototype?: string }>;
}) {
  const params = await searchParams;
  const selection = loadGovernancePrototypeSelection(params.prototype ?? null);
  const extraction = selection.extractionReport as {
    extracted?: {
      routes?: unknown[];
      designSystemComponents?: unknown[];
      authAware?: boolean;
    };
  };
  const routes = Array.isArray(extraction.extracted?.routes)
    ? extraction.extracted.routes.length
    : 0;
  const designSystemComponents = Array.isArray(
    extraction.extracted?.designSystemComponents,
  )
    ? extraction.extracted.designSystemComponents.length
    : 0;
  const previewRoutes = Array.isArray(extraction.extracted?.routes)
    ? extraction.extracted.routes.filter(
        (route): route is string => typeof route === "string",
      )
    : ["/"];
  const diffItems = buildExtractionDiff(
    selection.extractionReport as Record<string, unknown>,
    selection.latestExtractionReport as Record<string, unknown>,
  );

  return (
    <GovernanceWorkspace
      initialContract={selection.seedContract}
      prototypeOptions={selection.manifest.prototypes.map((prototype) => ({
        id: prototype.id,
        title: prototype.title,
        status: prototype.status,
      }))}
      selectedPrototypeId={selection.selected.id}
      selectedPrototypeTitle={selection.selected.title}
      selectedPrototypeStatus={selection.selected.status}
      selectedPrototypeSummary={selection.selected.summary}
      extractionSummary={{
        routes,
        designSystemComponents,
        authAware: Boolean(extraction.extracted?.authAware),
      }}
      previewRoutes={previewRoutes}
      previewBaseUrl={process.env.NEXT_PUBLIC_SURFACE_PREVIEW_BASE_URL ?? "https://surfaces.systems"}
      diffItems={diffItems}
      latestExtractionUpdatedAt={selection.latestExtractionUpdatedAt}
      usedFallback={selection.usedFallback}
    />
  );
}
