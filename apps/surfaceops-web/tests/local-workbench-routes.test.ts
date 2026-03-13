import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as POSTRerun } from "@/app/api/contracts/local/rerun/route";
import { POST as POSTSuggestion } from "@/app/api/contracts/local/suggestions/[runId]/[suggestionId]/route";

const mocked = vi.hoisted(() => ({
  startLocalWorkbenchRerun: vi.fn(),
  reviewLocalWorkbenchSuggestion: vi.fn(),
}));

vi.mock("@/lib/local-workbench/service", () => ({
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
