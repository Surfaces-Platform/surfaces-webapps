import * as childProcess from "node:child_process";
import { EventEmitter } from "node:events";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { PassThrough } from "node:stream";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runLocalLlmAgent, shapeLocalWorkbenchContract } from "@/lib/local-workbench/local-llm";

const mockedChildProcess = vi.hoisted(() => ({
  actualSpawn: null as unknown as typeof import("node:child_process").spawn,
  spawn: vi.fn(),
}));

vi.mock("node:child_process", async () => {
  const actual = await vi.importActual<typeof import("node:child_process")>("node:child_process");
  mockedChildProcess.actualSpawn = actual.spawn;
  mockedChildProcess.spawn.mockImplementation(actual.spawn);
  return {
    ...actual,
    spawn: mockedChildProcess.spawn,
  };
});

function toolResponse(name: string, args: Record<string, unknown>, callId: string) {
  return {
    output: [
      {
        type: "function_call",
        call_id: callId,
        name,
        arguments: JSON.stringify(args),
      },
    ],
  };
}

async function createRepo(files: Record<string, string>) {
  const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "surfaceops-local-llm-"));
  await Promise.all(
    Object.entries(files).map(async ([relativePath, content]) => {
      const filePath = path.join(repoRoot, relativePath);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, content, "utf8");
    }),
  );
  return repoRoot;
}

function mockFetchSequence(responses: Array<Record<string, unknown>>) {
  global.fetch = vi.fn(async () => {
    const next = responses.shift();
    if (!next) {
      throw new Error("No mocked local model response available.");
    }
    return new Response(JSON.stringify({
      status: "completed",
      incomplete_details: null,
      ...next,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;
}

describe("runLocalLlmAgent", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
    mockedChildProcess.spawn.mockReset();
    mockedChildProcess.spawn.mockImplementation(mockedChildProcess.actualSpawn);
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("applies exact replace edits and exposes only the patch tool", async () => {
    const repoRoot = await createRepo({
      "apps/reference-target-web/app/page.tsx": "export default function Page() { return <div>before</div>; }\n",
    });
    const pagePath = path.join(repoRoot, "apps", "reference-target-web", "app", "page.tsx");

    mockFetchSequence([
      toolResponse("read_file", { path: "apps/reference-target-web/app/page.tsx" }, "call-1"),
      toolResponse(
        "apply_text_edits",
        {
          path: "apps/reference-target-web/app/page.tsx",
          edits: [
            {
              kind: "replace",
              oldText: "<div>before</div>",
              newText: "<div>after</div>",
            },
          ],
        },
        "call-2",
      ),
      toolResponse("finish", { summary: "Updated the reference target hero copy.", noChanges: false }, "call-3"),
    ]);

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
    expect(result.toolCallCount).toBe(3);
    expect(result.writeCount).toBe(1);
    expect(result.lastToolName).toBe("finish");
    await expect(fs.readFile(pagePath, "utf8")).resolves.toContain("after");

    const [url, init] = vi.mocked(global.fetch).mock.calls[0] ?? [];
    const tools = init?.body ? JSON.parse(String(init.body)).tools : [];
    expect(url).toBe("http://localhost:1234/v1/responses");
    expect(tools).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "list_allowed_files" }),
        expect.objectContaining({ name: "apply_text_edits" }),
      ]),
    );
    expect(tools).not.toEqual(expect.arrayContaining([expect.objectContaining({ name: "write_file" })]));
  });

  it("supports insert_before, insert_after, and delete edits in one patch", async () => {
    const repoRoot = await createRepo({
      "apps/reference-target-web/app/page.tsx": "alpha\nbeta\ngamma\n",
    });
    const pagePath = path.join(repoRoot, "apps", "reference-target-web", "app", "page.tsx");

    mockFetchSequence([
      toolResponse("read_file", { path: "apps/reference-target-web/app/page.tsx" }, "call-1"),
      toolResponse(
        "apply_text_edits",
        {
          path: "apps/reference-target-web/app/page.tsx",
          edits: [
            { kind: "insert_before", anchorText: "beta", text: "before-\n" },
            { kind: "insert_after", anchorText: "beta", text: "\n-after" },
            { kind: "delete", oldText: "gamma\n" },
          ],
        },
        "call-2",
      ),
      toolResponse("finish", { summary: "Applied localized edits.", noChanges: false }, "call-3"),
    ]);

    const result = await runLocalLlmAgent({
      config: {
        baseUrl: "http://localhost:1234/v1",
        model: "openai/gpt-oss-20b",
      },
      repoRoot,
      allowedRoots: ["apps/reference-target-web"],
      preparedPayload: { summary: { text: "Keep the fixture deterministic." } },
      implementationBrief: "Apply localized patch edits only.",
    });

    expect(result.touchedFiles).toEqual(["apps/reference-target-web/app/page.tsx"]);
    await expect(fs.readFile(pagePath, "utf8")).resolves.toBe("alpha\nbefore-\nbeta\n-after\n");
  });

  it("falls back to in-process search when rg is unavailable", async () => {
    const repoRoot = await createRepo({
      "apps/reference-target-web/app/page.tsx": "export default function Page() { return <div>hero</div>; }\n",
    });
    const pagePath = path.join(repoRoot, "apps", "reference-target-web", "app", "page.tsx");

    vi.mocked(childProcess.spawn).mockImplementation(() => {
      const child = new EventEmitter() as unknown as childProcess.ChildProcessWithoutNullStreams;
      Object.assign(child, {
        stdin: new PassThrough(),
        stdout: new PassThrough(),
        stderr: new PassThrough(),
      });
      queueMicrotask(() => {
        child.emit("error", Object.assign(new Error("spawn rg ENOENT"), { code: "ENOENT" }));
        child.emit("close", -2);
      });
      return child;
    });

    mockFetchSequence([
      toolResponse("search_allowed_files", { pattern: "hero" }, "call-1"),
      toolResponse("finish", { summary: "Inspected matching files without making changes.", noChanges: true }, "call-2"),
    ]);

    const result = await runLocalLlmAgent({
      config: {
        baseUrl: "http://localhost:1234/v1",
        model: "openai/gpt-oss-20b",
      },
      repoRoot,
      allowedRoots: ["apps/reference-target-web"],
      preparedPayload: { summary: { text: "Keep the fixture deterministic." } },
      implementationBrief: "Inspect the reference target for the hero section.",
    });

    expect(result.noChanges).toBe(true);
    expect(result.writeCount).toBe(0);
    expect(result.lastToolName).toBe("finish");
    const secondRequest = vi.mocked(global.fetch).mock.calls[1]?.[1];
    expect(secondRequest?.body ? JSON.parse(String(secondRequest.body)).input : "").toContain(
      `${pagePath}:1:export default function Page() { return <div>hero</div>; }`,
    );
  });

  it("includes validator-aware accepted guidance with concrete paths and patch-only instructions", async () => {
    const repoRoot = await createRepo({
      "apps/reference-target-web/app/globals.css": [
        "@import \"tailwindcss\";",
        "",
        ":root {",
        "  --bg: #ffffff;",
        "}",
        "",
        "body {",
        "  font-family: var(--font-inter), Inter, sans-serif;",
        "}",
        "",
        ".card {",
        "  background: #f9fbff;",
        "}",
        "",
      ].join("\n"),
    });

    mockFetchSequence([
      toolResponse("read_file", { path: "apps/reference-target-web/app/globals.css" }, "call-1"),
      toolResponse(
        "apply_text_edits",
        {
          path: "apps/reference-target-web/app/globals.css",
          edits: [
            {
              kind: "insert_after",
              anchorText: "  --bg: #ffffff;\n",
              text: "  --font-inter: \"Inter\", sans-serif;\n",
            },
            {
              kind: "insert_after",
              anchorText: "  background: #f9fbff;\n",
              text: "  transition: background-color 120ms linear;\n",
            },
          ],
        },
        "call-2",
      ),
      toolResponse("finish", { summary: "Added concrete motion declarations and the missing token definition.", noChanges: false }, "call-3"),
    ]);

    const result = await runLocalLlmAgent({
      config: {
        baseUrl: "http://localhost:1234/v1",
        model: "openai/gpt-oss-20b",
      },
      repoRoot,
      allowedRoots: ["apps/reference-target-web"],
      preparedPayload: {
        repairMap: [
          {
            code: "motion.none-detected",
            summary: "Add contract-compliant motion declarations.",
          },
        ],
      },
      implementationBrief: "Make a small contract-guided change.",
      acceptedSuggestions: [
        {
          findingCode: "motion.none-detected",
          findingMessage: "No motion declarations detected for surface \"reference-target-web\".",
          summary: "Add contract-compliant motion declarations in existing styles using 120ms linear timing without changing the fixture structure.",
          suggestedPath: "apps/reference-target-web/app/globals.css",
          sourceRunId: "run-0",
          acceptedAt: "2026-03-13T21:20:00.000Z",
        },
        {
          findingCode: "token.normalization-skipped",
          findingMessage: "Could not normalize var(--font-inter).",
          summary: "In apps/reference-target-web/app/globals.css, insert --font-inter: \"Inter\", sans-serif; into the existing :root block so typography normalization succeeds.",
          suggestedPath: "apps/reference-target-web/app/globals.css",
          rationale: "The next rerun should address typography normalization.",
          sourceRunId: "run-1",
          acceptedAt: "2026-03-13T21:24:00.000Z",
        },
      ],
      effectiveContractSummary: "Max content width: 2000\nColor policy: warn",
      activeDesignerNotes: [
        {
          id: "note-1",
          content: "Edge-to-edge layout intent should be preserved.",
          createdAt: "2026-03-13T21:24:00.000Z",
          sourceMessageId: "user-1",
        },
      ],
    });

    expect(result.touchedFiles).toEqual(["apps/reference-target-web/app/globals.css"]);

    const [_, init] = vi.mocked(global.fetch).mock.calls[0] ?? [];
    const input = init?.body ? JSON.parse(String(init.body)).input : "";
    expect(input).toContain("Accepted suggestions to address (treat these as pending implementation work, not optional review notes):");
    expect(input).toContain("Path: apps/reference-target-web/app/globals.css");
    expect(input).toContain("literal 120ms linear timing");
    expect(input).toContain("real transition or animation declaration");
    expect(input).toContain(".header, .section, or .card");
    expect(input).toContain("Do not introduce var(--contract-motion-duration) or var(--contract-motion-timing) on this surface.");
    expect(input).toContain("Do not rely on comments, standalone variables, ad hoc motion token names, or unused helper classes as the primary fix.");
    expect(input).toContain("Before any apply_text_edits call, you must call read_file on that exact path in this session.");
    expect(input).toContain("Use apply_text_edits for small localized patches only. Do not rewrite full files.");
    expect(input).toContain("Read the suggested path for each accepted finding before deciding whether noChanges=true is justified.");
    expect(input).toContain("If multiple accepted suggestions point to the same file, resolve them together before finish.");
    expect(input).toContain("When an accepted suggestion requires a concrete declaration or token definition, make sure an apply_text_edits call actually inserts it.");
    expect(input).toContain("After any successful apply_text_edits call, finish must use noChanges=false.");
    expect(input).toContain("If you edit files and an accepted finding would still remain unresolved, the patch did not satisfy validator semantics.");
    expect(input).toContain("Effective working contract:");
    expect(input).toContain("Max content width: 2000");
    expect(input).toContain("Active designer notes that are not yet schema-backed contract fields:");
    expect(input).toContain("Edge-to-edge layout intent should be preserved.");
  });

  it("can recover from a bad first motion patch and retry with validator-relevant declarations", async () => {
    const repoRoot = await createRepo({
      "apps/reference-target-web/app/globals.css": [
        "@import \"tailwindcss\";",
        "",
        ":root {",
        "  --bg: #ffffff;",
        "}",
        "",
        "html,",
        "body {",
        "  margin: 0;",
        "}",
        "",
        "body {",
        "  color: #0f172a;",
        "}",
        "",
        ".card {",
        "  background: #f9fbff;",
        "}",
        "",
      ].join("\n"),
    });
    const cssPath = path.join(repoRoot, "apps", "reference-target-web", "app", "globals.css");

    mockFetchSequence([
      toolResponse("read_file", { path: "apps/reference-target-web/app/globals.css" }, "call-1"),
      toolResponse(
        "apply_text_edits",
        {
          path: "apps/reference-target-web/app/globals.css",
          edits: [
            {
              kind: "insert_after",
              anchorText: "body {",
              text: "  transition: opacity 120ms linear;\n",
            },
          ],
        },
        "call-2",
      ),
      toolResponse(
        "apply_text_edits",
        {
          path: "apps/reference-target-web/app/globals.css",
          edits: [
            {
              kind: "insert_after",
              anchorText: "  background: #f9fbff;\n",
              text: "  transition: background-color 120ms linear;\n",
            },
          ],
        },
        "call-3",
      ),
      toolResponse("finish", { summary: "Retried with a valid motion patch.", noChanges: false }, "call-4"),
    ]);

    const result = await runLocalLlmAgent({
      config: {
        baseUrl: "http://localhost:1234/v1",
        model: "openai/gpt-oss-20b",
      },
      repoRoot,
      allowedRoots: ["apps/reference-target-web"],
      preparedPayload: { summary: { text: "Keep the fixture deterministic." } },
      implementationBrief: "Make a small contract-guided change.",
      acceptedSuggestions: [
        {
          findingCode: "motion.none-detected",
          findingMessage: "No motion declarations detected for surface \"reference-target-web\".",
          summary: "Add contract-compliant motion declarations in existing styles using 120ms linear timing without changing the fixture structure.",
          suggestedPath: "apps/reference-target-web/app/globals.css",
          sourceRunId: "run-0",
          acceptedAt: "2026-03-13T21:20:00.000Z",
        },
      ],
    });

    expect(result.noChanges).toBe(false);
    expect(result.touchedFiles).toEqual(["apps/reference-target-web/app/globals.css"]);
    await expect(fs.readFile(cssPath, "utf8")).resolves.toContain("transition: background-color 120ms linear;");

    const retryRequest = vi.mocked(global.fetch).mock.calls[2]?.[1];
    expect(retryRequest?.body ? JSON.parse(String(retryRequest.body)).input : "").toContain(
      "insert_after expected 1 match(es) for the provided anchorText but found 2.",
    );
  });

  it("rejects boundary-unsafe insertions so the model can retry with a proper patch", async () => {
    const repoRoot = await createRepo({
      "apps/reference-target-web/app/globals.css": [
        "@import \"tailwindcss\";",
        "",
        ":root {",
        "  --bg: #ffffff;",
        "  --max-content: 1160px;",
        "}",
        "",
        "body {",
        "  font-family: var(--font-inter), Inter, sans-serif;",
        "}",
        "",
      ].join("\n"),
    });
    const cssPath = path.join(repoRoot, "apps", "reference-target-web", "app", "globals.css");

    mockFetchSequence([
      toolResponse("read_file", { path: "apps/reference-target-web/app/globals.css" }, "call-1"),
      toolResponse(
        "apply_text_edits",
        {
          path: "apps/reference-target-web/app/globals.css",
          edits: [
            {
              kind: "insert_before",
              anchorText: ":root {",
              text: "  --font-inter: \"Inter\", sans-serif;",
            },
          ],
        },
        "call-2",
      ),
      toolResponse(
        "apply_text_edits",
        {
          path: "apps/reference-target-web/app/globals.css",
          edits: [
            {
              kind: "replace",
              oldText: ":root {\n  --bg: #ffffff;\n  --max-content: 1160px;\n}\n",
              newText:
                ":root {\n  --bg: #ffffff;\n  --max-content: 1160px;\n  --font-inter: \"Inter\", sans-serif;\n}\n",
            },
          ],
        },
        "call-3",
      ),
      toolResponse("finish", { summary: "Inserted the missing font token with a safe patch.", noChanges: false }, "call-4"),
    ]);

    const result = await runLocalLlmAgent({
      config: {
        baseUrl: "http://localhost:1234/v1",
        model: "openai/gpt-oss-20b",
      },
      repoRoot,
      allowedRoots: ["apps/reference-target-web"],
      preparedPayload: { summary: { text: "Keep the fixture deterministic." } },
      implementationBrief: "Add the missing typography token with a localized patch.",
    });

    expect(result.noChanges).toBe(false);
    expect(result.touchedFiles).toEqual(["apps/reference-target-web/app/globals.css"]);
    await expect(fs.readFile(cssPath, "utf8")).resolves.toContain('--font-inter: "Inter", sans-serif;');

    const retryRequest = vi.mocked(global.fetch).mock.calls[2]?.[1];
    expect(retryRequest?.body ? JSON.parse(String(retryRequest.body)).input : "").toContain(
      "insert_before would merge inserted text directly into adjacent content",
    );
  });

  it("rejects forbidden edit paths", async () => {
    const repoRoot = await createRepo({
      "apps/reference-target-web/app/page.tsx": "export default function Page() { return null; }\n",
    });

    mockFetchSequence([
      toolResponse(
        "apply_text_edits",
        {
          path: "docs/strategy.md",
          edits: [
            {
              kind: "replace",
              oldText: "old",
              newText: "new",
            },
          ],
        },
        "call-1",
      ),
    ]);

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

  it("returns unread edit errors to the model so it can recover", async () => {
    const repoRoot = await createRepo({
      "apps/reference-target-web/app/page.tsx": "export default function Page() { return <div>before</div>; }\n",
    });
    const pagePath = path.join(repoRoot, "apps", "reference-target-web", "app", "page.tsx");

    mockFetchSequence([
      toolResponse(
        "apply_text_edits",
        {
          path: "apps/reference-target-web/app/page.tsx",
          edits: [
            {
              kind: "replace",
              oldText: "<div>before</div>",
              newText: "<div>after</div>",
            },
          ],
        },
        "call-1",
      ),
      toolResponse("read_file", { path: "apps/reference-target-web/app/page.tsx" }, "call-2"),
      toolResponse(
        "apply_text_edits",
        {
          path: "apps/reference-target-web/app/page.tsx",
          edits: [
            {
              kind: "replace",
              oldText: "<div>before</div>",
              newText: "<div>after</div>",
            },
          ],
        },
        "call-3",
      ),
      toolResponse("finish", { summary: "Updated the page after reading it first.", noChanges: false }, "call-4"),
    ]);

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
    expect(result.touchedFiles).toEqual(["apps/reference-target-web/app/page.tsx"]);
    await expect(fs.readFile(pagePath, "utf8")).resolves.toContain("after");

    const firstRequest = vi.mocked(global.fetch).mock.calls[0]?.[1];
    expect(firstRequest?.body ? JSON.parse(String(firstRequest.body)).input : "").toContain(
      "Before any apply_text_edits call, you must call read_file on that exact path in this session.",
    );

    const secondRequest = vi.mocked(global.fetch).mock.calls[1]?.[1];
    expect(secondRequest?.body ? JSON.parse(String(secondRequest.body)).input : "").toContain(
      "apply_text_edits failed for apps/reference-target-web/app/page.tsx: cannot edit before reading it in this session.",
    );
  });

  it("returns missing-file reads to the model so it can recover with list_allowed_files", async () => {
    const repoRoot = await createRepo({
      "apps/reference-target-web/app/page.tsx": "export default function Page() { return <div>fixture</div>; }\n",
    });

    mockFetchSequence([
      toolResponse("read_file", { path: "apps/reference-target-web/src/App.tsx" }, "call-1"),
      toolResponse("list_allowed_files", {}, "call-2"),
      toolResponse("read_file", { path: "apps/reference-target-web/app/page.tsx" }, "call-3"),
      toolResponse("finish", { summary: "Inspected the actual page entrypoint.", noChanges: true }, "call-4"),
    ]);

    const result = await runLocalLlmAgent({
      config: {
        baseUrl: "http://localhost:1234/v1",
        model: "openai/gpt-oss-20b",
      },
      repoRoot,
      allowedRoots: ["apps/reference-target-web"],
      preparedPayload: { summary: { text: "Keep the fixture deterministic." } },
      implementationBrief: "Inspect the reference target entrypoint before deciding whether changes are needed.",
    });

    expect(result.noChanges).toBe(true);
    expect(result.touchedFiles).toEqual([]);

    const firstRequest = vi.mocked(global.fetch).mock.calls[0]?.[1];
    expect(firstRequest?.body ? JSON.parse(String(firstRequest.body)).input : "").toContain(
      "If you are unsure which files exist, call list_allowed_files before attempting read_file.",
    );

    const retryRequest = vi.mocked(global.fetch).mock.calls[1]?.[1];
    expect(retryRequest?.body ? JSON.parse(String(retryRequest.body)).input : "").toContain(
      "File not found: apps/reference-target-web/src/App.tsx",
    );
  });

  it("rejects missing edit context without touching disk", async () => {
    const repoRoot = await createRepo({
      "apps/reference-target-web/app/page.tsx": "export default function Page() { return <div>before</div>; }\n",
    });
    const pagePath = path.join(repoRoot, "apps", "reference-target-web", "app", "page.tsx");

    mockFetchSequence([
      toolResponse("read_file", { path: "apps/reference-target-web/app/page.tsx" }, "call-1"),
      toolResponse(
        "apply_text_edits",
        {
          path: "apps/reference-target-web/app/page.tsx",
          edits: [
            {
              kind: "replace",
              oldText: "<div>missing</div>",
              newText: "<div>after</div>",
            },
          ],
        },
        "call-2",
      ),
      toolResponse("finish", { summary: "No change needed after failed patch.", noChanges: true }, "call-3"),
    ]);

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
    await expect(fs.readFile(pagePath, "utf8")).resolves.toContain("before");

    const retryRequest = vi.mocked(global.fetch).mock.calls[2]?.[1];
    expect(retryRequest?.body ? JSON.parse(String(retryRequest.body)).input : "").toContain(
      "replace expected 1 match(es) for the provided oldText but found 0",
    );
  });

  it("returns malformed patch argument errors to the model so it can retry", async () => {
    const repoRoot = await createRepo({
      "apps/reference-target-web/app/page.tsx": "export default function Page() { return <div>before</div>; }\n",
    });
    const pagePath = path.join(repoRoot, "apps", "reference-target-web", "app", "page.tsx");

    mockFetchSequence([
      toolResponse("read_file", { path: "apps/reference-target-web/app/page.tsx" }, "call-1"),
      toolResponse(
        "apply_text_edits",
        {
          path: "apps/reference-target-web/app/page.tsx",
          edits: [],
        },
        "call-2",
      ),
      toolResponse(
        "apply_text_edits",
        {
          path: "apps/reference-target-web/app/page.tsx",
          edits: [
            {
              kind: "replace",
              oldText: "<div>before</div>",
              newText: "<div>after</div>",
            },
          ],
        },
        "call-3",
      ),
      toolResponse("finish", { summary: "Retried with a valid localized patch.", noChanges: false }, "call-4"),
    ]);

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
    expect(result.touchedFiles).toEqual(["apps/reference-target-web/app/page.tsx"]);
    await expect(fs.readFile(pagePath, "utf8")).resolves.toContain("after");

    const retryRequest = vi.mocked(global.fetch).mock.calls[2]?.[1];
    expect(retryRequest?.body ? JSON.parse(String(retryRequest.body)).input : "").toContain(
      "apply_text_edits failed for apps/reference-target-web/app/page.tsx: edits must be a non-empty array.",
    );
  });

  it("rejects multiple matches unless expectedMatches matches", async () => {
    const repoRoot = await createRepo({
      "apps/reference-target-web/app/page.tsx":
        "export default function Page() { return <><span>alpha</span><span>alpha</span></>; }\n",
    });
    const pagePath = path.join(repoRoot, "apps", "reference-target-web", "app", "page.tsx");

    mockFetchSequence([
      toolResponse("read_file", { path: "apps/reference-target-web/app/page.tsx" }, "call-1"),
      toolResponse(
        "apply_text_edits",
        {
          path: "apps/reference-target-web/app/page.tsx",
          edits: [
            {
              kind: "replace",
              oldText: "alpha",
              newText: "beta",
            },
          ],
        },
        "call-2",
      ),
      toolResponse(
        "apply_text_edits",
        {
          path: "apps/reference-target-web/app/page.tsx",
          edits: [
            {
              kind: "replace",
              oldText: "alpha",
              newText: "beta",
              expectedMatches: 2,
            },
          ],
        },
        "call-3",
      ),
      toolResponse("finish", { summary: "Replaced both matches after confirming count.", noChanges: false }, "call-4"),
    ]);

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
    await expect(fs.readFile(pagePath, "utf8")).resolves.toContain("<span>beta</span><span>beta</span>");

    const retryRequest = vi.mocked(global.fetch).mock.calls[2]?.[1];
    expect(retryRequest?.body ? JSON.parse(String(retryRequest.body)).input : "").toContain(
      "replace expected 1 match(es) for the provided oldText but found 2",
    );
  });

  it("rejects TSX syntax errors without writing the candidate file", async () => {
    const repoRoot = await createRepo({
      "apps/reference-target-web/app/page.tsx": "export default function Page() { return <div>before</div>; }\n",
    });
    const pagePath = path.join(repoRoot, "apps", "reference-target-web", "app", "page.tsx");

    mockFetchSequence([
      toolResponse("read_file", { path: "apps/reference-target-web/app/page.tsx" }, "call-1"),
      toolResponse(
        "apply_text_edits",
        {
          path: "apps/reference-target-web/app/page.tsx",
          edits: [
            {
              kind: "replace",
              oldText: "<div>before</div>; }\n",
              newText: "<div>after</div>;\n",
            },
          ],
        },
        "call-2",
      ),
      toolResponse("finish", { summary: "No change after invalid TSX edit.", noChanges: true }, "call-3"),
    ]);

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
    await expect(fs.readFile(pagePath, "utf8")).resolves.toContain("before");

    const retryRequest = vi.mocked(global.fetch).mock.calls[2]?.[1];
    expect(retryRequest?.body ? JSON.parse(String(retryRequest.body)).input : "").toContain(
      "apply_text_edits validation failed for apps/reference-target-web/app/page.tsx",
    );
  });

  it("rejects CSS syntax errors without writing the candidate file", async () => {
    const repoRoot = await createRepo({
      "apps/reference-target-web/app/globals.css": ".card { color: red; }\n",
    });
    const cssPath = path.join(repoRoot, "apps", "reference-target-web", "app", "globals.css");

    mockFetchSequence([
      toolResponse("read_file", { path: "apps/reference-target-web/app/globals.css" }, "call-1"),
      toolResponse(
        "apply_text_edits",
        {
          path: "apps/reference-target-web/app/globals.css",
          edits: [
            {
              kind: "delete",
              oldText: " }\n",
            },
          ],
        },
        "call-2",
      ),
      toolResponse("finish", { summary: "No change after invalid CSS edit.", noChanges: true }, "call-3"),
    ]);

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
    await expect(fs.readFile(cssPath, "utf8")).resolves.toContain("color: red;");

    const retryRequest = vi.mocked(global.fetch).mock.calls[2]?.[1];
    expect(retryRequest?.body ? JSON.parse(String(retryRequest.body)).input : "").toContain(
      "apply_text_edits validation failed for apps/reference-target-web/app/globals.css",
    );
  });

  it("returns noChanges=true-after-edit errors so the model can finish cleanly", async () => {
    const repoRoot = await createRepo({
      "apps/reference-target-web/app/page.tsx": "export default function Page() { return <div>before</div>; }\n",
    });
    const pagePath = path.join(repoRoot, "apps", "reference-target-web", "app", "page.tsx");

    mockFetchSequence([
      toolResponse("read_file", { path: "apps/reference-target-web/app/page.tsx" }, "call-1"),
      toolResponse(
        "apply_text_edits",
        {
          path: "apps/reference-target-web/app/page.tsx",
          edits: [
            {
              kind: "replace",
              oldText: "<div>before</div>",
              newText: "<div>after</div>",
            },
          ],
        },
        "call-2",
      ),
      toolResponse("finish", { summary: "No change needed after inspection.", noChanges: true }, "call-3"),
      toolResponse("finish", { summary: "Updated the page after making a valid edit.", noChanges: false }, "call-4"),
    ]);

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
    expect(result.summary).toContain("valid edit");
    await expect(fs.readFile(pagePath, "utf8")).resolves.toContain("after");
    expect(result.transcript).toContainEqual(
      expect.objectContaining({
        type: "tool",
        payload: expect.objectContaining({
          name: "finish",
          error: {
            message: expect.stringContaining("noChanges=true"),
          },
        }),
      }),
    );

    const retryRequest = vi.mocked(global.fetch).mock.calls[3]?.[1];
    expect(retryRequest?.body ? JSON.parse(String(retryRequest.body)).input : "").toContain(
      "Call finish again with noChanges=false once the edit pass is complete.",
    );
  });

  it("rejects malformed responses tool arguments", async () => {
    const repoRoot = await createRepo({
      "apps/reference-target-web/app/page.tsx": "export default function Page() { return null; }\n",
    });

    global.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          output: [
            {
              type: "function_call",
              call_id: "call-1",
              name: "apply_text_edits",
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

  it("rejects tool-call budget exhaustion", async () => {
    const repoRoot = await createRepo({
      "apps/reference-target-web/app/page.tsx": "export default function Page() { return null; }\n",
    });

    global.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          output: [
            {
              type: "function_call",
              call_id: "call-1",
              name: "list_allowed_files",
              arguments: JSON.stringify({}),
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
        maxToolCalls: 0,
      }),
    ).rejects.toThrow(/Tool-call budget exceeded/i);
  });

  it("surfaces incomplete responses with LM Studio truncation guidance", async () => {
    const repoRoot = await createRepo({
      "apps/reference-target-web/app/page.tsx": "export default function Page() { return null; }\n",
    });

    mockFetchSequence([
      {
        status: "incomplete",
        incomplete_details: {
          reason: "max_output_tokens",
        },
        output: [],
      },
    ]);

    const error = await runLocalLlmAgent({
      config: {
        baseUrl: "http://localhost:1234/v1",
        model: "openai/gpt-oss-20b",
      },
      repoRoot,
      allowedRoots: ["apps/reference-target-web"],
      preparedPayload: { summary: { text: "Keep the fixture deterministic." } },
      implementationBrief: "Make a small contract-guided change.",
    }).then(
      () => {
        throw new Error("Expected runLocalLlmAgent to reject for incomplete responses.");
      },
      (cause) => cause as Error & { transcript?: Array<Record<string, unknown>> },
    );

    expect(error.message).toContain('Limit Response Length');
    expect(error.message).toContain("status=incomplete");
    expect(error.message).toContain("max_output_tokens");
    expect(error.transcript).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "assistant",
          payload: expect.objectContaining({
            status: "incomplete",
            incomplete_details: expect.objectContaining({ reason: "max_output_tokens" }),
          }),
        }),
        expect.objectContaining({
          type: "error",
          payload: expect.objectContaining({
            kind: "incomplete_response",
            status: "incomplete",
            incomplete_details: expect.objectContaining({ reason: "max_output_tokens" }),
          }),
        }),
      ]),
    );
  });

  it("parses structured contract-shaper output", async () => {
    global.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          output_text: JSON.stringify({
            assistantMessage: "Added highlight color and updated width.",
            contractChanges: [
              {
                field: "color.allowedValues",
                action: "add",
                value: "#8BAE3F",
                summary: "Allow color #8BAE3F in the working contract.",
              },
              {
                field: "surfaces.reference-target-web.layout.maxContentWidth",
                action: "set",
                value: 2000,
                summary: "Set max content width to 2000px.",
              },
            ],
            designerNotes: ["Edge-to-edge layout intent should be preserved."],
          }),
          output: [],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    ) as typeof fetch;

    const result = await shapeLocalWorkbenchContract({
      config: {
        baseUrl: "http://localhost:1234/v1",
        model: "openai/gpt-oss-20b",
      },
      message: "go edge-to-edge, max 2000px, add #8BAE3F",
      contractSummary: "reference-target-web.generated v0.1.0",
    });

    expect(result.contractChanges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "color.allowedValues", value: "#8BAE3F" }),
        expect.objectContaining({ field: "surfaces.reference-target-web.layout.maxContentWidth", value: 2000 }),
      ]),
    );
    expect(result.designerNotes).toContain("Edge-to-edge layout intent should be preserved.");
  });

  it("normalizes named colors from fallback shaping and preserves usage intent as a designer note", async () => {
    global.fetch = vi.fn(async () =>
      new Response("{}", {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }),
    ) as typeof fetch;

    const result = await shapeLocalWorkbenchContract({
      config: {
        baseUrl: "http://localhost:1234/v1",
        model: "openai/gpt-oss-20b",
      },
      message: "the background color of the shell should be pink",
      contractSummary: "reference-target-web.generated v0.1.0",
    });

    expect(result.contractChanges).toEqual([
      expect.objectContaining({
        field: "color.allowedValues",
        value: "#ffc0cb",
      }),
    ]);
    expect(result.designerNotes).toContain("Shell background should use #ffc0cb.");
    expect(result.assistantMessage).toContain("Allow color #ffc0cb");
  });

  it("normalizes named colors from structured model output", async () => {
    global.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          output_text: JSON.stringify({
            assistantMessage: "The shell background is now pink.",
            contractChanges: [
              {
                field: "color.allowedValues",
                action: "add",
                value: "pink",
                summary: "Update color.allowedValues.",
              },
            ],
            designerNotes: [],
          }),
          output: [],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    ) as typeof fetch;

    const result = await shapeLocalWorkbenchContract({
      config: {
        baseUrl: "http://localhost:1234/v1",
        model: "openai/gpt-oss-20b",
      },
      message: "the background color of the shell should be pink",
      contractSummary: "reference-target-web.generated v0.1.0",
    });

    expect(result.contractChanges).toEqual([
      expect.objectContaining({
        field: "color.allowedValues",
        value: "#ffc0cb",
      }),
    ]);
    expect(result.designerNotes).toContain("Shell background should use #ffc0cb.");
  });

  it("falls back with truncation guidance when the contract-shaper response is incomplete", async () => {
    global.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          status: "incomplete",
          incomplete_details: {
            reason: "max_output_tokens",
          },
          output: [],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    ) as typeof fetch;

    const result = await shapeLocalWorkbenchContract({
      config: {
        baseUrl: "http://localhost:1234/v1",
        model: "openai/gpt-oss-20b",
      },
      message: "the background color of the shell should be pink",
      contractSummary: "reference-target-web.generated v0.1.0",
    });

    expect(result.contractChanges).toEqual([
      expect.objectContaining({
        field: "color.allowedValues",
        value: "#ffc0cb",
      }),
    ]);
    expect(result.designerNotes).toContain("Shell background should use #ffc0cb.");
    expect(result.assistantMessage).toContain("Allow color #ffc0cb");
    expect(result.assistantMessage).toContain("Limit Response Length");
  });

  it("builds an honest assistant summary when sanitized output contains only designer notes", async () => {
    global.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          output_text: JSON.stringify({
            assistantMessage: "Added transparent as an allowed color.",
            contractChanges: [
              {
                field: "color.allowedValues",
                action: "add",
                value: "transparent",
                summary: "Allow color transparent in the working contract.",
              },
            ],
            designerNotes: ["Shell background should use transparent."],
          }),
          output: [],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    ) as typeof fetch;

    const result = await shapeLocalWorkbenchContract({
      config: {
        baseUrl: "http://localhost:1234/v1",
        model: "openai/gpt-oss-20b",
      },
      message: "the background color of the shell should be transparent",
      contractSummary: "reference-target-web.generated v0.1.0",
    });

    expect(result.contractChanges).toEqual([]);
    expect(result.designerNotes).toEqual(
      expect.arrayContaining(["Shell background should use transparent."]),
    );
    expect(result.assistantMessage).toContain("Captured as designer notes");
    expect(result.assistantMessage).not.toContain("Added transparent");
  });
});
