import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as POSTChat } from "@/app/api/contracts/local/chat/route";
import { POST as POSTRerun } from "@/app/api/contracts/local/rerun/route";
import { POST as POSTSuggestion } from "@/app/api/contracts/local/suggestions/[runId]/[suggestionId]/route";

const mocked = vi.hoisted(() => ({
  appendLocalWorkbenchChatMessage: vi.fn(),
  startLocalWorkbenchRerun: vi.fn(),
  reviewLocalWorkbenchSuggestion: vi.fn(),
}));

vi.mock("@/lib/local-workbench/service", () => ({
  appendLocalWorkbenchChatMessage: mocked.appendLocalWorkbenchChatMessage,
  startLocalWorkbenchRerun: mocked.startLocalWorkbenchRerun,
  reviewLocalWorkbenchSuggestion: mocked.reviewLocalWorkbenchSuggestion,
}));

describe("local workbench routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts a local rerun", async () => {
    mocked.startLocalWorkbenchRerun.mockResolvedValue({ runId: "run-1", status: "succeeded" });
    const response = await POSTRerun();
    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      run: { runId: "run-1", status: "succeeded" },
    });
  });

  it("appends a local contract chat message", async () => {
    mocked.appendLocalWorkbenchChatMessage.mockResolvedValue(undefined);
    const response = await POSTChat(
      new Request("http://localhost/api/contracts/local/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "add highlight color #8BAE3F" }),
      }),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(mocked.appendLocalWorkbenchChatMessage).toHaveBeenCalledWith({
      message: "add highlight color #8BAE3F",
    });
  });

  it("reviews a local suggestion", async () => {
    mocked.reviewLocalWorkbenchSuggestion.mockResolvedValue(undefined);
    const response = await POSTSuggestion(
      new Request("http://localhost/api/contracts/local/suggestions/run-1/suggestion-1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: "accepted" }),
      }),
      { params: Promise.resolve({ runId: "run-1", suggestionId: "suggestion-1" }) },
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });
});
