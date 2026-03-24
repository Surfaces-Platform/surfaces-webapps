"use client";

import { useId, useState, type FormEvent } from "react";
import { colors } from "../tokens/colors";

type SubmitState = "idle" | "success" | "error";
type ReleaseUpdatesPanelVariant = "default" | "hero";

export interface ReleaseUpdatesPanelProps {
  buttonLabel?: string;
  formLabel?: string;
  submitLabel?: string;
  idleMessage?: string;
  successMessage?: string;
  submitUrl?: string;
  variant?: ReleaseUpdatesPanelVariant;
}

export function ReleaseUpdatesPanel({
  buttonLabel = "Get Desktop Updates",
  formLabel = "Work email",
  submitLabel = "Submit",
  idleMessage = "Enter your work email and we'll send SurfaceOps desktop release updates, including new alpha drops and stable promotions.",
  successMessage = "Thanks. We'll send SurfaceOps desktop release updates to this email.",
  submitUrl = "/api/invite-request",
  variant = "default",
}: ReleaseUpdatesPanelProps = {}) {
  const [formOpen, setFormOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const panelId = useId();
  const formId = `${panelId}-form`;
  const inputId = `${panelId}-email`;
  const statusId = `${panelId}-status`;
  const heroVariant = variant === "hero";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitState("idle");
    setMessage("");

    try {
      const response = await fetch(submitUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const body = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !body.ok) {
        throw new Error(body.error ?? "Unable to save your update request.");
      }

      setSubmitState("success");
      setMessage(successMessage);
      setEmail("");
    } catch (error) {
      setSubmitState("error");
      setMessage(error instanceof Error ? error.message : "Unable to save your update request.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      data-testid="release-updates-panel"
      style={{
        display: "grid",
        gap: heroVariant ? "12px" : "16px",
        alignItems: "start",
        width: "100%",
        maxWidth: heroVariant ? "640px" : "100%",
      }}
    >
      <button
        type="button"
        data-testid="release-updates-trigger"
        aria-expanded={formOpen}
        aria-controls={formId}
        onClick={() => setFormOpen(true)}
        disabled={formOpen}
        style={{
          width: "fit-content",
          fontSize: "14px",
          fontWeight: heroVariant ? 700 : 600,
          minHeight: heroVariant ? "46px" : undefined,
          padding: heroVariant ? "0 20px" : "12px 24px",
          backgroundColor: colors.structure.primary,
          color: colors.neutral[0],
          border: "none",
          borderRadius: heroVariant ? "999px" : "6px",
          cursor: formOpen ? "default" : "pointer",
          opacity: formOpen ? 0.8 : 1,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all var(--contract-motion-duration) var(--contract-motion-timing)",
        }}
      >
        {buttonLabel}
      </button>

      {formOpen ? (
        <form
          id={formId}
          data-testid="release-updates-form"
          onSubmit={handleSubmit}
          style={{
            display: "grid",
            gap: "12px",
            padding: heroVariant ? "20px" : "24px",
            borderRadius: "6px",
            border: `1px solid ${colors.neutral[200]}`,
            backgroundColor: colors.neutral[0],
          }}
        >
          <label
            htmlFor={inputId}
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: colors.neutral[800],
              letterSpacing: "0.02em",
              textTransform: "uppercase",
            }}
          >
            {formLabel}
          </label>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <input
              id={inputId}
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@company.com"
              required
              aria-describedby={statusId}
              style={{
                flex: "1 1 260px",
                minHeight: heroVariant ? "46px" : "44px",
                borderRadius: "6px",
                border: `1px solid ${colors.neutral[400]}`,
                padding: "0 16px",
                fontSize: "14px",
                color: colors.neutral[900],
                backgroundColor: colors.neutral[50],
              }}
            />
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                minHeight: heroVariant ? "46px" : "44px",
                padding: "0 18px",
                borderRadius: "6px",
                border: "none",
                backgroundColor: colors.neutral[900],
                color: colors.neutral[0],
                fontWeight: 600,
                cursor: isSubmitting ? "progress" : "pointer",
                opacity: isSubmitting ? 0.75 : 1,
              }}
            >
              {isSubmitting ? "Submitting..." : submitLabel}
            </button>
          </div>
          <p
            id={statusId}
            data-testid="release-updates-status"
            role={submitState === "error" ? "alert" : "status"}
            style={{
              margin: 0,
              fontSize: "14px",
              color:
                submitState === "error"
                  ? "#B42318"
                  : submitState === "success"
                    ? "#027A48"
                    : colors.neutral[600],
            }}
          >
            {message || idleMessage}
          </p>
        </form>
      ) : null}
    </div>
  );
}
