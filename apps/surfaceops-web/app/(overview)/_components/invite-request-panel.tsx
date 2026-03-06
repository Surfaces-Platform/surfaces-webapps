"use client";

import { useState, type FormEvent } from "react";
import { colors } from "@surfaces/ui/tokens/colors";

type SubmitState = "idle" | "success" | "error";

export function InviteRequestPanel() {
  const [formOpen, setFormOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitState("idle");
    setMessage("");

    try {
      const response = await fetch("/api/invite-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const body = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !body.ok) {
        throw new Error(body.error ?? "Unable to save invite request.");
      }

      setSubmitState("success");
      setMessage("Thanks. We’ll reach out when invite access opens.");
      setEmail("");
    } catch (error) {
      setSubmitState("error");
      setMessage(error instanceof Error ? error.message : "Unable to save invite request.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      style={{
        display: "grid",
        gap: "16px",
        alignItems: "start",
        maxWidth: "520px",
      }}
    >
      <button
        type="button"
        onClick={() => setFormOpen(true)}
        disabled={formOpen}
        style={{
          width: "fit-content",
          fontSize: "14px",
          fontWeight: 600,
          padding: "14px 22px",
          backgroundColor: colors.structure.primary,
          color: colors.neutral[0],
          border: "none",
          borderRadius: "999px",
          cursor: formOpen ? "default" : "pointer",
          opacity: formOpen ? 0.8 : 1,
          boxShadow: "0 20px 40px rgba(15, 23, 42, 0.12)",
        }}
      >
        Request An Invite
      </button>

      {formOpen ? (
        <form
          onSubmit={handleSubmit}
          style={{
            display: "grid",
            gap: "12px",
            padding: "20px",
            borderRadius: "20px",
            border: `1px solid ${colors.neutral[200]}`,
            backgroundColor: colors.neutral[0],
            boxShadow: "0 24px 48px rgba(15, 23, 42, 0.08)",
          }}
        >
          <label
            htmlFor="invite-email"
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: colors.neutral[800],
              letterSpacing: "0.02em",
              textTransform: "uppercase",
            }}
          >
            Work email
          </label>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <input
              id="invite-email"
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@company.com"
              required
              aria-describedby="invite-request-status"
              style={{
                flex: "1 1 260px",
                minHeight: "48px",
                borderRadius: "14px",
                border: `1px solid ${colors.neutral[400]}`,
                padding: "0 16px",
                fontSize: "15px",
                color: colors.neutral[900],
                backgroundColor: colors.neutral[50],
              }}
            />
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                minHeight: "48px",
                padding: "0 18px",
                borderRadius: "14px",
                border: "none",
                backgroundColor: colors.neutral[900],
                color: colors.neutral[0],
                fontWeight: 600,
                cursor: isSubmitting ? "progress" : "pointer",
                opacity: isSubmitting ? 0.75 : 1,
              }}
            >
              {isSubmitting ? "Submitting..." : "Submit"}
            </button>
          </div>
          <p
            id="invite-request-status"
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
            {message || "We’re onboarding teams in small batches. Enter your email and we’ll contact you."}
          </p>
        </form>
      ) : null}
    </div>
  );
}
