"use client";

import Link from "next/link";
import { colors } from "@surfaces/ui/tokens/colors";

export default function Home() {
  return (
    <div
      className="min-h-screen w-full"
      style={{
        backgroundColor: colors.neutral[50],
        fontFamily: "Inter, sans-serif",
        color: colors.neutral[900],
      }}
    >
      <div className="contract-container" style={{ maxWidth: 1120, margin: "0 auto", padding: "96px 24px" }}>
        <section data-contract-section="landing.hero">
          <h1
            style={{
              fontSize: "32px",
              fontWeight: 600,
              lineHeight: 1.2,
              marginBottom: "24px",
            }}
          >
            SurfaceOps
          </h1>
          <p
            style={{
              fontSize: "14px",
              fontWeight: 400,
              lineHeight: 1.6,
              marginBottom: "24px",
              color: colors.neutral[800],
            }}
          >
            SurfaceOps is an operational dashboard for surface contracts. It shows
            which surfaces pass validation, who owns them, and what changed
            recently. Contracts define expectations; extraction reports what was
            found in the code.
          </p>
          <p
            style={{
              fontSize: "14px",
              fontWeight: 400,
              lineHeight: 1.6,
              marginBottom: "32px",
              color: colors.neutral[600],
            }}
          >
            Contract details, validation status, and change history require
            authentication. Log in to inspect surfaces, owners, and expectations.
          </p>
        </section>
        <section data-contract-section="landing.guidance" style={{ marginBottom: "32px" }}>
          <p style={{ fontSize: "14px", lineHeight: 1.6, color: colors.neutral[600] }}>
            Sign in to view the surface list, validation outcomes, and change log.
          </p>
        </section>
        <section data-contract-section="landing.actions">
          <Link
            href="/contracts"
            style={{
              display: "inline-block",
              fontSize: "14px",
              fontWeight: 600,
              padding: "12px 24px",
              backgroundColor: colors.structure.primary,
              color: colors.neutral[0],
              textDecoration: "none",
              borderRadius: "6px",
            }}
          >
            Log in to view surfaces
          </Link>
        </section>
      </div>
    </div>
  );
}
