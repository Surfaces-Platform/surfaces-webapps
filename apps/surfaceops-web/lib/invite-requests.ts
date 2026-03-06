import { getPool } from "@/lib/db";

export interface InviteRequestPayload {
  email?: unknown;
}

export interface InviteRequestRecord {
  email: string;
  source: string;
}

export function normalizeInviteEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidInviteEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function parseInviteRequestPayload(payload: InviteRequestPayload): InviteRequestRecord {
  if (typeof payload.email !== "string") {
    throw new Error("Email is required.");
  }

  const email = normalizeInviteEmail(payload.email);
  if (!email) {
    throw new Error("Email is required.");
  }
  if (!isValidInviteEmail(email)) {
    throw new Error("Email must be valid.");
  }

  return {
    email,
    source: "landing-page",
  };
}

export async function createInviteRequest(record: InviteRequestRecord): Promise<"created" | "duplicate"> {
  const pool = getPool();
  try {
    await pool.query(
      `INSERT INTO invite_requests (email, source)
       VALUES ($1, $2)`,
      [record.email, record.source],
    );
    return "created";
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
      return "duplicate";
    }
    throw error;
  }
}
