import { colors } from "@surfaces/ui/tokens/colors";
import { isSurfaceOpsLocalWorkbenchEnabled } from "@/lib/auth-bypass";
import { loadLocalWorkbenchData } from "@/lib/local-workbench/service";
import { LocalWorkbench } from "./_components/local-workbench";

export default async function GovernanceIndexPage() {
  if (!isSurfaceOpsLocalWorkbenchEnabled()) {
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
        <div style={{ maxWidth: 640, padding: 24, borderRadius: 18, backgroundColor: colors.neutral[0], border: `1px solid ${colors.neutral[200]}` }}>
          <div style={{ fontSize: 12, color: colors.neutral[600], textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Contract Workbench
          </div>
          <h1 style={{ fontSize: 30, fontWeight: 800, margin: "8px 0 12px" }}>Local workbench only</h1>
          <p style={{ margin: 0, color: colors.neutral[600], lineHeight: 1.6 }}>
            This simplified local-LLM workbench is intentionally enabled only for local development.
            Start the app locally to use the reference-target flow.
          </p>
        </div>
      </div>
    );
  }

  const data = await loadLocalWorkbenchData();
  return <LocalWorkbench data={data} />;
}
