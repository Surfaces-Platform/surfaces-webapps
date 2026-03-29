import { NextResponse } from "next/server";
import {
  runOnboardingExtraction,
  validateOnboardingRequest,
  type OnboardingExtractRequest,
} from "@/lib/contracts";

export async function POST(request: Request) {
  let payload: OnboardingExtractRequest;
  try {
    payload = (await request.json()) as OnboardingExtractRequest;
  } catch {
    return NextResponse.json(
      { state: "failed", error: "Invalid JSON payload." },
      { status: 400 },
    );
  }

  const validation = validateOnboardingRequest(payload);
  if (!validation.ok) {
    return NextResponse.json(
      { state: "failed", error: validation.errors.join(" ") },
      { status: 400 },
    );
  }

  const result = await runOnboardingExtraction({
    url: payload.url,
    appRoot: payload.appRoot,
    surfaceName: payload.surfaceName,
    surfaceId: payload.surfaceId,
    authMode: payload.authMode === "browser-session" ? "browser-session" : "none",
    extractMode: payload.extractMode === "local-root" ? "local-root" : "remote-url",
  });

  if (result.state === "failed") {
    return NextResponse.json(result, { status: 500 });
  }
  return NextResponse.json(result, { status: 200 });
}
