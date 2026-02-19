import { loadGovernancePrototypeSelection } from "../_lib/prototype-registry";
import { InspectorWorkspace } from "./_components/inspector-workspace";
import {
  isAbsoluteHttpUrl,
  normalizeInspectorRouteInput,
  readInspectorUrlState,
} from "./_lib/url-state";
import {
  getInspectorTargetProfile,
  listInspectorTargetProfiles,
  resolveReferenceTargetBaseUrl,
} from "./_lib/target-registry";
import { getWorkspaceIdFromCurrentRequest } from "@/lib/workspace-auth";

function extractRoutes(value: unknown): string[] {
  const maybeRoutes = (
    value as {
      extracted?: { routes?: unknown[] };
    }
  )?.extracted?.routes;
  if (!Array.isArray(maybeRoutes)) return [];
  return maybeRoutes.filter((route): route is string => typeof route === "string");
}

function extractRequiredSections(value: unknown): string[] {
  const surfaces = (value as { surfaces?: unknown[] })?.surfaces;
  if (!Array.isArray(surfaces) || surfaces.length === 0) return [];
  const required = (surfaces[0] as { requiredSections?: unknown[] })?.requiredSections;
  if (!Array.isArray(required)) return [];
  return required.filter((entry): entry is string => typeof entry === "string");
}

export default async function GovernanceInspectorPage({
  searchParams,
}: {
  searchParams: Promise<{
    prototype?: string;
    snapshot?: string;
    route?: string;
    targetMode?: string;
    targetProfile?: string;
    violation?: string;
    node?: string;
    panel?: string;
    category?: string;
  }>;
}) {
  const params = await searchParams;
  const requested = readInspectorUrlState(params);
  const workspaceId = await getWorkspaceIdFromCurrentRequest();
  const selection = await loadGovernancePrototypeSelection(
    requested.prototype ?? null,
    requested.snapshot || null,
    workspaceId,
  );

  const referenceBaseUrl = resolveReferenceTargetBaseUrl(
    process.env.NEXT_PUBLIC_GOVERNANCE_REFERENCE_TARGET_URL ??
      process.env.NEXT_PUBLIC_SURFACE_PREVIEW_BASE_URL,
  );
  const targetProfiles = listInspectorTargetProfiles(referenceBaseUrl);
  const selectedTargetProfile = getInspectorTargetProfile(targetProfiles, requested.targetProfile);

  const routesFromSnapshot = extractRoutes(selection.selectedSnapshotReport);
  const routesFromExtraction = extractRoutes(selection.extractionReport);
  const routeOptions =
    routesFromSnapshot.length > 0
      ? routesFromSnapshot
      : routesFromExtraction.length > 0
        ? routesFromExtraction
        : [selectedTargetProfile.defaultRoute];
  const normalizedRouteOptions = Array.from(
    new Set(routeOptions.map((route) => normalizeInspectorRouteInput(route))),
  );

  let selectedRoute =
    typeof params.route === "string" && params.route.trim().length > 0
      ? normalizeInspectorRouteInput(params.route)
      : requested.targetMode === "reference"
        ? selectedTargetProfile.defaultRoute
        : selectedTargetProfile.baseUrl;

  if (requested.targetMode === "reference" && isAbsoluteHttpUrl(selectedRoute)) {
    selectedRoute = selectedTargetProfile.defaultRoute;
  }
  if (requested.targetMode === "byo" && !isAbsoluteHttpUrl(selectedRoute)) {
    selectedRoute = selectedTargetProfile.baseUrl;
  }

  return (
    <InspectorWorkspace
      prototypeOptions={selection.manifest.prototypes.map((prototype) => ({
        id: prototype.id,
        title: prototype.title,
      }))}
      selectedPrototypeId={selection.selected.id}
      snapshotOptions={selection.snapshotTimeline}
      selectedSnapshotId={selection.selectedSnapshotId}
      baselineSnapshotId={selection.baselineSnapshotId}
      routeOptions={normalizedRouteOptions}
      selectedRoute={selectedRoute}
      targetProfiles={targetProfiles}
      initialTargetMode={requested.targetMode}
      initialTargetProfileId={selectedTargetProfile.id}
      canWrite={selection.canWrite}
      latestExtractionUpdatedAt={selection.latestExtractionUpdatedAt}
      contractDraft={selection.draftContract}
      requiredSections={extractRequiredSections(selection.extractionContract)}
      initialViolationId={requested.violation}
      initialNodeId={requested.node}
      initialCategory={requested.category}
      initialPanel={requested.panel}
    />
  );
}
