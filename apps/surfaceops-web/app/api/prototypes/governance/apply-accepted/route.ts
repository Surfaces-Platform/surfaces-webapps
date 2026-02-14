import { NextResponse } from "next/server";
import {
  applyAcceptedDecisions,
  assertWritablePrototype,
} from "@/app/contracts/governance/_lib/governance-persistence";
import { loadGovernancePrototypeSelection } from "@/app/contracts/governance/_lib/prototype-registry";

type ApplyRequest = {
  prototypeId?: string;
  snapshotId?: string;
  actor?: string;
};

export async function POST(request: Request) {
  let payload: ApplyRequest;
  try {
    payload = (await request.json()) as ApplyRequest;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON payload." }, { status: 400 });
  }

  if (!payload.prototypeId || !payload.snapshotId) {
    return NextResponse.json(
      { ok: false, error: "prototypeId and snapshotId are required." },
      { status: 400 },
    );
  }

  try {
    assertWritablePrototype(payload.prototypeId);
    const selection = loadGovernancePrototypeSelection(payload.prototypeId, payload.snapshotId);
    const result = applyAcceptedDecisions(selection.workspaceRoot, selection.selected, {
      snapshotId: payload.snapshotId,
      actor: payload.actor,
    });
    return NextResponse.json(
      {
        ok: true,
        applied: result.applied,
        skipped: result.skipped,
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Apply failed." },
      { status: 403 },
    );
  }
}
