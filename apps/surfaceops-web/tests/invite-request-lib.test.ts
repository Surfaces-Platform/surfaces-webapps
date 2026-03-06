import { describe, expect, it, vi } from "vitest";
import {
  createInviteRequest,
  normalizeInviteEmail,
  parseInviteRequestPayload,
} from "@/lib/invite-requests";

const query = vi.fn();

vi.mock("@/lib/db", () => ({
  getPool: () => ({
    query,
  }),
}));

describe("invite request helpers", () => {
  it("normalizes and validates email payloads", () => {
    expect(normalizeInviteEmail("  TEAM@Example.COM ")).toBe("team@example.com");
    expect(parseInviteRequestPayload({ email: "  TEAM@Example.COM " })).toEqual({
      email: "team@example.com",
      source: "landing-page",
    });
  });

  it("rejects invalid email payloads", () => {
    expect(() => parseInviteRequestPayload({ email: "bad-email" })).toThrow("Email must be valid.");
    expect(() => parseInviteRequestPayload({})).toThrow("Email is required.");
  });

  it("treats unique-constraint violations as duplicates", async () => {
    query.mockRejectedValueOnce({ code: "23505" });
    await expect(
      createInviteRequest({ email: "team@example.com", source: "landing-page" }),
    ).resolves.toBe("duplicate");
  });
});
