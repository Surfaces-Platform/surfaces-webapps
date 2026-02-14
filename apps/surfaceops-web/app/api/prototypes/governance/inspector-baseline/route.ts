import { NextRequest, NextResponse } from "next/server";
import {
  assertWritablePrototype,
  getInspectorBaselineForTarget,
  upsertInspectorBaselineForTarget,
} from "@/app/contracts/governance/_lib/governance-persistence";
import { loadGovernancePrototypeSelection } from "@/app/contracts/governance/_lib/prototype-registry";
import type { SurfaceContract } from "@/app/contracts/governance/_lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BaselineRequest = {
  prototypeId?: string;
  targetUrl?: string;
  contract?: SurfaceContract;
  requiredSections?: string[];
  sourceSnapshotCapturedAt?: string;
};

function isValidTargetUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function isSurfaceContract(value: unknown): value is SurfaceContract {
  if (!value || typeof value !== "object") return false;
  const contract = value as SurfaceContract;
  return (
    typeof contract.surface === "string" &&
    typeof contract.version === "string" &&
    typeof contract.layout?.requireGlobalHeader === "boolean" &&
    typeof contract.layout?.requirePageContainer === "boolean" &&
    typeof contract.navigation?.maxDepth === "number" &&
    typeof contract.navigation?.requireSinglePrimaryNav === "boolean" &&
    typeof contract.generation?.mustUseDesignTokens === "boolean"
  );
}

export async function GET(request: NextRequest) {
  const prototypeId = request.nextUrl.searchParams.get("prototypeId")?.trim() ?? "";
  const targetUrl = request.nextUrl.searchParams.get("targetUrl")?.trim() ?? "";
  if (!prototypeId || !targetUrl) {
    return NextResponse.json(
      { ok: false, error: "prototypeId and targetUrl are required." },
      { status: 400 },
    );
  }
  if (!isValidTargetUrl(targetUrl)) {
    return NextResponse.json({ ok: false, error: "Invalid targetUrl." }, { status: 400 });
  }

  try {
    assertWritablePrototype(prototypeId);
    const selection = loadGovernancePrototypeSelection(prototypeId, null);
    const baseline = getInspectorBaselineForTarget(
      selection.workspaceRoot,
      selection.selected,
      targetUrl,
    );
    return NextResponse.json({ ok: true, baseline }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to load baseline." },
      { status: 403 },
    );
  }
}

export async function POST(request: Request) {
  let payload: BaselineRequest;
  try {
    payload = (await request.json()) as BaselineRequest;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON payload." }, { status: 400 });
  }

  const prototypeId = payload.prototypeId?.trim() ?? "";
  const targetUrl = payload.targetUrl?.trim() ?? "";
  if (!prototypeId || !targetUrl || !payload.contract) {
    return NextResponse.json(
      { ok: false, error: "prototypeId, targetUrl, and contract are required." },
      { status: 400 },
    );
  }
  if (!isValidTargetUrl(targetUrl)) {
    return NextResponse.json({ ok: false, error: "Invalid targetUrl." }, { status: 400 });
  }
  if (!isSurfaceContract(payload.contract)) {
    return NextResponse.json(
      { ok: false, error: "Invalid contract payload." },
      { status: 400 },
    );
  }

  try {
    assertWritablePrototype(prototypeId);
    const selection = loadGovernancePrototypeSelection(prototypeId, null);
    const baseline = upsertInspectorBaselineForTarget(selection.workspaceRoot, selection.selected, {
      targetUrl,
      contract: payload.contract,
      requiredSections: Array.isArray(payload.requiredSections) ? payload.requiredSections : [],
      sourceSnapshotCapturedAt:
        payload.sourceSnapshotCapturedAt && payload.sourceSnapshotCapturedAt.trim().length > 0
          ? payload.sourceSnapshotCapturedAt
          : new Date().toISOString(),
    });
    return NextResponse.json({ ok: true, baseline }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to save baseline." },
      { status: 403 },
    );
  }
}
