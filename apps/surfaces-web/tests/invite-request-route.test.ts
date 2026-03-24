import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/invite-request/route";

describe("surfaces-web invite request proxy", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("forwards valid invite requests to surfaceops.ai", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ ok: true }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    ));
    vi.stubEnv("SURFACEOPS_INVITE_REQUEST_URL", "https://surfaceops.ai/api/invite-request");
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      new Request("http://localhost/api/invite-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "team@example.com" }),
      }),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "https://surfaceops.ai/api/invite-request",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "team@example.com" }),
        cache: "no-store",
      }),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it("rejects invalid json payloads before forwarding upstream", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      new Request("http://localhost/api/invite-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{",
      }),
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "Invalid JSON payload.",
    });
  });

  it("passes through upstream validation failures", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ ok: false, error: "Email must be valid." }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    ));
    vi.stubEnv("SURFACEOPS_INVITE_REQUEST_URL", "https://surfaceops.ai/api/invite-request");
    vi.stubGlobal("fetch", fetchMock);

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

  it("passes through upstream server failures", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ ok: false, error: "Unable to save invite request." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    ));
    vi.stubEnv("SURFACEOPS_INVITE_REQUEST_URL", "https://surfaceops.ai/api/invite-request");
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      new Request("http://localhost/api/invite-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "team@example.com" }),
      }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "Unable to save invite request.",
    });
  });
});
