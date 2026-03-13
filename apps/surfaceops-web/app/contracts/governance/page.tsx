import { redirect } from "next/navigation";
import Link from "next/link";
import { colors } from "@surfaces/ui/tokens/colors";
import { getWorkspaceIdFromCurrentRequest } from "@/lib/workspace-auth";
import { listProjectsForWorkspace } from "@/lib/contract-workbench/service";
import { ProjectConnectForm } from "./_components/project-connect-form";

export default async function GovernanceIndexPage() {
  const workspaceId = await getWorkspaceIdFromCurrentRequest();
  let projects: Awaited<ReturnType<typeof listProjectsForWorkspace>> = [];
  let loadError: string | null = null;
  try {
    projects = await listProjectsForWorkspace(workspaceId);
  } catch (error) {
    loadError = error instanceof Error ? error.message : String(error);
  }
  if (projects[0]) {
    redirect(`/contracts/governance/${encodeURIComponent(projects[0].projectId)}`);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: colors.neutral[50],
        color: colors.neutral[900],
      }}
      >
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "72px 24px" }}>
        <div style={{ fontSize: 12, color: colors.neutral[600], textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Contract Workbench
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 800, margin: "10px 0 12px" }}>Connect a GitHub project</h1>
        <p style={{ color: colors.neutral[600], lineHeight: 1.6 }}>
          SurfaceOps keeps the contract working copy, rerun history, preview auth state, and publish flow inside a
          single protected project workspace. Connect a GitHub repository to start editing and rerunning against the
          live contract.
        </p>
        {loadError ? (
          <div
            style={{
              marginTop: 16,
              padding: 14,
              borderRadius: 14,
              backgroundColor: "#fef3c7",
              color: "#92400e",
              fontSize: 14,
            }}
          >
            SurfaceOps could not load project state yet: {loadError}
          </div>
        ) : null}
        <div style={{ ...{ backgroundColor: colors.neutral[0], border: `1px solid ${colors.neutral[200]}`, borderRadius: 20, padding: 24, marginTop: 24 } }}>
          <ProjectConnectForm />
        </div>
        <Link
          href="/contracts"
          style={{
            display: "inline-flex",
            marginTop: 20,
            padding: "10px 14px",
            borderRadius: 999,
            backgroundColor: colors.structure.primary,
            color: colors.neutral[0],
            textDecoration: "none",
            fontWeight: 700,
          }}
        >
          Back to contracts
        </Link>
      </div>
    </div>
  );
}
