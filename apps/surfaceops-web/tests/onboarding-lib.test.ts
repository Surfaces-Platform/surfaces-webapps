import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.resetModules();
  vi.unstubAllGlobals();
});

describe("SurfaceOps onboarding route", () => {
  it("returns auth_required when the shared engine reports a gate", async () => {
    vi.doMock("@/lib/interfacectl-onboarding", () => ({
      runSurfaceOpsOnboarding: vi.fn(async () => ({
        state: "auth_required",
        surfaceId: "example-com",
        gateStatus: "login",
        message: "Authentication is required.",
      })),
    }));

    const { POST } = await import("@/app/api/onboarding/extract/route");
    const response = await POST(
      new Request("http://localhost/api/onboarding/extract", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: "https://example.com" }),
      }),
    );
    const body = await response.json();
    expect(response.status).toBe(409);
    expect(body.state).toBe("auth_required");
    expect(body.gateStatus).toBe("login");
  });

  it("returns completed payload mapped from the shared engine", async () => {
    vi.doMock("@/lib/interfacectl-onboarding", () => ({
      runSurfaceOpsOnboarding: vi.fn(async () => ({
        state: "completed",
        surfaceId: "example-com",
        runId: "run-123",
        status: "warn",
        gateStatus: "ok",
        artifacts: {
          reportPath: "/tmp/example-com.extraction.json",
          contractPath: "/tmp/example-com.contract.json",
        },
        extractionReport: {
          onboarding: {
            detection: {
              adapter: "remote-url-observer",
              framework: "unknown",
              profile: "web-first-run",
            },
          },
        },
      })),
    }));

    const { POST } = await import("@/app/api/onboarding/extract/route");
    const response = await POST(
      new Request("http://localhost/api/onboarding/extract", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: "https://example.com" }),
      }),
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.state).toBe("completed");
    expect(body.surfaceId).toBe("example-com");
    expect(body.extraction.reportPath).toContain(".extraction.json");
  });
});
