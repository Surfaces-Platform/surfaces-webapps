import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  getSession: vi.fn(),
  requireSession: vi.fn(),
  headers: vi.fn(),
}));

vi.mock("@surfaces/platform-auth", () => ({
  getSession: mocked.getSession,
  requireSession: mocked.requireSession,
}));

vi.mock("next/headers", () => ({
  headers: mocked.headers,
}));

describe("workspace auth bypass", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env.SURFACEOPS_TEST_WORKSPACE_ID;
    delete process.env.VERCEL_ENV;
    process.env.SURFACEOPS_TEST_BYPASS_AUTH = "1";
    (process.env as Record<string, string | undefined>).NODE_ENV = "test";
  });

  it("returns a synthetic workspace session in non-production bypass mode", async () => {
    const module = await import("@/lib/workspace-auth");
    const session = await module.requireWorkspaceSession(new Request("http://localhost/api/contracts/projects"));

    expect(session.workspaceId).toBe("ws-local-default");
    expect(session.session.authMode).toBe("test-bypass");
    expect(mocked.requireSession).not.toHaveBeenCalled();
  });

  it("respects an explicit bypass workspace id", async () => {
    process.env.SURFACEOPS_TEST_WORKSPACE_ID = "ws-dogfood";
    const module = await import("@/lib/workspace-auth");

    expect(await module.getWorkspaceIdFromCurrentRequest()).toBe("ws-dogfood");
    expect(await module.getWorkspaceSession(new Request("http://localhost/contracts"))).toMatchObject({
      workspaceId: "ws-dogfood",
    });
    expect(mocked.getSession).not.toHaveBeenCalled();
  });

  it("allows the bypass in preview deployments when the explicit flag is set", async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    process.env.VERCEL_ENV = "preview";
    const module = await import("@/lib/workspace-auth");

    expect(await module.requireWorkspaceSession(new Request("https://surfaceopsai-git-main-surfaces-platform.vercel.app/contracts"))).toMatchObject({
      workspaceId: "ws-local-default",
    });
    expect(mocked.requireSession).not.toHaveBeenCalled();
  });
});
