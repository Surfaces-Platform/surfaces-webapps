import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import type { EventEnvelope, IngestResponse } from "@/lib/ingest/types";

function validateEnvelope(e: unknown): e is EventEnvelope {
  if (!e || typeof e !== "object") return false;
  const o = e as Record<string, unknown>;
  if (typeof o.eventId !== "string" || !o.eventId) return false;
  if (typeof o.workspaceId !== "string" || !o.workspaceId) return false;
  if (typeof o.projectId !== "string" || !o.projectId) return false;
  if (!o.source || typeof o.source !== "object") return false;
  const src = o.source as Record<string, unknown>;
  if (typeof src.command !== "string" || !["diff", "validate", "enforce", "compile"].includes(src.command)) return false;
  if (!o.run || typeof o.run !== "object") return false;
  const run = o.run as Record<string, unknown>;
  if (typeof run.runId !== "string" || !run.runId) return false;
  if (typeof run.timestamp !== "string" || !run.timestamp) return false;
  if (typeof o.payload !== "object" || o.payload === null) return false;
  return true;
}

export async function POST(request: Request): Promise<NextResponse<IngestResponse>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { accepted: [], rejected: [{ eventId: "", code: "invalid_json", message: "Invalid JSON body" }] },
      { status: 400 }
    );
  }

  const events = Array.isArray((body as { events?: unknown }).events)
    ? (body as { events: unknown[] }).events
    : [];

  const accepted: IngestResponse["accepted"] = [];
  const rejected: IngestResponse["rejected"] = [];

  if (events.length === 0) {
    return NextResponse.json({ accepted, rejected });
  }

  let pool;
  try {
    pool = getPool();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Database unavailable";
    return NextResponse.json(
      { accepted: [], rejected: [{ eventId: events[0] && typeof (events[0] as { eventId?: string }).eventId === "string" ? (events[0] as { eventId: string }).eventId : "", code: "db_error", message: msg }] },
      { status: 503 }
    );
  }

  for (const raw of events) {
    if (!validateEnvelope(raw)) {
      const eventId = typeof (raw as { eventId?: string })?.eventId === "string" ? (raw as { eventId: string }).eventId : "";
      rejected.push({ eventId: eventId || "?", code: "invalid_envelope", message: "Missing or invalid required fields" });
      continue;
    }
    const env = raw as EventEnvelope;
    try {
      await pool.query(
        `INSERT INTO events (event_id, workspace_id, project_id, run_id, command, payload, raw_envelope)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb)
         ON CONFLICT (event_id) DO NOTHING`,
        [
          env.eventId,
          env.workspaceId,
          env.projectId,
          env.run.runId,
          env.source.command,
          JSON.stringify(env.payload),
          JSON.stringify(raw),
        ]
      );
      accepted.push({ eventId: env.eventId });
    } catch (err) {
      rejected.push({
        eventId: env.eventId,
        code: "insert_failed",
        message: err instanceof Error ? err.message : "Insert failed",
      });
    }
  }

  return NextResponse.json({ accepted, rejected });
}
