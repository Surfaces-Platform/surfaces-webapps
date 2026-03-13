"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { colors } from "@surfaces/ui/tokens/colors";

const DEFAULT_PREVIEW_TARGETS = [
  {
    surfaceId: "surfaceops-web",
    url: "https://surfaceopsai-git-main-surfaces-platform.vercel.app/contracts/governance",
    urlTemplate: "https://surfaceopsai-git-{branch}-surfaces-platform.vercel.app/contracts/governance",
    waitFor: "Contract workbench",
    authSessionKey: "surfaceops-governance-preview",
  },
];

const DEFAULT_SURFACES = [
  {
    id: "surfaceops-web",
    label: "SurfaceOps Web",
    implementationBrief:
      "Implement the protected SurfaceOps contract workbench while preserving workspace auth, project selection, and the operator shell.",
  },
];

function inputStyle() {
  return {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 12,
    border: `1px solid ${colors.neutral[200]}`,
    backgroundColor: colors.neutral[0],
    color: colors.neutral[900],
    fontSize: 14,
  } as const;
}

export function ProjectConnectForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [previewTargetsJson, setPreviewTargetsJson] = useState(
    JSON.stringify(DEFAULT_PREVIEW_TARGETS, null, 2),
  );
  const [surfacesJson, setSurfacesJson] = useState(
    JSON.stringify(DEFAULT_SURFACES, null, 2),
  );

  async function onSubmit(formData: FormData) {
    setError(null);
    const payload = {
      name: String(formData.get("name") ?? ""),
      githubOwner: String(formData.get("githubOwner") ?? ""),
      githubRepo: String(formData.get("githubRepo") ?? ""),
      githubToken: String(formData.get("githubToken") ?? ""),
      contractPath: String(formData.get("contractPath") ?? ""),
      previewTargets: JSON.parse(previewTargetsJson),
      surfaces: JSON.parse(surfacesJson),
    };
    const response = await fetch("/api/contracts/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await response.json();
    if (!response.ok || !json.ok) {
      throw new Error(json.error ?? `Project connection failed with ${response.status}.`);
    }
    router.push(`/contracts/governance/${encodeURIComponent(json.project.projectId)}`);
    router.refresh();
  }

  return (
    <form
      action={(formData) => {
        startTransition(async () => {
          try {
            await onSubmit(formData);
          } catch (submitError) {
            setError(submitError instanceof Error ? submitError.message : String(submitError));
          }
        });
      }}
      style={{ display: "grid", gap: 16 }}
    >
      <div style={{ display: "grid", gap: 8 }}>
        <label htmlFor="name" style={{ fontSize: 13, fontWeight: 700 }}>Project name</label>
        <input id="name" name="name" defaultValue="SurfaceOps Protected Dogfood" style={inputStyle()} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ display: "grid", gap: 8 }}>
          <label htmlFor="githubOwner" style={{ fontSize: 13, fontWeight: 700 }}>GitHub owner</label>
          <input id="githubOwner" name="githubOwner" defaultValue="Surfaces-Platform" style={inputStyle()} />
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          <label htmlFor="githubRepo" style={{ fontSize: 13, fontWeight: 700 }}>GitHub repo</label>
          <input id="githubRepo" name="githubRepo" defaultValue="surfaces-webapps" style={inputStyle()} />
        </div>
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        <label htmlFor="githubToken" style={{ fontSize: 13, fontWeight: 700 }}>GitHub token</label>
        <input id="githubToken" name="githubToken" type="password" style={inputStyle()} />
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        <label htmlFor="contractPath" style={{ fontSize: 13, fontWeight: 700 }}>Canonical contract path</label>
        <input
          id="contractPath"
          name="contractPath"
          defaultValue="contracts/generated/surfaceops-web.contract.json"
          style={inputStyle()}
        />
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        <label htmlFor="previewTargets" style={{ fontSize: 13, fontWeight: 700 }}>Preview targets JSON</label>
        <textarea
          id="previewTargets"
          value={previewTargetsJson}
          onChange={(event) => setPreviewTargetsJson(event.target.value)}
          style={{ ...inputStyle(), minHeight: 140, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
        />
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        <label htmlFor="surfaces" style={{ fontSize: 13, fontWeight: 700 }}>Surface config JSON</label>
        <textarea
          id="surfaces"
          value={surfacesJson}
          onChange={(event) => setSurfacesJson(event.target.value)}
          style={{ ...inputStyle(), minHeight: 160, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
        />
      </div>
      {error ? (
        <div style={{ padding: 12, borderRadius: 12, backgroundColor: "#fee2e2", color: "#991b1b", fontSize: 13 }}>
          {error}
        </div>
      ) : null}
      <button
        type="submit"
        disabled={isPending}
        style={{
          padding: "12px 16px",
          borderRadius: 999,
          border: "none",
          backgroundColor: colors.structure.primary,
          color: colors.neutral[0],
          fontSize: 14,
          fontWeight: 700,
          cursor: isPending ? "progress" : "pointer",
        }}
      >
        {isPending ? "Connecting..." : "Connect GitHub project"}
      </button>
    </form>
  );
}
