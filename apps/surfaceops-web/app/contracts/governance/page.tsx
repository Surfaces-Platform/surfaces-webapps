import Link from "next/link";
import { redirect } from "next/navigation";
import { colors } from "@surfaces/ui/tokens/colors";
import { isSurfaceOpsLocalWorkbenchEnabled } from "@/lib/auth-bypass";
import { loadBootstrapGovernanceHandoff } from "@/lib/contracts";
import { loadLocalWorkbenchData } from "@/lib/local-workbench/service";
import {
  resolveSurfaceOpsDesktopRuntimePath,
  shouldRedirectToSurfaceOpsDesktopWorkbench,
} from "@/lib/product-surface";
import { LocalWorkbench } from "./_components/local-workbench";

export const dynamic = "force-dynamic";

function readSearchParam(
  value: string | string[] | undefined,
): string | null {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }
  if (Array.isArray(value) && typeof value[0] === "string" && value[0].trim().length > 0) {
    return value[0];
  }
  return null;
}

function readRouteSearchParam(
  params: Record<string, string | string[] | undefined> | undefined,
  key: string,
): string | null {
  if (!params) {
    return null;
  }
  return readSearchParam(params[key]);
}

function BootstrapHandoffCard({
  handoff,
}: {
  handoff: NonNullable<ReturnType<typeof loadBootstrapGovernanceHandoff>>;
}) {
  return (
    <div
      style={{
        maxWidth: 960,
        margin: "0 auto 24px",
        padding: 24,
        borderRadius: 18,
        backgroundColor: colors.neutral[0],
        border: `1px solid ${colors.neutral[200]}`,
        boxShadow: "0 14px 30px rgba(15, 23, 42, 0.06)",
      }}
    >
      <div style={{ fontSize: 12, color: colors.neutral[600], textTransform: "uppercase", letterSpacing: "0.08em" }}>
        UI AST Bootstrap
      </div>
      <h1 style={{ fontSize: 30, fontWeight: 800, margin: "8px 0 12px" }}>
        {handoff.displayName} is ready for governance review
      </h1>
      <p style={{ margin: 0, color: colors.neutral[600], lineHeight: 1.6 }}>
        The bootstrap flow created a canonical UI AST, a derived compatibility contract, and a compiled bundle.
        Use this page as the first review stop; runs remain available as diagnostics.
      </p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 18, fontSize: 13, color: colors.neutral[600] }}>
        <div>Status: {handoff.status ?? "unknown"}</div>
        <div>Nodes: {handoff.nodeCount}</div>
        <div>Platforms: {handoff.platforms.join(", ") || "none"}</div>
        <div>Migration escalations: {handoff.migrationEscalationCount}</div>
      </div>
      <div style={{ marginTop: 18, display: "grid", gap: 8, fontSize: 13, color: colors.neutral[600] }}>
        <div>UI AST: {handoff.paths.astPath}</div>
        <div>Compatibility contract: {handoff.paths.compatibilityContractPath ?? "Unavailable"}</div>
        <div>Extraction report: {handoff.paths.reportPath ?? "Unavailable"}</div>
        <div>Bundle: {handoff.paths.bundleRoot ?? "Unavailable"}</div>
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 20 }}>
        <Link
          href={`/contracts/runs/${handoff.surfaceId}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 999,
            padding: "10px 16px",
            backgroundColor: colors.neutral[900],
            color: colors.neutral[0],
            textDecoration: "none",
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          Open Run History
        </Link>
      </div>
    </div>
  );
}

export default async function GovernanceIndexPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (shouldRedirectToSurfaceOpsDesktopWorkbench("/contracts/governance")) {
    redirect(resolveSurfaceOpsDesktopRuntimePath());
  }

  const params = await searchParams;
  const bootstrapSurfaceId = readRouteSearchParam(params, "bootstrapSurfaceId");
  const bootstrapRunId = readRouteSearchParam(params, "bootstrapRunId");
  const bootstrapHandoff = bootstrapSurfaceId
    ? loadBootstrapGovernanceHandoff(bootstrapSurfaceId, bootstrapRunId)
    : null;

  if (!isSurfaceOpsLocalWorkbenchEnabled() && !bootstrapHandoff) {
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
            UI AST Workbench
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

  if (!isSurfaceOpsLocalWorkbenchEnabled() && bootstrapHandoff) {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: colors.neutral[50],
          color: colors.neutral[900],
          padding: 24,
        }}
      >
        <BootstrapHandoffCard handoff={bootstrapHandoff} />
      </div>
    );
  }

  const data = await loadLocalWorkbenchData();
  return (
    <>
      {bootstrapHandoff ? (
        <div style={{ backgroundColor: colors.neutral[50], padding: "24px 24px 0" }}>
          <BootstrapHandoffCard handoff={bootstrapHandoff} />
        </div>
      ) : null}
      <LocalWorkbench data={data} />
    </>
  );
}
