import { NextResponse } from "next/server";
import {
  applyAcceptedDecisions,
  assertWritablePrototype,
} from "@/app/contracts/governance/_lib/governance-persistence";
import { loadGovernancePrototypeSelection } from "@/app/contracts/governance/_lib/prototype-registry";
import { getWorkspaceSession } from "@/lib/workspace-auth";

type ApplyRequest = {
  prototypeId?: string;
  snapshotId?: string;
  actor?: string;
};

export async function POST(request: Request) {
  const workspaceSession = await getWorkspaceSession(request);
  if (!workspaceSession) {
    return NextResponse.json({ ok: false, error: "Session required." }, { status: 401 });
  }

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
    const selection = await loadGovernancePrototypeSelection(
      payload.prototypeId,
      payload.snapshotId,
      workspaceSession.workspaceId,
    );
    const result = await applyAcceptedDecisions(
      selection.workspaceRoot,
      selection.selected,
      {
      snapshotId: payload.snapshotId,
      actor: payload.actor,
    },
      workspaceSession.workspaceId,
    );
    return NextResponse.json(
      {
        ok: true,
        applied: result.value.applied,
        skipped: result.value.skipped,
        storeMode: result.storeMeta.mode,
        workspaceId: result.storeMeta.workspaceId,
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
