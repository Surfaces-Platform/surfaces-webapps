import { NextResponse } from "next/server";
import {
  appendDecision,
  assertWritablePrototype,
} from "@/app/contracts/governance/_lib/governance-persistence";
import { loadGovernancePrototypeSelection } from "@/app/contracts/governance/_lib/prototype-registry";
import type { GovernanceDecisionAction } from "@/app/contracts/governance/_lib/types";

type DecisionRequest = {
  prototypeId?: string;
  snapshotId?: string;
  diffItemId?: string;
  action?: GovernanceDecisionAction;
  reason?: string;
  actor?: string;
};

function isValidAction(value: unknown): value is GovernanceDecisionAction {
  return value === "accept" || value === "reject" || value === "evolve";
}

export async function POST(request: Request) {
  let payload: DecisionRequest;
  try {
    payload = (await request.json()) as DecisionRequest;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON payload." }, { status: 400 });
  }

  if (!payload.prototypeId || !payload.snapshotId || !payload.diffItemId || !isValidAction(payload.action)) {
    return NextResponse.json(
      { ok: false, error: "prototypeId, snapshotId, diffItemId, and valid action are required." },
      { status: 400 },
    );
  }

  try {
    assertWritablePrototype(payload.prototypeId);
    const selection = loadGovernancePrototypeSelection(payload.prototypeId, payload.snapshotId);
    const decision = appendDecision(selection.workspaceRoot, selection.selected, {
      snapshotId: payload.snapshotId,
      diffItemId: payload.diffItemId,
      action: payload.action,
      reason: payload.reason,
      actor: payload.actor,
    });
    return NextResponse.json({ ok: true, decisionId: decision.decisionId }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Decision failed." },
      { status: 403 },
    );
  }
}
