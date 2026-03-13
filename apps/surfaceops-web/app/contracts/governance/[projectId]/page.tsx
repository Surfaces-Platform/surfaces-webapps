import { notFound } from "next/navigation";
import { getWorkspaceIdFromCurrentRequest } from "@/lib/workspace-auth";
import { loadProjectWorkspace } from "@/lib/contract-workbench/service";
import { ProjectWorkbench } from "../_components/project-workbench";
import { colors } from "@surfaces/ui/tokens/colors";

export default async function GovernanceProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{
    surface?: string;
    run?: string;
    panel?: string;
    attempt?: string;
  }>;
}) {
  const workspaceId = await getWorkspaceIdFromCurrentRequest();
  const { projectId } = await params;
  const query = await searchParams;

  try {
    const data = await loadProjectWorkspace(workspaceId, projectId, {
      surfaceId: query.surface,
      runId: query.run,
      panel: query.panel,
      attemptView: query.attempt,
    });
    return <ProjectWorkbench data={data} />;
  } catch (error) {
    if (error instanceof Error && error.message.includes("not found")) {
      notFound();
    }
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: colors.neutral[50],
          color: colors.neutral[900],
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div style={{ maxWidth: 680, padding: 24, borderRadius: 18, backgroundColor: colors.neutral[0], border: `1px solid ${colors.neutral[200]}` }}>
          <div style={{ fontSize: 12, color: colors.neutral[600], textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Contract Workbench
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: "8px 0 12px" }}>Project workspace unavailable</h1>
          <p style={{ margin: 0, color: colors.neutral[600], lineHeight: 1.6 }}>
            {error instanceof Error ? error.message : String(error)}
          </p>
        </div>
      </div>
    );
  }
}
