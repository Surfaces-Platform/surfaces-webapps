import path from "node:path";
import { spawnSync } from "node:child_process";
import { NextResponse } from "next/server";
import { assertWritablePrototype } from "@/app/contracts/governance/_lib/governance-persistence";
import { loadGovernancePrototypeSelection } from "@/app/contracts/governance/_lib/prototype-registry";
import { getWorkspaceSession } from "@/lib/workspace-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ExtractRequest = {
  prototypeId?: string;
};

function extractErrorMessage(output: { stdout: string; stderr: string; status: number | null }): string {
  const stderr = output.stderr.trim();
  if (stderr.length > 0) return stderr.split("\n").slice(-4).join("\n");
  const stdout = output.stdout.trim();
  if (stdout.length > 0) return stdout.split("\n").slice(-4).join("\n");
  return `Extraction failed (exit code: ${output.status ?? "unknown"}).`;
}

export async function POST(request: Request) {
  const workspaceSession = await getWorkspaceSession(request);
  if (!workspaceSession) {
    return NextResponse.json({ ok: false, error: "Session required." }, { status: 401 });
  }

  let payload: ExtractRequest;
  try {
    payload = (await request.json()) as ExtractRequest;
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
    const scriptPath = path.join(
      selection.workspaceRoot,
      "scripts",
      "prototypes",
      "snapshot-governance-extraction.mjs",
    );

    const run = spawnSync(
      process.execPath,
      [scriptPath, "--root", selection.workspaceRoot, "--prototype", prototypeId],
      {
        cwd: selection.workspaceRoot,
        encoding: "utf-8",
      },
    );

    if (run.status !== 0) {
      return NextResponse.json(
        {
          ok: false,
          error: extractErrorMessage({
            stdout: run.stdout ?? "",
            stderr: run.stderr ?? "",
            status: run.status,
          }),
        },
        { status: 500 },
      );
    }

    const refreshed = await loadGovernancePrototypeSelection(
      prototypeId,
      null,
      workspaceSession.workspaceId,
    );
    return NextResponse.json(
      {
        ok: true,
        snapshotId: refreshed.selectedSnapshotId,
        createdAt: refreshed.selectedSnapshotCreatedAt,
        baselineSnapshotId: refreshed.baselineSnapshotId,
        latestSnapshotId: refreshed.snapshotIndex?.latestSnapshotId ?? refreshed.selectedSnapshotId,
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Extract failed." },
      { status: 403 },
    );
  }
}
