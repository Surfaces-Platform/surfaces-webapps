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
  const [surfaceName, setSurfaceName] = useState("");
  const [surfaceId, setSurfaceId] = useState("");
  const [authMode, setAuthMode] = useState<"none" | "browser-session">("none");
  const [authProfileName, setAuthProfileName] = useState("");
  const [continueOnGate, setContinueOnGate] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("submitting");
    setError(null);
    try {
      const response = await fetch("/api/onboarding/extract", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          url,
          surfaceName: surfaceName.trim() || undefined,
          surfaceId: surfaceId.trim() || undefined,
          authMode,
          authProfileName: authMode === "browser-session" ? authProfileName.trim() || undefined : undefined,
          continueOnGate,
        }),
      });
      const data = (await response.json()) as {
        state?: string;
        surfaceId?: string;
        error?: string;
      };
      if (!response.ok || data.state !== "completed" || !data.surfaceId) {
        throw new Error(data.error || "Onboarding failed.");
      }
      router.push(`/contracts/runs/${data.surfaceId}`);
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
      <label
        htmlFor="onboarding-url"
        style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "8px" }}
      >
        Surface URL
      </label>
      <input
        id="onboarding-url"
        type="url"
        required
        placeholder="https://customer.example.com"
        value={url}
        onChange={(event) => setUrl(event.target.value)}
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
          {authMode === "browser-session" && (
            <div>
              <label style={{ fontSize: "12px", color: colors.neutral[600] }}>Saved auth profile</label>
              <input
                required
                value={authProfileName}
                onChange={(event) => setAuthProfileName(event.target.value)}
                placeholder="example-profile"
                style={{
                  width: "100%",
                  borderRadius: "8px",
                  border: `1px solid ${colors.neutral[200]}`,
                  padding: "8px 10px",
                  fontSize: "13px",
                }}
              />
            </div>
          )}
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "12px",
              color: colors.neutral[600],
            }}
          >
            <input
              type="checkbox"
              checked={continueOnGate}
              onChange={(event) => setContinueOnGate(event.target.checked)}
            />
            Continue with provisional output if the URL resolves to a login or access-denied page
          </label>
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
        {state === "submitting" ? "Generating..." : "Generate First Contract"}
      </button>
    </form>
  );
}
