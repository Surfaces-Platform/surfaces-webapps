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
            Surface contract state
          </h1>
          <p
            style={{
              fontSize: "14px",
              fontWeight: 400,
              lineHeight: 1.6,
              marginBottom: "32px",
              color: colors.neutral[800],
            }}
          >
            SurfaceOps shows which surfaces pass and why. Contracts define what each
            surface expects; extraction shows what was found.
          </p>
        </section>
        <section data-contract-section="landing.guidance" style={{ marginBottom: "32px" }}>
          <p style={{ fontSize: "14px", lineHeight: 1.6, color: colors.neutral[600] }}>
            Log in to inspect surfaces, expectations, and validation status.
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
