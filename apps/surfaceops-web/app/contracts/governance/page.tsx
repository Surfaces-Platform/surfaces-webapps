import { GovernanceWorkspace } from "./_components/governance-workspace";
import { buildExtractionDiff } from "./_lib/prototype-diff";
import { loadGovernancePrototypeSelection } from "./_lib/prototype-registry";

export default async function GovernancePage({
  searchParams,
}: {
  searchParams: Promise<{ prototype?: string; snapshot?: string; panel?: string }>;
}) {
  const params = await searchParams;
  const selection = loadGovernancePrototypeSelection(
    params.prototype ?? null,
    params.snapshot ?? null,
  );
  const extraction = selection.extractionReport as { extracted?: { routes?: unknown[]; authAware?: boolean } };
  const previewRoutes = Array.isArray(extraction.extracted?.routes)
    ? extraction.extracted.routes.filter(
        (route): route is string => typeof route === "string",
      )
    : ["/"];
  const latestDecisionByDiff = new Map<
    string,
    { action: "accept" | "reject" | "evolve"; createdAt: string }
  >();
  for (const decision of selection.decisions) {
    if (decision.snapshotId !== selection.selectedSnapshotId) continue;
    const current = latestDecisionByDiff.get(decision.diffItemId);
    if (!current || decision.createdAt >= current.createdAt) {
      latestDecisionByDiff.set(decision.diffItemId, {
        action: decision.action,
        createdAt: decision.createdAt,
      });
    }
  }
  const diffItems = buildExtractionDiff(
    selection.baselineSnapshotReport as Record<string, unknown>,
    selection.selectedSnapshotReport as Record<string, unknown>,
    Object.fromEntries(latestDecisionByDiff),
  );

  return (
    <GovernanceWorkspace
      initialContract={selection.draftContract}
      prototypeOptions={selection.manifest.prototypes.map((prototype) => ({
        id: prototype.id,
        title: prototype.title,
        status: prototype.status,
      }))}
      selectedPrototypeId={selection.selected.id}
      selectedPrototypeTitle={selection.selected.title}
      selectedPrototypeStatus={selection.selected.status}
      previewRoutes={previewRoutes}
      previewBaseUrl={process.env.NEXT_PUBLIC_SURFACE_PREVIEW_BASE_URL ?? "https://surfaces.systems"}
      diffItems={diffItems}
      latestExtractionUpdatedAt={selection.latestExtractionUpdatedAt}
      canWrite={selection.canWrite}
      selectedSnapshotId={selection.selectedSnapshotId}
      baselineSnapshotId={selection.baselineSnapshotId}
      snapshotTimeline={selection.snapshotTimeline}
      selectedSnapshotSignals={{
        authAware: Boolean(
          (
            selection.selectedSnapshotReport as { extracted?: { authAware?: boolean } }
          ).extracted?.authAware,
        ),
        hasShell: Boolean(
          (
            selection.selectedSnapshotReport as { extracted?: { hasShell?: boolean } }
          ).extracted?.hasShell,
        ),
      }}
      initialPanel={
        params.panel === "review"
          ? "snapshotModal"
          : params.panel === "contract"
            ? "contractDrawer"
            : "editor"
      }
    />
  );
}
