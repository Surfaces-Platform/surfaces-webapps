import { NextResponse } from "next/server";
import {
  appendSnapshotFromLatestExtraction,
  assertWritablePrototype,
} from "@/app/contracts/governance/_lib/governance-persistence";
import { loadGovernancePrototypeSelection } from "@/app/contracts/governance/_lib/prototype-registry";

type SnapshotRequest = {
  prototypeId?: string;
};

export async function POST(request: Request) {
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
    const selection = loadGovernancePrototypeSelection(prototypeId, null);
    const result = appendSnapshotFromLatestExtraction(selection.workspaceRoot, selection.selected);
    return NextResponse.json(
      {
        ok: true,
        snapshotId: result.snapshotId,
        createdAt: result.createdAt,
        baselineSnapshotId: result.index.baselineSnapshotId,
        latestSnapshotId: result.index.latestSnapshotId,
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
