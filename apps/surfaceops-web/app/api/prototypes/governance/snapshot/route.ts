import { NextResponse } from "next/server";
import {
  appendSnapshotFromLatestExtraction,
  assertWritablePrototype,
} from "@/app/contracts/governance/_lib/governance-persistence";
import { loadGovernancePrototypeSelection } from "@/app/contracts/governance/_lib/prototype-registry";
import { getWorkspaceSession } from "@/lib/workspace-auth";

type SnapshotRequest = {
  prototypeId?: string;
};

export async function POST(request: Request) {
  const workspaceSession = await getWorkspaceSession(request);
  if (!workspaceSession) {
    return NextResponse.json({ ok: false, error: "Session required." }, { status: 401 });
  }

  let payload: SnapshotRequest;
  try {
    payload = (await request.json()) as SnapshotRequest;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON payload." }, { status: 400 });
  }

  const prototypeId = payload.prototypeId?.trim() || "";
  if (!prototypeId) {
    return NextResponse.json({ ok: false, error: "prototypeId is required." }, { status: 400 });
  }

  try {
    assertWritablePrototype(prototypeId);
    const selection = await loadGovernancePrototypeSelection(
      prototypeId,
      null,
      workspaceSession.workspaceId,
    );
    const result = await appendSnapshotFromLatestExtraction(
      selection.workspaceRoot,
      selection.selected,
      workspaceSession.workspaceId,
    );
    return NextResponse.json(
      {
        ok: true,
        snapshotId: result.value.snapshotId,
        createdAt: result.value.createdAt,
        baselineSnapshotId: result.value.index.baselineSnapshotId,
        latestSnapshotId: result.value.index.latestSnapshotId,
        storeMode: result.storeMeta.mode,
        workspaceId: result.storeMeta.workspaceId,
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Snapshot failed." },
      { status: 403 },
    );
  }
}
