import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as GETProjects, POST as POSTProjects } from "@/app/api/contracts/projects/route";
import { PUT as PUTDraft } from "@/app/api/contracts/projects/[projectId]/draft/route";
import { POST as POSTRerun } from "@/app/api/contracts/projects/[projectId]/reruns/route";
import { POST as POSTAuthSession } from "@/app/api/contracts/projects/[projectId]/auth-sessions/route";
import { POST as POSTPublish } from "@/app/api/contracts/projects/[projectId]/publish/route";
import { POST as POSTSuggestion } from "@/app/api/contracts/projects/[projectId]/reruns/[runId]/suggestions/[suggestionId]/route";

const mocked = vi.hoisted(() => ({
  requireWorkspaceSession: vi.fn(),
  listProjectsForWorkspace: vi.fn(),
  createConnectedProjectFromGithub: vi.fn(),
  loadProjectWorkspace: vi.fn(),
  saveProjectDraftText: vi.fn(),
  createProjectRerun: vi.fn(),
  saveProjectAuthSessionState: vi.fn(),
  publishProjectDraft: vi.fn(),
  reviewProjectSuggestion: vi.fn(),
}));

vi.mock("@/lib/workspace-auth", () => ({
  requireWorkspaceSession: mocked.requireWorkspaceSession,
}));

vi.mock("@/lib/contract-workbench/service", () => ({
  listProjectsForWorkspace: mocked.listProjectsForWorkspace,
  createConnectedProjectFromGithub: mocked.createConnectedProjectFromGithub,
  loadProjectWorkspace: mocked.loadProjectWorkspace,
  saveProjectDraftText: mocked.saveProjectDraftText,
  createProjectRerun: mocked.createProjectRerun,
  saveProjectAuthSessionState: mocked.saveProjectAuthSessionState,
  publishProjectDraft: mocked.publishProjectDraft,
  reviewProjectSuggestion: mocked.reviewProjectSuggestion,
}));

describe("contract workbench routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.requireWorkspaceSession.mockResolvedValue({ workspaceId: "ws-test", session: { workspaceId: "ws-test" } });
  });

  it("lists connected projects", async () => {
    mocked.listProjectsForWorkspace.mockResolvedValue([{ projectId: "proj-1" }]);
    const response = await GETProjects(new Request("http://localhost/api/contracts/projects"));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, projects: [{ projectId: "proj-1" }] });
  });

  it("creates a connected project", async () => {
    mocked.createConnectedProjectFromGithub.mockResolvedValue({ projectId: "proj-1" });
    const response = await POSTProjects(new Request("http://localhost/api/contracts/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Demo" }),
    }));
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ ok: true, project: { projectId: "proj-1" } });
  });

  it("saves a draft", async () => {
    mocked.saveProjectDraftText.mockResolvedValue({ sha256: "a".repeat(64), updatedAt: "2026-03-13T00:00:00.000Z" });
    const response = await PUTDraft(
      new Request("http://localhost/api/contracts/projects/proj-1/draft", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "{\n}" }),
      }),
      { params: Promise.resolve({ projectId: "proj-1" }) },
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      draft: { sha256: "a".repeat(64), updatedAt: "2026-03-13T00:00:00.000Z" },
    });
  });

  it("starts a rerun", async () => {
    mocked.createProjectRerun.mockResolvedValue({ runId: "run-1" });
    const response = await POSTRerun(
      new Request("http://localhost/api/contracts/projects/proj-1/reruns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ surfaceId: "surfaces-web" }),
      }),
      { params: Promise.resolve({ projectId: "proj-1" }) },
    );
    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({ ok: true, run: { runId: "run-1" } });
  });

  it("stores preview auth session state", async () => {
    mocked.saveProjectAuthSessionState.mockResolvedValue({ ok: true });
    const response = await POSTAuthSession(
      new Request("http://localhost/api/contracts/projects/proj-1/auth-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authSessionKey: "preview-default",
          surfaceId: "surfaces-web",
          previewOrigin: "https://preview.example.com",
          storageState: { cookies: [], origins: [] },
        }),
      }),
      { params: Promise.resolve({ projectId: "proj-1" }) },
    );
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ ok: true, result: { ok: true } });
  });

  it("starts publish flow", async () => {
    mocked.publishProjectDraft.mockResolvedValue({ publishId: "pub-1", pullRequestUrl: "https://github.com/example/pr/1" });
    const response = await POSTPublish(
      new Request("http://localhost/api/contracts/projects/proj-1/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ projectId: "proj-1" }) },
    );
    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      publish: { publishId: "pub-1", pullRequestUrl: "https://github.com/example/pr/1" },
    });
  });

  it("reviews and applies a suggestion decision", async () => {
    mocked.reviewProjectSuggestion.mockResolvedValue({ updatedAt: "2026-03-13T00:00:00.000Z", draftSha256: "b".repeat(64) });
    const response = await POSTSuggestion(
      new Request("http://localhost/api/contracts/projects/proj-1/reruns/run-1/suggestions/sug-1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: "accepted", rationale: "Looks right." }),
      }),
      { params: Promise.resolve({ projectId: "proj-1", runId: "run-1", suggestionId: "sug-1" }) },
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      result: { updatedAt: "2026-03-13T00:00:00.000Z", draftSha256: "b".repeat(64) },
    });
  });
});
