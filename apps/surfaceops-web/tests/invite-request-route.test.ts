import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/invite-request/route";

const { createInviteRequest, parseInviteRequestPayload } = vi.hoisted(() => ({
  createInviteRequest: vi.fn(),
  parseInviteRequestPayload: vi.fn(),
}));

vi.mock("@/lib/invite-requests", () => ({
  createInviteRequest,
  parseInviteRequestPayload,
}));

describe("POST /api/invite-request", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("accepts a valid email payload", async () => {
    parseInviteRequestPayload.mockReturnValue({
      email: "team@example.com",
      source: "landing-page",
    });
    createInviteRequest.mockResolvedValue("created");

    const response = await POST(
      new Request("http://localhost/api/invite-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "team@example.com" }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(parseInviteRequestPayload).toHaveBeenCalledWith({ email: "team@example.com" });
    expect(createInviteRequest).toHaveBeenCalledWith({
      email: "team@example.com",
      source: "landing-page",
    });
  });

  it("rejects invalid payloads", async () => {
    parseInviteRequestPayload.mockImplementation(() => {
      throw new Error("Email must be valid.");
    });

    const response = await POST(
      new Request("http://localhost/api/invite-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "bad" }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "Email must be valid.",
    });
  });

  it("accepts duplicate emails idempotently", async () => {
    parseInviteRequestPayload.mockReturnValue({
      email: "team@example.com",
      source: "landing-page",
    });
    createInviteRequest.mockResolvedValue("duplicate");

    const response = await POST(
      new Request("http://localhost/api/invite-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "team@example.com" }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it("rejects invalid json payloads", async () => {
    const response = await POST(
      new Request("http://localhost/api/invite-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{",
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "Invalid JSON payload.",
    });
  });
});
