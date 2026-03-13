import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runLocalLlmAgent } from "@/lib/local-workbench/local-llm";

describe("runLocalLlmAgent", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("applies allowed writes and finishes with a touched file list", async () => {
    const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "surfaceops-local-llm-"));
    const pagePath = path.join(repoRoot, "apps", "reference-target-web", "app", "page.tsx");
    await fs.mkdir(path.dirname(pagePath), { recursive: true });
    await fs.writeFile(pagePath, "export default function Page() { return <div>before</div>; }\n", "utf8");

    const responses = [
      {
        output: [
          {
            type: "function_call",
            call_id: "call-1",
            name: "write_file",
            arguments: JSON.stringify({
              path: "apps/reference-target-web/app/page.tsx",
              content: "export default function Page() { return <div>after</div>; }\n",
            }),
          },
        ],
      },
      {
        output: [
          {
            type: "function_call",
            call_id: "call-2",
            name: "finish",
            arguments: JSON.stringify({
              summary: "Updated the reference target hero copy.",
              noChanges: false,
            }),
          },
        ],
      },
    ];

    global.fetch = vi.fn(async () =>
      new Response(JSON.stringify(responses.shift()), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ) as typeof fetch;

    const result = await runLocalLlmAgent({
      config: {
        baseUrl: "http://localhost:1234/v1",
        model: "openai/gpt-oss-20b",
      },
      repoRoot,
      allowedRoots: ["apps/reference-target-web"],
      preparedPayload: { summary: { text: "Keep the fixture deterministic." } },
      implementationBrief: "Make a small contract-guided change.",
    });

    expect(result.noChanges).toBe(false);
    expect(result.summary).toContain("reference target");
    expect(result.touchedFiles).toEqual(["apps/reference-target-web/app/page.tsx"]);
    await expect(fs.readFile(pagePath, "utf8")).resolves.toContain("after");

    const [url, init] = vi.mocked(global.fetch).mock.calls[0] ?? [];
    expect(url).toBe("http://localhost:1234/v1/responses");
    expect(init?.body ? JSON.parse(String(init.body)).tools[0] : null).toMatchObject({
      type: "function",
      name: "list_allowed_files",
    });
  });

  it("rejects forbidden write paths", async () => {
    const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "surfaceops-local-llm-"));
    const pagePath = path.join(repoRoot, "apps", "reference-target-web", "app", "page.tsx");
    await fs.mkdir(path.dirname(pagePath), { recursive: true });
    await fs.writeFile(pagePath, "export default function Page() { return null; }\n", "utf8");

    global.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          output: [
            {
              type: "function_call",
              call_id: "call-1",
              name: "write_file",
              arguments: JSON.stringify({
                path: "docs/strategy.md",
                content: "# nope\n",
              }),
            },
          ],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    ) as typeof fetch;

    await expect(
      runLocalLlmAgent({
        config: {
          baseUrl: "http://localhost:1234/v1",
          model: "openai/gpt-oss-20b",
        },
        repoRoot,
        allowedRoots: ["apps/reference-target-web"],
        preparedPayload: { summary: { text: "Keep the fixture deterministic." } },
        implementationBrief: "Make a small contract-guided change.",
      }),
    ).rejects.toThrow(/Forbidden file path/);
  });

  it("records no-op completion cleanly", async () => {
    const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "surfaceops-local-llm-"));
    await fs.mkdir(path.join(repoRoot, "apps", "reference-target-web", "app"), { recursive: true });

    global.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          output: [
            {
              type: "function_call",
              call_id: "call-1",
              name: "finish",
              arguments: JSON.stringify({
                summary: "No change needed for the deterministic fixture.",
                noChanges: true,
              }),
            },
          ],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    ) as typeof fetch;

    const result = await runLocalLlmAgent({
      config: {
        baseUrl: "http://localhost:1234/v1",
        model: "openai/gpt-oss-20b",
      },
      repoRoot,
      allowedRoots: ["apps/reference-target-web"],
      preparedPayload: { summary: { text: "Keep the fixture deterministic." } },
      implementationBrief: "Make a small contract-guided change.",
    });

    expect(result.noChanges).toBe(true);
    expect(result.touchedFiles).toEqual([]);
  });

  it("rejects malformed responses tool arguments", async () => {
    const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "surfaceops-local-llm-"));
    await fs.mkdir(path.join(repoRoot, "apps", "reference-target-web", "app"), { recursive: true });

    global.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          output: [
            {
              type: "function_call",
              call_id: "call-1",
              name: "write_file",
              arguments: "{bad-json",
            },
          ],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    ) as typeof fetch;

    await expect(
      runLocalLlmAgent({
        config: {
          baseUrl: "http://localhost:1234/v1",
          model: "openai/gpt-oss-20b",
        },
        repoRoot,
        allowedRoots: ["apps/reference-target-web"],
        preparedPayload: { summary: { text: "Keep the fixture deterministic." } },
        implementationBrief: "Make a small contract-guided change.",
      }),
    ).rejects.toThrow(/malformed arguments/i);
  });
});
