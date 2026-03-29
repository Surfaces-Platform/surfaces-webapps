"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { colors } from "@surfaces/ui/tokens/colors";

type OnboardingState = "idle" | "submitting" | "failed";

export function OnboardingForm() {
  const router = useRouter();
  const [state, setState] = useState<OnboardingState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [appRoot, setAppRoot] = useState("");
  const [surfaceName, setSurfaceName] = useState("");
  const [surfaceId, setSurfaceId] = useState("");
  const [authMode, setAuthMode] = useState<"none" | "browser-session">("none");
  const [extractMode, setExtractMode] = useState<"remote-url" | "local-root">("remote-url");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("submitting");
    setError(null);
    try {
      const response = await fetch("/api/onboarding/extract", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          url: extractMode === "remote-url" ? url : undefined,
          appRoot: extractMode === "local-root" ? appRoot : undefined,
          surfaceName: surfaceName.trim() || undefined,
          surfaceId: surfaceId.trim() || undefined,
          authMode: extractMode === "remote-url" ? authMode : "none",
          extractMode,
        }),
      });
      const data = (await response.json()) as {
        state?: string;
        surfaceId?: string;
        recommendedRoute?: string;
        error?: string;
      };
      if (!response.ok || data.state !== "completed" || !data.surfaceId) {
        throw new Error(data.error || "Onboarding failed.");
      }
      router.push(data.recommendedRoute || "/contracts/governance");
      router.refresh();
    } catch (submissionError) {
      setState("failed");
      setError(submissionError instanceof Error ? submissionError.message : "Unexpected error.");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        backgroundColor: colors.neutral[0],
        border: `1px solid ${colors.neutral[200]}`,
        borderRadius: "10px",
        padding: "20px",
      }}
    >
      <div style={{ display: "grid", gap: "12px", marginBottom: "12px" }}>
        <div>
          <label style={{ fontSize: "12px", color: colors.neutral[600], marginBottom: "6px", display: "block" }}>
            Source
          </label>
          <select
            value={extractMode}
            onChange={(event) => setExtractMode(event.target.value as "remote-url" | "local-root")}
            style={{
              width: "100%",
              borderRadius: "8px",
              border: `1px solid ${colors.neutral[200]}`,
              padding: "8px 10px",
              fontSize: "13px",
              backgroundColor: colors.neutral[0],
            }}
          >
            <option value="remote-url">Inspect a live URL</option>
            <option value="local-root">Inspect a local app root</option>
          </select>
        </div>
      </div>
      <label
        htmlFor={extractMode === "remote-url" ? "onboarding-url" : "onboarding-app-root"}
        style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "8px" }}
      >
        {extractMode === "remote-url" ? "Surface URL" : "Local app root"}
      </label>
      <input
        id={extractMode === "remote-url" ? "onboarding-url" : "onboarding-app-root"}
        type={extractMode === "remote-url" ? "url" : "text"}
        required
        placeholder={extractMode === "remote-url" ? "https://customer.example.com" : "apps/reference-target-web"}
        value={extractMode === "remote-url" ? url : appRoot}
        onChange={(event) => {
          if (extractMode === "remote-url") {
            setUrl(event.target.value);
            return;
          }
          setAppRoot(event.target.value);
        }}
        style={{
          width: "100%",
          borderRadius: "8px",
          border: `1px solid ${colors.neutral[200]}`,
          padding: "10px 12px",
          fontSize: "14px",
          marginBottom: "12px",
        }}
      />

      <details style={{ marginBottom: "16px" }}>
        <summary style={{ fontSize: "13px", color: colors.neutral[600], cursor: "pointer" }}>
          Advanced options
        </summary>
        <div style={{ marginTop: "12px", display: "grid", gap: "12px" }}>
          <div>
            <label style={{ fontSize: "12px", color: colors.neutral[600] }}>Surface name</label>
            <input
              value={surfaceName}
              onChange={(event) => setSurfaceName(event.target.value)}
              style={{
                width: "100%",
                borderRadius: "8px",
                border: `1px solid ${colors.neutral[200]}`,
                padding: "8px 10px",
                fontSize: "13px",
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: "12px", color: colors.neutral[600] }}>Surface ID override</label>
            <input
              value={surfaceId}
              onChange={(event) => setSurfaceId(event.target.value)}
              style={{
                width: "100%",
                borderRadius: "8px",
                border: `1px solid ${colors.neutral[200]}`,
                padding: "8px 10px",
                fontSize: "13px",
              }}
              />
            </div>
          {extractMode === "remote-url" && (
            <div>
              <label style={{ fontSize: "12px", color: colors.neutral[600] }}>Auth mode</label>
              <select
                value={authMode}
                onChange={(event) => setAuthMode(event.target.value as "none" | "browser-session")}
                style={{
                  width: "100%",
                  borderRadius: "8px",
                  border: `1px solid ${colors.neutral[200]}`,
                  padding: "8px 10px",
                  fontSize: "13px",
                  backgroundColor: colors.neutral[0],
                }}
              >
                <option value="none">none</option>
                <option value="browser-session">browser-session</option>
              </select>
            </div>
          )}
        </div>
      </details>

      {error && (
        <p style={{ color: colors.contract.invalid, fontSize: "13px", marginBottom: "10px" }}>{error}</p>
      )}

      <button
        type="submit"
        disabled={state === "submitting"}
        style={{
          width: "100%",
          border: "none",
          borderRadius: "8px",
          padding: "12px 14px",
          fontSize: "14px",
          fontWeight: 600,
          color: colors.neutral[0],
          backgroundColor: state === "submitting" ? colors.neutral[400] : colors.neutral[900],
          cursor: state === "submitting" ? "wait" : "pointer",
        }}
      >
        {state === "submitting" ? "Bootstrapping UI AST..." : "Create Governed Surface"}
      </button>
    </form>
  );
}
