import { spawn } from "node:child_process";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";

export interface LocalLlmConfig {
  baseUrl: string;
  model: string;
  apiKey?: string;
}

export interface LocalLlmTranscriptEntry {
  type: "request" | "assistant" | "tool" | "finish";
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface LocalLlmAgentResult {
  transcript: LocalLlmTranscriptEntry[];
  touchedFiles: string[];
  summary: string;
  noChanges: boolean;
}

type ToolName =
  | "list_allowed_files"
  | "read_file"
  | "search_allowed_files"
  | "write_file"
  | "finish";

interface ToolContext {
  repoRoot: string;
  allowedRoots: string[];
  maxWrites: number;
  maxToolCalls: number;
}

interface AgentOptions {
  config: LocalLlmConfig;
  repoRoot: string;
  allowedRoots: string[];
  preparedPayload: Record<string, unknown>;
  implementationBrief: string;
  maxWrites?: number;
  maxToolCalls?: number;
  maxTurns?: number;
  maxWallTimeMs?: number;
}

interface JsonRecord {
  [key: string]: unknown;
}

class LocalLlmAgentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LocalLlmAgentError";
  }
}

function normalizeBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, "");
  if (trimmed.endsWith("/responses")) {
    return trimmed.slice(0, -"/responses".length);
  }
  return trimmed;
}

function buildResponsesUrl(baseUrl: string): string {
  const normalized = normalizeBaseUrl(baseUrl);
  if (normalized.endsWith("/v1")) {
    return `${normalized}/responses`;
  }
  return `${normalized}/v1/responses`;
}

function resolveAllowedPath(repoRoot: string, allowedRoots: string[], candidate: string): string {
  const absolutePath = path.resolve(repoRoot, candidate);
  const normalizedRoots = allowedRoots.map((root) => path.resolve(repoRoot, root));
  const allowed = normalizedRoots.some((root) => absolutePath === root || absolutePath.startsWith(`${root}${path.sep}`));
  if (!allowed) {
    throw new LocalLlmAgentError(`Forbidden file path: ${candidate}`);
  }
  if (!fs.existsSync(absolutePath)) {
    throw new LocalLlmAgentError(`File not found: ${candidate}`);
  }
  return absolutePath;
}

async function listAllowedFiles(repoRoot: string, allowedRoots: string[]): Promise<string[]> {
  const files: string[] = [];
  for (const allowedRoot of allowedRoots) {
    const absoluteRoot = path.resolve(repoRoot, allowedRoot);
    const stack = [absoluteRoot];
    while (stack.length > 0) {
      const current = stack.pop();
      if (!current) continue;
      const entries = await fsp.readdir(current, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name === "node_modules" || entry.name === ".next" || entry.name === ".git") {
          continue;
        }
        const absolutePath = path.join(current, entry.name);
        if (entry.isDirectory()) {
          stack.push(absolutePath);
          continue;
        }
        files.push(path.relative(repoRoot, absolutePath));
      }
    }
  }
  return files.sort((left, right) => left.localeCompare(right));
}

async function searchAllowedFiles(repoRoot: string, allowedRoots: string[], pattern: string): Promise<string[]> {
  const trimmedPattern = pattern.trim();
  if (!trimmedPattern) {
    return [];
  }
  return new Promise<string[]>((resolve, reject) => {
    const child = spawn(
      "rg",
      ["-n", "--no-heading", trimmedPattern, ...allowedRoots.map((root) => path.resolve(repoRoot, root))],
      { cwd: repoRoot, stdio: ["ignore", "pipe", "pipe"] },
    );
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0 && code !== 1) {
        reject(new LocalLlmAgentError(stderr.trim() || `rg exited with code ${code}.`));
        return;
      }
      resolve(
        stdout
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean)
          .slice(0, 200),
      );
    });
  });
}

function buildSystemPrompt(options: AgentOptions) {
  const guidanceSummary = buildPreparedGuidanceSummary(options.preparedPayload);
  return [
    "You are a bounded local UI implementation agent.",
    "Target surface: reference-target-web.",
    `Implementation brief:\n${options.implementationBrief.trim()}`,
    `Allowed write roots: ${options.allowedRoots.join(", ")}`,
    "Forbidden paths include contracts, docs, CI, SurfaceOps app code, and any file outside the allowed write roots.",
    "Use tools instead of guessing file contents.",
    "Do not add or modify documentation.",
    "Do not create new files.",
    "Make one focused implementation pass, then call finish.",
    "If no justified implementation change is needed, call finish with noChanges=true.",
    `Prepared contract guidance:\n${guidanceSummary}`,
  ].join("\n\n");
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter(Boolean);
}

function compactList(values: string[], maxItems = 6): string {
  if (values.length === 0) {
    return "none";
  }
  const unique = [...new Set(values)];
  if (unique.length <= maxItems) {
    return unique.join(", ");
  }
  return `${unique.slice(0, maxItems).join(", ")} (+${unique.length - maxItems} more)`;
}

function buildPreparedGuidanceSummary(preparedPayload: Record<string, unknown>): string {
  const contract = asRecord(preparedPayload.contract);
  const generation = asRecord(preparedPayload.generation);
  const structure = asRecord(generation.structure);
  const layout = asRecord(generation.layout);
  const visual = asRecord(generation.visual);
  const guidance = asRecord(generation.guidance);
  const constraints = asRecord(preparedPayload.constraints);
  const color = asRecord(constraints.color);
  const motion = asRecord(constraints.motion);
  const sections = Array.isArray(preparedPayload.sections) ? preparedPayload.sections : [];
  const repairMap = asRecord(preparedPayload.repairMap);
  const repairs = Array.isArray(repairMap.repairs) ? repairMap.repairs : [];

  const requiredSections = asStringArray(structure.requiredSectionIds);
  const focusOrder = Array.isArray(guidance.generationFocusOrder)
    ? asStringArray(guidance.generationFocusOrder)
    : [];
  const allowedFonts = asStringArray(visual.allowedFonts);
  const requiredContainers = asStringArray(layout.requiredContainers);
  const topRepairs = repairs
    .filter((entry): entry is JsonRecord => Boolean(entry && typeof entry === "object" && !Array.isArray(entry)))
    .slice(0, 5)
    .map((entry) => {
      const code = typeof entry.code === "string" ? entry.code : "unknown";
      const summary = typeof entry.summary === "string" ? entry.summary : "";
      return summary ? `${code}: ${summary}` : code;
    });

  return [
    `Contract: ${typeof contract.id === "string" ? contract.id : "unknown"} v${typeof contract.version === "string" ? contract.version : "0.0.0"}`,
    `Focus order: ${compactList(focusOrder)}`,
    `Required sections: ${compactList(requiredSections)}`,
    `Section count: ${sections.length}`,
    `Allowed fonts: ${compactList(allowedFonts)}`,
    `Max content width: ${typeof layout.maxContentWidth === "number" ? `${layout.maxContentWidth}px` : "unspecified"}`,
    `Required containers: ${compactList(requiredContainers)}`,
    `Color policy: ${typeof color.policy === "string" ? color.policy : "off"}`,
    `Motion durations: ${Array.isArray(motion.allowedDurationsMs) ? compactList(motion.allowedDurationsMs.map((value) => `${String(value)}ms`)) : "none"}`,
    `Top repair priorities: ${compactList(topRepairs, 5)}`,
  ].join("\n");
}

function buildTools() {
  return [
    {
      type: "function",
      name: "list_allowed_files",
      description: "List editable files under the allowed roots.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {},
      },
    },
    {
      type: "function",
      name: "read_file",
      description: "Read a file under the allowed roots.",
      parameters: {
        type: "object",
        additionalProperties: false,
        required: ["path"],
        properties: {
          path: { type: "string", minLength: 1 },
        },
      },
    },
    {
      type: "function",
      name: "search_allowed_files",
      description: "Search within files under the allowed roots.",
      parameters: {
        type: "object",
        additionalProperties: false,
        required: ["pattern"],
        properties: {
          pattern: { type: "string", minLength: 1 },
        },
      },
    },
    {
      type: "function",
      name: "write_file",
      description: "Replace the full contents of one existing file under the allowed roots.",
      parameters: {
        type: "object",
        additionalProperties: false,
        required: ["path", "content"],
        properties: {
          path: { type: "string", minLength: 1 },
          content: { type: "string" },
        },
      },
    },
    {
      type: "function",
      name: "finish",
      description: "Finish the implementation pass and summarize the result.",
      parameters: {
        type: "object",
        additionalProperties: false,
        required: ["summary", "noChanges"],
        properties: {
          summary: { type: "string", minLength: 1 },
          noChanges: { type: "boolean" },
        },
      },
    },
  ];
}

async function executeTool(
  name: ToolName,
  args: Record<string, unknown>,
  context: ToolContext,
  touchedFiles: Set<string>,
  writeCount: { value: number },
): Promise<Record<string, unknown>> {
  switch (name) {
    case "list_allowed_files":
      return { files: await listAllowedFiles(context.repoRoot, context.allowedRoots) };
    case "read_file": {
      const filePath = resolveAllowedPath(context.repoRoot, context.allowedRoots, String(args.path ?? ""));
      return {
        path: path.relative(context.repoRoot, filePath),
        content: await fsp.readFile(filePath, "utf8"),
      };
    }
    case "search_allowed_files":
      return { matches: await searchAllowedFiles(context.repoRoot, context.allowedRoots, String(args.pattern ?? "")) };
    case "write_file": {
      if (writeCount.value >= context.maxWrites) {
        throw new LocalLlmAgentError(`Write budget exceeded (${context.maxWrites}).`);
      }
      const filePath = resolveAllowedPath(context.repoRoot, context.allowedRoots, String(args.path ?? ""));
      await fsp.writeFile(filePath, String(args.content ?? ""), "utf8");
      touchedFiles.add(path.relative(context.repoRoot, filePath));
      writeCount.value += 1;
      return {
        path: path.relative(context.repoRoot, filePath),
        writesUsed: writeCount.value,
      };
    }
    case "finish":
      return {
        done: true,
        summary: String(args.summary ?? ""),
        noChanges: Boolean(args.noChanges),
      };
    default:
      throw new LocalLlmAgentError(`Unsupported tool ${name}`);
  }
}

function ensureOutputItems(payload: Record<string, unknown>): Array<Record<string, unknown>> {
  const output = payload.output;
  if (!Array.isArray(output)) {
    throw new LocalLlmAgentError("Local model returned a malformed responses payload: missing output array.");
  }
  return output.filter((entry): entry is Record<string, unknown> => Boolean(entry && typeof entry === "object"));
}

function extractToolCalls(payload: Record<string, unknown>): Array<Record<string, unknown>> {
  return ensureOutputItems(payload).filter((entry) => String(entry.type ?? "") === "function_call");
}

function extractAssistantText(payload: Record<string, unknown>): string {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  const fragments: string[] = [];
  for (const item of ensureOutputItems(payload)) {
    if (String(item.type ?? "") !== "message") {
      continue;
    }
    const content = Array.isArray(item.content) ? item.content : [];
    for (const block of content) {
      if (!block || typeof block !== "object") continue;
      const typedBlock = block as Record<string, unknown>;
      const blockType = String(typedBlock.type ?? "");
      if ((blockType === "output_text" || blockType === "text") && typeof typedBlock.text === "string") {
        fragments.push(typedBlock.text);
      }
    }
  }
  return fragments.join("\n").trim();
}

function parseToolArguments(rawArguments: unknown, name: string): Record<string, unknown> {
  if (rawArguments && typeof rawArguments === "object" && !Array.isArray(rawArguments)) {
    return rawArguments as Record<string, unknown>;
  }

  const serialized = typeof rawArguments === "string" ? rawArguments : JSON.stringify(rawArguments ?? {});
  try {
    return JSON.parse(serialized) as Record<string, unknown>;
  } catch (error) {
    throw new LocalLlmAgentError(
      `Local model returned malformed arguments for tool ${name}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function buildInput(history: string[]): string {
  return history.join("\n\n");
}

export async function runLocalLlmAgent(options: AgentOptions): Promise<LocalLlmAgentResult> {
  const maxTurns = options.maxTurns ?? 12;
  const maxToolCalls = options.maxToolCalls ?? 24;
  const maxWrites = options.maxWrites ?? 8;
  const maxWallTimeMs = options.maxWallTimeMs ?? 180_000;
  const transcript: LocalLlmTranscriptEntry[] = [];
  const touchedFiles = new Set<string>();
  const writeCount = { value: 0 };
  const toolCount = { value: 0 };
  const deadline = Date.now() + maxWallTimeMs;
  const url = buildResponsesUrl(options.config.baseUrl);
  const tools = buildTools();
  const history = [
    `System:\n${buildSystemPrompt(options)}`,
    "User:\nInspect only what you need, make the smallest valid UI changes, then call finish.",
  ];

  for (let turn = 0; turn < maxTurns; turn += 1) {
    if (Date.now() > deadline) {
      throw new LocalLlmAgentError(`Local model exceeded wall-time budget (${maxWallTimeMs}ms).`);
    }

    const payload = {
      model: options.config.model,
      input: buildInput(history),
      tool_choice: "required",
      tools,
    };
    transcript.push({
      type: "request",
      payload,
      createdAt: new Date().toISOString(),
    });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(options.config.apiKey ? { Authorization: `Bearer ${options.config.apiKey}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new LocalLlmAgentError(`Local model request failed with ${response.status}: ${await response.text()}`);
    }

    const json = (await response.json()) as Record<string, unknown>;
    const toolCalls = extractToolCalls(json);
    const assistantText = extractAssistantText(json);
    const assistantPayload = {
      output: ensureOutputItems(json),
      ...(assistantText ? { output_text: assistantText } : {}),
    };

    transcript.push({
      type: "assistant",
      payload: assistantPayload,
      createdAt: new Date().toISOString(),
    });

    if (assistantText) {
      history.push(`Assistant:\n${assistantText}`);
    }

    if (toolCalls.length === 0) {
      throw new LocalLlmAgentError("Local model did not return any function tools in the responses output.");
    }

    for (const toolCall of toolCalls) {
      if (Date.now() > deadline) {
        throw new LocalLlmAgentError(`Local model exceeded wall-time budget (${maxWallTimeMs}ms).`);
      }
      if (toolCount.value >= maxToolCalls) {
        throw new LocalLlmAgentError(`Tool-call budget exceeded (${maxToolCalls}).`);
      }
      toolCount.value += 1;
      const name = String(toolCall.name ?? "") as ToolName;
      const args = parseToolArguments(toolCall.arguments, name);
      const result = await executeTool(
        name,
        args,
        {
          repoRoot: options.repoRoot,
          allowedRoots: options.allowedRoots,
          maxWrites,
          maxToolCalls,
        },
        touchedFiles,
        writeCount,
      );
      transcript.push({
        type: name === "finish" ? "finish" : "tool",
        payload: { name, args, result },
        createdAt: new Date().toISOString(),
      });
      history.push(`Assistant tool call ${name}:\n${JSON.stringify(args)}`);
      history.push(`Tool result ${name}:\n${JSON.stringify(result)}`);
      if (name === "finish") {
        return {
          transcript,
          touchedFiles: [...touchedFiles].sort((left, right) => left.localeCompare(right)),
          summary: String(result.summary ?? ""),
          noChanges: Boolean(result.noChanges),
        };
      }
    }
  }

  throw new LocalLlmAgentError(`Local model did not finish within ${maxTurns} turn(s).`);
}
