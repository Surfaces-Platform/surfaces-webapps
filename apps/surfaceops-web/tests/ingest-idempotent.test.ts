import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Pool } from "pg";
import fs from "fs";
import path from "path";
import { POST } from "@/app/v1/ingest/events/route";

const DATABASE_URL = process.env.DATABASE_URL;
const FIXTURE_PATH = path.join(process.cwd(), "fixtures", "v1", "ingest", "diff.min.json");

describe("POST /v1/ingest/events idempotency", () => {
  let pool: Pool;

  beforeAll(async () => {
    if (!DATABASE_URL) {
      throw new Error("DATABASE_URL must be set for ingest tests");
    }
    pool = new Pool({ connectionString: DATABASE_URL });
    // Run migrations so events table exists
    const migrationsDir = path.join(process.cwd(), "migrations");
    const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
      await pool.query(sql);
    }
  });

  afterAll(async () => {
    await pool?.end();
  });

  it("accepts same event twice and stores only one row", async () => {
    // 1) Clean DB state
    await pool.query("TRUNCATE TABLE events");

    const body = JSON.parse(fs.readFileSync(FIXTURE_PATH, "utf8")) as { events: unknown[] };
    const eventId = (body.events[0] as { eventId: string }).eventId;

    const req = (payload: unknown) =>
      new Request("http://localhost/v1/ingest/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

    // 2) POST fixture once
    const res1 = await POST(req(body));
    const data1 = (await res1.json()) as { accepted: { eventId: string }[]; rejected: unknown[] };
    expect(data1.accepted.some((a) => a.eventId === eventId)).toBe(true);

    // 3) POST fixture again
    const res2 = await POST(req(body));
    const data2 = (await res2.json()) as { accepted: { eventId: string }[]; rejected: unknown[] };
    expect(data2.accepted.some((a) => a.eventId === eventId)).toBe(true);

    // 4) Query events table for event_id count
    const countResult = await pool.query(
      "SELECT COUNT(*)::int AS count FROM events WHERE event_id = $1",
      [eventId]
    );
    const count = countResult.rows[0]?.count ?? 0;

    // 5) Assert count == 1
    expect(count).toBe(1);
  });
});
