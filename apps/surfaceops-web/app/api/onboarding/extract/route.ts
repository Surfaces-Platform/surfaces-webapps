import { NextResponse } from "next/server";
import { getPolicyMembership } from "@/lib/contracts";
import { runSurfaceOpsOnboarding, type SurfaceOpsOnboardingRequest } from "@/lib/interfacectl-onboarding";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let payload: SurfaceOpsOnboardingRequest;
  try {
    payload = (await request.json()) as SurfaceOpsOnboardingRequest;
  } catch {
    return NextResponse.json(
      { state: "failed", error: "Invalid JSON payload." },
      { status: 400 },
    );
  }

  try {
    const result = await runSurfaceOpsOnboarding(payload);
    if (result.state === "failed") {
      return NextResponse.json(
        { state: "failed", error: typeof result.message === "string" ? result.message : "Onboarding failed." },
        { status: 400 },
      );
    }
    if (result.state === "auth_required") {
      return NextResponse.json(
        {
          state: "auth_required",
          surfaceId: result.surfaceId,
          gateStatus: result.gateStatus,
          error: typeof result.message === "string" ? result.message : "Authentication is required.",
        },
        { status: 409 },
      );
    }

    const membership = getPolicyMembership(String(result.surfaceId));
    const extraction = (result.extractionReport ?? {}) as Record<string, unknown>;
    const onboarding = (extraction.onboarding ?? {}) as Record<string, unknown>;
    const detection = (onboarding.detection ?? {}) as Record<string, unknown>;
    const artifacts = typeof result.artifacts === "object" && result.artifacts
      ? result.artifacts as Record<string, unknown>
      : {};

    return NextResponse.json(
      {
        state: "completed",
        surfaceId: result.surfaceId,
        runId: result.runId,
        status: result.status,
        gateStatus: result.gateStatus,
        inPolicyContract: membership.inPolicyContract,
        extraction: {
          adapter: typeof detection.adapter === "string" ? detection.adapter : "unknown",
          framework: typeof detection.framework === "string" ? detection.framework : "unknown",
          profile: typeof detection.profile === "string" ? detection.profile : "web-first-run",
          reportPath: typeof artifacts.reportPath === "string" ? artifacts.reportPath : undefined,
          contractPath: typeof artifacts.contractPath === "string" ? artifacts.contractPath : undefined,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected onboarding failure.";
    return NextResponse.json({ state: "failed", error: message }, { status: 500 });
  }
}
