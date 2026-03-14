import * as childProcess from "node:child_process";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import postcss from "postcss";
import ts from "typescript";
import { CSS_NAMED_COLOR_NAMES, normalizeCssNamedColor } from "./css-named-colors";
import { promptInstructionsForFinding } from "./finding-guidance";
import type {
  LocalWorkbenchAcceptedSuggestion,
  LocalWorkbenchContractChange,
  LocalWorkbenchDesignerNote,
} from "./types";

export interface LocalLlmConfig {
  baseUrl: string;
  model: string;
  apiKey?: string;
}

export interface LocalLlmTranscriptEntry {
  type: "request" | "assistant" | "tool" | "finish" | "error";
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface LocalLlmAgentResult {
  transcript: LocalLlmTranscriptEntry[];
  touchedFiles: string[];
  summary: string;
  noChanges: boolean;
  agentInput: string;
}

export interface LocalContractShaperResult {
  assistantMessage: string;
  contractChanges: Array<{
    field: LocalWorkbenchContractChange["field"];
    action: LocalWorkbenchContractChange["action"];
    value: string | number;
    summary: string;
  }>;
  designerNotes: string[];
}

type ToolName =
  | "list_allowed_files"
  | "read_file"
  | "search_allowed_files"
  | "apply_text_edits"
  | "finish";

type TextEditOperation =
  | {
    kind: "replace";
    oldText: string;
    newText: string;
    expectedMatches?: number;
  }
  | {
    kind: "insert_before";
    anchorText: string;
    text: string;
    expectedMatches?: number;
  }
  | {
    kind: "insert_after";
    anchorText: string;
    text: string;
    expectedMatches?: number;
  }
  | {
    kind: "delete";
    oldText: string;
    expectedMatches?: number;
  };

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
  acceptedSuggestions?: LocalWorkbenchAcceptedSuggestion[];
  effectiveContractSummary?: string;
  activeDesignerNotes?: LocalWorkbenchDesignerNote[];
  maxWrites?: number;
  maxToolCalls?: number;
  maxTurns?: number;
  maxWallTimeMs?: number;
}

interface JsonRecord {
  [key: string]: unknown;
}

interface ResponsesPayloadDiagnostics {
  status: string | null;
  incompleteDetails: unknown | null;
}

class LocalLlmAgentError extends Error {
  transcript?: LocalLlmTranscriptEntry[];
  details?: Record<string, unknown>;

  constructor(message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "LocalLlmAgentError";
    this.details = details;
  }
}

const SKIPPED_DIRECTORY_NAMES = new Set(["node_modules", ".next", ".git"]);
const SCRIPT_FILE_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".mts", ".cts"]);

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
        if (SKIPPED_DIRECTORY_NAMES.has(entry.name)) {
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

function formatSearchMatch(filePath: string, lineNumber: number, line: string): string {
  return `${filePath}:${lineNumber}:${line}`;
}

async function fallbackSearchAllowedFiles(repoRoot: string, allowedRoots: string[], pattern: string): Promise<string[]> {
  const files = await listAllowedFiles(repoRoot, allowedRoots);
  const matches: string[] = [];

  for (const relativePath of files) {
    const absolutePath = path.resolve(repoRoot, relativePath);
    let content: string;
    try {
      content = await fsp.readFile(absolutePath, "utf8");
    } catch {
      continue;
    }

    const lines = content.split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      if (!lines[index]?.includes(pattern)) {
        continue;
      }
      matches.push(formatSearchMatch(absolutePath, index + 1, lines[index]));
      if (matches.length >= 200) {
        return matches;
      }
    }
  }

  return matches;
}

async function searchAllowedFiles(repoRoot: string, allowedRoots: string[], pattern: string): Promise<string[]> {
  const trimmedPattern = pattern.trim();
  if (!trimmedPattern) {
    return [];
  }
  return new Promise<string[]>((resolve, reject) => {
    let settled = false;
    const child = childProcess.spawn(
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
    child.on("error", (error) => {
      if (settled) {
        return;
      }
      const errno = error as NodeJS.ErrnoException;
      if (errno.code === "ENOENT") {
        settled = true;
        void fallbackSearchAllowedFiles(repoRoot, allowedRoots, trimmedPattern)
          .then(resolve)
          .catch(reject);
        return;
      }
      settled = true;
      reject(error);
    });
    child.on("close", (code) => {
      if (settled) {
        return;
      }
      settled = true;
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
  const acceptedSuggestionSummary = buildAcceptedSuggestionSummary(options.acceptedSuggestions ?? []);
  const designerNoteSummary = buildDesignerNoteSummary(options.activeDesignerNotes ?? []);
  return [
    "You are a bounded local UI implementation agent.",
    "Target surface: reference-target-web.",
    `Implementation brief:\n${options.implementationBrief.trim()}`,
    `Allowed write roots: ${options.allowedRoots.join(", ")}`,
    "Forbidden paths include contracts, docs, CI, SurfaceOps app code, and any file outside the allowed write roots.",
    "Before any apply_text_edits call, you must call read_file on that exact path in this session. Search results are not a substitute for reading file contents.",
    "If you are unsure which files exist, call list_allowed_files before attempting read_file.",
    "Use apply_text_edits for small localized patches only. Do not rewrite full files.",
    "If you need to inspect a file after editing it, call read_file again.",
    "Use tools instead of guessing file contents.",
    "Do not add or modify documentation.",
    "Do not create new files.",
    "Make one focused implementation pass that resolves every active accepted suggestion you can address in the touched file set, then call finish.",
    "If no justified implementation change is needed, call finish with noChanges=true.",
    "After any successful apply_text_edits call, finish must use noChanges=false.",
    options.effectiveContractSummary ? `Effective working contract:\n${options.effectiveContractSummary}` : null,
    acceptedSuggestionSummary,
    designerNoteSummary,
    `Prepared contract guidance:\n${guidanceSummary}`,
  ].filter(Boolean).join("\n\n");
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

function extractRepairEntries(repairMap: unknown): JsonRecord[] {
  if (Array.isArray(repairMap)) {
    return repairMap.filter((entry): entry is JsonRecord => Boolean(entry && typeof entry === "object" && !Array.isArray(entry)));
  }
  const repairMapRecord = asRecord(repairMap);
  const repairs = repairMapRecord.repairs;
  if (!Array.isArray(repairs)) {
    return [];
  }
  return repairs.filter((entry): entry is JsonRecord => Boolean(entry && typeof entry === "object" && !Array.isArray(entry)));
}

function buildAcceptedSuggestionSummary(acceptedSuggestions: LocalWorkbenchAcceptedSuggestion[]): string | null {
  if (acceptedSuggestions.length === 0) {
    return null;
  }
  return [
    "Accepted suggestions to address (treat these as pending implementation work, not optional review notes):",
    ...acceptedSuggestions.map((suggestion, index) =>
      [
        `${index + 1}. ${suggestion.findingCode}: ${suggestion.summary}`,
        `Path: ${suggestion.suggestedPath}`,
        ...promptInstructionsForFinding(suggestion.findingCode).map((instruction) => `Validator satisfaction: ${instruction}`),
        suggestion.rationale ? `Rationale: ${suggestion.rationale}` : null,
      ].filter(Boolean).join("\n"),
    ),
    "Read the suggested path for each accepted finding before deciding whether noChanges=true is justified.",
    "If multiple accepted suggestions point to the same file, resolve them together before finish.",
    "When an accepted suggestion requires a concrete declaration or token definition, make sure an apply_text_edits call actually inserts it.",
    "If you edit files and an accepted finding would still remain unresolved, the patch did not satisfy validator semantics. Prefer another targeted patch over a generic finish.",
    "These accepted findings remain active until validation no longer reports them or the user rejects them.",
  ].join("\n");
}

function buildDesignerNoteSummary(designerNotes: LocalWorkbenchDesignerNote[]): string | null {
  if (designerNotes.length === 0) {
    return null;
  }
  return [
    "Active designer notes that are not yet schema-backed contract fields:",
    ...designerNotes.map((note) => `- ${note.content}`),
  ].join("\n");
}

function normalizeExpectedMatches(rawValue: unknown): number {
  if (rawValue === undefined) {
    return 1;
  }
  if (typeof rawValue !== "number" || !Number.isInteger(rawValue) || rawValue < 1) {
    throw new LocalLlmAgentError("expectedMatches must be a positive integer when provided.");
  }
  return rawValue;
}

function ensureNonEmptyText(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new LocalLlmAgentError(`${fieldName} must be a non-empty string.`);
  }
  return value;
}

function parseTextEditOperations(rawEdits: unknown): TextEditOperation[] {
  if (!Array.isArray(rawEdits) || rawEdits.length === 0) {
    throw new LocalLlmAgentError("edits must be a non-empty array.");
  }

  return rawEdits.map((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new LocalLlmAgentError(`Edit ${index + 1} must be an object.`);
    }

    const record = entry as Record<string, unknown>;
    const kind = String(record.kind ?? "");
    const expectedMatches = normalizeExpectedMatches(record.expectedMatches);

    switch (kind) {
      case "replace":
        return {
          kind,
          oldText: ensureNonEmptyText(record.oldText, `edits[${index}].oldText`),
          newText: typeof record.newText === "string" ? record.newText : "",
          expectedMatches,
        };
      case "insert_before":
      case "insert_after":
        return {
          kind,
          anchorText: ensureNonEmptyText(record.anchorText, `edits[${index}].anchorText`),
          text: typeof record.text === "string" ? record.text : "",
          expectedMatches,
        };
      case "delete":
        return {
          kind,
          oldText: ensureNonEmptyText(record.oldText, `edits[${index}].oldText`),
          expectedMatches,
        };
      default:
        throw new LocalLlmAgentError(`Edit ${index + 1} has unsupported kind "${kind}".`);
    }
  });
}

function countExactMatches(content: string, needle: string): number {
  if (!needle) {
    return 0;
  }
  return content.split(needle).length - 1;
}

function applyExactTextEdit(
  content: string,
  edit: TextEditOperation,
): { content: string; appliedCount: number } {
  const ensureSafeInsertionBoundary = (
    prefix: string,
    suffix: string,
    kind: "insert_before" | "insert_after",
  ) => {
    if (!prefix || !suffix) {
      return;
    }
    const left = prefix.slice(-1);
    const right = suffix.slice(0, 1);
    if (!/\s/.test(left) && !/\s/.test(right)) {
      throw new LocalLlmAgentError(
        `${kind} would merge inserted text directly into adjacent content. Include leading/trailing whitespace or newline in the inserted text, or use replace instead.`,
      );
    }
  };

  switch (edit.kind) {
    case "replace": {
      const matchCount = countExactMatches(content, edit.oldText);
      if (matchCount !== edit.expectedMatches) {
        throw new LocalLlmAgentError(
          `replace expected ${edit.expectedMatches} match(es) for the provided oldText but found ${matchCount}.`,
        );
      }
      if (matchCount === 0) {
        throw new LocalLlmAgentError("replace did not find the required oldText context.");
      }
      if (edit.oldText === content) {
        throw new LocalLlmAgentError("full-file replacements are not allowed; use localized edits only.");
      }
      return {
        content: content.split(edit.oldText).join(edit.newText),
        appliedCount: matchCount,
      };
    }
    case "delete": {
      const matchCount = countExactMatches(content, edit.oldText);
      if (matchCount !== edit.expectedMatches) {
        throw new LocalLlmAgentError(
          `delete expected ${edit.expectedMatches} match(es) for the provided oldText but found ${matchCount}.`,
        );
      }
      if (matchCount === 0) {
        throw new LocalLlmAgentError("delete did not find the required oldText context.");
      }
      if (edit.oldText === content) {
        throw new LocalLlmAgentError("deleting the entire file is not allowed.");
      }
      return {
        content: content.split(edit.oldText).join(""),
        appliedCount: matchCount,
      };
    }
    case "insert_before": {
      const matchCount = countExactMatches(content, edit.anchorText);
      if (matchCount !== edit.expectedMatches) {
        throw new LocalLlmAgentError(
          `insert_before expected ${edit.expectedMatches} match(es) for the provided anchorText but found ${matchCount}.`,
        );
      }
      if (matchCount === 0) {
        throw new LocalLlmAgentError("insert_before did not find the required anchorText context.");
      }
      ensureSafeInsertionBoundary(edit.text, edit.anchorText, "insert_before");
      return {
        content: content.split(edit.anchorText).join(`${edit.text}${edit.anchorText}`),
        appliedCount: matchCount,
      };
    }
    case "insert_after": {
      const matchCount = countExactMatches(content, edit.anchorText);
      if (matchCount !== edit.expectedMatches) {
        throw new LocalLlmAgentError(
          `insert_after expected ${edit.expectedMatches} match(es) for the provided anchorText but found ${matchCount}.`,
        );
      }
      if (matchCount === 0) {
        throw new LocalLlmAgentError("insert_after did not find the required anchorText context.");
      }
      ensureSafeInsertionBoundary(edit.anchorText, edit.text, "insert_after");
      return {
        content: content.split(edit.anchorText).join(`${edit.anchorText}${edit.text}`),
        appliedCount: matchCount,
      };
    }
    default: {
      const exhaustiveCheck: never = edit;
      throw new LocalLlmAgentError(`Unsupported edit operation: ${String(exhaustiveCheck)}`);
    }
  }
}

function formatTypeScriptDiagnostic(filePath: string, diagnostic: ts.Diagnostic): string {
  const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
  if (diagnostic.file && typeof diagnostic.start === "number") {
    const position = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
    return `${message} (${filePath}:${position.line + 1}:${position.character + 1})`;
  }
  return `${message} (${filePath})`;
}

function validateScriptContent(filePath: string, content: string): void {
  const result = ts.transpileModule(content, {
    fileName: filePath,
    reportDiagnostics: true,
    compilerOptions: {
      jsx: ts.JsxEmit.Preserve,
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ESNext,
    },
  });
  const diagnostic = result.diagnostics?.find((entry) => entry.category === ts.DiagnosticCategory.Error);
  if (diagnostic) {
    throw new LocalLlmAgentError(
      `apply_text_edits validation failed for ${filePath}: ${formatTypeScriptDiagnostic(filePath, diagnostic)}`,
    );
  }
}

function validateJsonContent(filePath: string, content: string): void {
  try {
    JSON.parse(content);
  } catch (error) {
    throw new LocalLlmAgentError(
      `apply_text_edits validation failed for ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function validateCssContent(filePath: string, content: string): void {
  try {
    postcss.parse(content, { from: filePath });
  } catch (error) {
    const typedError = error as Error & { line?: number; column?: number; reason?: string };
    const location = typedError.line && typedError.column ? `:${typedError.line}:${typedError.column}` : "";
    const reason = typedError.reason || typedError.message || String(error);
    throw new LocalLlmAgentError(
      `apply_text_edits validation failed for ${filePath}${location}: ${reason}`,
    );
  }
}

function validateEditedContent(filePath: string, content: string): void {
  const extension = path.extname(filePath).toLowerCase();
  if (SCRIPT_FILE_EXTENSIONS.has(extension)) {
    validateScriptContent(filePath, content);
    return;
  }
  if (extension === ".json") {
    validateJsonContent(filePath, content);
    return;
  }
  if (extension === ".css") {
    validateCssContent(filePath, content);
  }
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
  const repairs = extractRepairEntries(preparedPayload.repairMap);

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
      name: "apply_text_edits",
      description: "Apply small exact-context localized edits to one existing file under the allowed roots.",
      parameters: {
        type: "object",
        additionalProperties: false,
        required: ["path", "edits"],
        properties: {
          path: { type: "string", minLength: 1 },
          edits: {
            type: "array",
            minItems: 1,
            items: {
              oneOf: [
                {
                  type: "object",
                  additionalProperties: false,
                  required: ["kind", "oldText", "newText"],
                  properties: {
                    kind: { type: "string", enum: ["replace"] },
                    oldText: { type: "string", minLength: 1 },
                    newText: { type: "string" },
                    expectedMatches: { type: "integer", minimum: 1 },
                  },
                },
                {
                  type: "object",
                  additionalProperties: false,
                  required: ["kind", "anchorText", "text"],
                  properties: {
                    kind: { type: "string", enum: ["insert_before"] },
                    anchorText: { type: "string", minLength: 1 },
                    text: { type: "string" },
                    expectedMatches: { type: "integer", minimum: 1 },
                  },
                },
                {
                  type: "object",
                  additionalProperties: false,
                  required: ["kind", "anchorText", "text"],
                  properties: {
                    kind: { type: "string", enum: ["insert_after"] },
                    anchorText: { type: "string", minLength: 1 },
                    text: { type: "string" },
                    expectedMatches: { type: "integer", minimum: 1 },
                  },
                },
                {
                  type: "object",
                  additionalProperties: false,
                  required: ["kind", "oldText"],
                  properties: {
                    kind: { type: "string", enum: ["delete"] },
                    oldText: { type: "string", minLength: 1 },
                    expectedMatches: { type: "integer", minimum: 1 },
                  },
                },
              ],
            },
          },
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
  readFiles: Set<string>,
  fileContents: Map<string, string>,
  touchedFiles: Set<string>,
  writeCount: { value: number },
): Promise<Record<string, unknown>> {
  switch (name) {
    case "list_allowed_files":
      return { files: await listAllowedFiles(context.repoRoot, context.allowedRoots) };
    case "read_file": {
      const filePath = resolveAllowedPath(context.repoRoot, context.allowedRoots, String(args.path ?? ""));
      const relativePath = path.relative(context.repoRoot, filePath);
      const content = fileContents.get(relativePath) ?? await fsp.readFile(filePath, "utf8");
      readFiles.add(relativePath);
      fileContents.set(relativePath, content);
      return {
        path: relativePath,
        content,
      };
    }
    case "search_allowed_files":
      return { matches: await searchAllowedFiles(context.repoRoot, context.allowedRoots, String(args.pattern ?? "")) };
    case "apply_text_edits": {
      if (writeCount.value >= context.maxWrites) {
        throw new LocalLlmAgentError(`Write budget exceeded (${context.maxWrites}).`);
      }
      const filePath = resolveAllowedPath(context.repoRoot, context.allowedRoots, String(args.path ?? ""));
      const relativePath = path.relative(context.repoRoot, filePath);
      if (!readFiles.has(relativePath)) {
        throw new LocalLlmAgentError(
          `apply_text_edits failed for ${relativePath}: cannot edit before reading it in this session.`,
        );
      }
      let candidateContent = fileContents.get(relativePath) ?? await fsp.readFile(filePath, "utf8");
      let editsApplied = 0;

      try {
        const edits = parseTextEditOperations(args.edits);
        for (const edit of edits) {
          const result = applyExactTextEdit(candidateContent, edit);
          candidateContent = result.content;
          editsApplied += result.appliedCount;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new LocalLlmAgentError(`apply_text_edits failed for ${relativePath}: ${message}`);
      }

      validateEditedContent(relativePath, candidateContent);
      await fsp.writeFile(filePath, candidateContent, "utf8");
      fileContents.set(relativePath, candidateContent);
      touchedFiles.add(relativePath);
      writeCount.value += 1;
      return {
        path: relativePath,
        editsApplied,
        writesUsed: writeCount.value,
      };
    }
    case "finish":
      if (Boolean(args.noChanges) && touchedFiles.size > 0) {
        throw new LocalLlmAgentError(
          `Local model reported noChanges=true after writing files: ${[...touchedFiles].sort((left, right) => left.localeCompare(right)).join(", ")}. Call finish again with noChanges=false once the edit pass is complete.`,
        );
      }
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

function inspectResponsesPayload(payload: Record<string, unknown>): ResponsesPayloadDiagnostics {
  return {
    status: typeof payload.status === "string" && payload.status.trim() ? payload.status : null,
    incompleteDetails: payload.incomplete_details === undefined ? null : payload.incomplete_details,
  };
}

function summarizeIncompleteDetails(details: unknown): string | null {
  if (details === null || details === undefined) {
    return null;
  }
  if (typeof details === "string" && details.trim()) {
    return details.trim();
  }
  if (typeof details === "number" || typeof details === "boolean") {
    return String(details);
  }
  if (details && typeof details === "object" && !Array.isArray(details)) {
    const record = details as Record<string, unknown>;
    const parts = [
      typeof record.reason === "string" ? record.reason.trim() : "",
      typeof record.type === "string" ? record.type.trim() : "",
      typeof record.code === "string" ? record.code.trim() : "",
      typeof record.message === "string" ? record.message.trim() : "",
    ].filter(Boolean);
    if (parts.length > 0) {
      return parts.join(": ");
    }
  }
  try {
    return JSON.stringify(details);
  } catch {
    return String(details);
  }
}

function buildIncompleteResponsesMessage(diagnostics: ResponsesPayloadDiagnostics): string {
  const suffixParts: string[] = [];
  if (diagnostics.status) {
    suffixParts.push(`status=${diagnostics.status}`);
  }
  const incompleteDetailsSummary = summarizeIncompleteDetails(diagnostics.incompleteDetails);
  if (incompleteDetailsSummary) {
    suffixParts.push(`incomplete_details=${incompleteDetailsSummary}`);
  }
  const suffix = suffixParts.length > 0 ? ` (${suffixParts.join(", ")})` : "";
  return `Local model returned an incomplete response${suffix}. LM Studio may have "Limit Response Length" enabled. Disable "Limit Response Length" in the LM Studio preset and retry.`;
}

function assertCompletedResponsesPayload(
  payload: Record<string, unknown>,
  diagnostics = inspectResponsesPayload(payload),
): ResponsesPayloadDiagnostics {
  if ((diagnostics.status && diagnostics.status !== "completed") || diagnostics.incompleteDetails !== null) {
    throw new LocalLlmAgentError(
      buildIncompleteResponsesMessage(diagnostics),
      {
        kind: "incomplete_response",
        status: diagnostics.status,
        incomplete_details: diagnostics.incompleteDetails,
      },
    );
  }
  return diagnostics;
}

function extractToolCallsFromOutput(outputItems: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
  return outputItems.filter((entry) => String(entry.type ?? "") === "function_call");
}

function extractToolCalls(payload: Record<string, unknown>): Array<Record<string, unknown>> {
  return extractToolCallsFromOutput(ensureOutputItems(payload));
}

function extractAssistantTextFromOutput(outputItems: Array<Record<string, unknown>>, explicitOutputText: unknown): string {
  if (typeof explicitOutputText === "string" && explicitOutputText.trim()) {
    return explicitOutputText.trim();
  }

  const fragments: string[] = [];
  for (const item of outputItems) {
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

function extractAssistantText(payload: Record<string, unknown>): string {
  return extractAssistantTextFromOutput(ensureOutputItems(payload), payload.output_text);
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

function isRecoverableToolError(error: unknown): error is LocalLlmAgentError {
  return (
    error instanceof LocalLlmAgentError
    && (
      error.message.includes("apply_text_edits failed for")
      || error.message.includes("apply_text_edits validation failed for")
      || error.message.includes("File not found:")
      || error.message.includes("noChanges=true after writing files")
    )
  );
}

function buildInput(history: string[]): string {
  return history.join("\n\n");
}

function annotateAgentError(
  error: unknown,
  transcript: LocalLlmTranscriptEntry[],
): LocalLlmAgentError {
  const base =
    error instanceof LocalLlmAgentError
      ? error
      : new LocalLlmAgentError(error instanceof Error ? error.message : String(error));

  transcript.push({
    type: "error",
    payload: { message: base.message, ...(base.details ?? {}) },
    createdAt: new Date().toISOString(),
  });
  base.transcript = [...transcript];
  return base;
}

function extractFirstJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start < 0) {
    return null;
  }

  let depth = 0;
  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return text.slice(start, index + 1);
      }
    }
  }

  return null;
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

const NOTE_ONLY_CSS_COLOR_KEYWORDS = new Set([
  "transparent",
  "currentcolor",
  "inherit",
  "unset",
  "initial",
  "revert",
  "revert-layer",
]);
const HEX_COLOR_PATTERN = /^#[0-9a-f]{3,8}$/i;
const FUNCTIONAL_COLOR_PATTERN = /^(?:rgba?|hsla?)\([^)]*\)$/i;
const CSS_VAR_COLOR_PATTERN = /^var\(\s*--[^)]+\)$/i;
const NAMED_COLOR_PATTERN = new RegExp(`\\b(?:${CSS_NAMED_COLOR_NAMES.join("|")})\\b`, "gi");

function parseStructuredColorValue(rawValue: string): {
  kind: "supported" | "note-only" | "invalid";
  value: string | null;
} {
  const trimmed = rawValue.trim();
  if (!trimmed) {
    return { kind: "invalid", value: null };
  }

  const lower = trimmed.toLowerCase();
  if (NOTE_ONLY_CSS_COLOR_KEYWORDS.has(lower)) {
    return { kind: "note-only", value: lower };
  }

  if (
    HEX_COLOR_PATTERN.test(trimmed)
    || FUNCTIONAL_COLOR_PATTERN.test(trimmed)
    || CSS_VAR_COLOR_PATTERN.test(trimmed)
  ) {
    return { kind: "supported", value: trimmed };
  }

  const normalizedNamedColor = normalizeCssNamedColor(lower);
  if (normalizedNamedColor) {
    return { kind: "supported", value: normalizedNamedColor };
  }

  return { kind: "invalid", value: null };
}

function deriveColorUsageNote(message: string, colorValue: string): string | null {
  const lower = message.toLowerCase();
  if (/\b(anchor|link)s?\b/.test(lower)) {
    return `Anchor links should use ${colorValue}.`;
  }
  if ((/\bshell\b/.test(lower) && /\bbackground\b/.test(lower)) || /\bshell background\b/.test(lower)) {
    return `Shell background should use ${colorValue}.`;
  }
  if (/\bsurface\b/.test(lower) && /\bbackground\b/.test(lower)) {
    return `Surface background should use ${colorValue}.`;
  }
  if (/\bbackground\b/.test(lower)) {
    return `Background should use ${colorValue}.`;
  }
  return null;
}

function buildTruthfulAssistantMessage(
  contractChanges: LocalContractShaperResult["contractChanges"],
  designerNotes: string[],
): string {
  if (contractChanges.length > 0 && designerNotes.length > 0) {
    return `Applied: ${contractChanges.map((change) => change.summary).join(" ")} Designer notes: ${designerNotes.join(" ")}`;
  }
  if (contractChanges.length > 0) {
    return `Applied: ${contractChanges.map((change) => change.summary).join(" ")}`;
  }
  if (designerNotes.length > 0) {
    return `Captured as designer notes: ${designerNotes.join(" ")}`;
  }
  return "No supported contract changes were extracted.";
}

function extractExplicitColorValues(message: string): string[] {
  return uniqueStrings([
    ...(message.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []),
    ...(message.match(/(?:rgba?|hsla?)\([^)]*\)/gi) ?? []),
    ...(message.match(/var\(\s*--[^)]+\)/gi) ?? []),
  ]);
}

function extractContextualNamedColorValues(message: string): string[] {
  const lower = message.toLowerCase();
  NAMED_COLOR_PATTERN.lastIndex = 0;
  const matches = [...lower.matchAll(NAMED_COLOR_PATTERN)];
  return uniqueStrings(
    matches
      .map((match) => {
        const index = match.index ?? -1;
        if (index < 0) {
          return "";
        }
        const contextStart = Math.max(0, index - 48);
        const contextEnd = Math.min(lower.length, index + match[0].length + 24);
        const context = lower.slice(contextStart, contextEnd);
        if (!/\b(color|background|highlight|accent|anchor|link|shell|surface|should be|use|set|make|add)\b/.test(context)) {
          return "";
        }
        return match[0];
      })
      .filter(Boolean),
  );
}

function fallbackShapeDesignerMessage(message: string): LocalContractShaperResult {
  const contractChanges: LocalContractShaperResult["contractChanges"] = [];
  const designerNotes: string[] = [];
  const trimmed = message.trim();
  const fallbackColorNotes: string[] = [];
  const addStructuredColorValue = (rawValue: string) => {
    const parsed = parseStructuredColorValue(rawValue);
    if (parsed.kind === "supported" && parsed.value) {
      if (contractChanges.some((change) => change.field === "color.allowedValues" && change.value === parsed.value)) {
        return;
      }
      contractChanges.push({
        field: "color.allowedValues",
        action: "add",
        value: parsed.value,
        summary: `Allow color ${parsed.value} in the working contract.`,
      });
      const usageNote = deriveColorUsageNote(trimmed, parsed.value);
      if (usageNote) {
        fallbackColorNotes.push(usageNote);
      }
      return;
    }

    if (parsed.kind === "note-only" && parsed.value) {
      fallbackColorNotes.push(
        deriveColorUsageNote(trimmed, parsed.value) ?? `Requested color ${parsed.value} was captured as a designer note.`,
      );
    }
  };

  for (const match of extractExplicitColorValues(trimmed)) {
    addStructuredColorValue(match);
  }
  for (const match of extractContextualNamedColorValues(trimmed)) {
    addStructuredColorValue(match);
  }

  const widthMatch = trimmed.match(/\bmax(?:imum)?(?:\s+content)?\s+(\d{3,4})\s*px\b/i)
    ?? trimmed.match(/\bmax\s+(\d{3,4})\s*px\b/i);
  if (widthMatch) {
    contractChanges.push({
      field: "surfaces.reference-target-web.layout.maxContentWidth",
      action: "set",
      value: Number(widthMatch[1]),
      summary: `Set max content width to ${widthMatch[1]}px.`,
    });
  }

  const policyMatch = trimmed.match(/\bcolor policy\b.*\b(off|warn|strict)\b/i)
    ?? trimmed.match(/\b(off|warn|strict)\b.*\bcolor\b/i);
  if (policyMatch) {
    contractChanges.push({
      field: "color.policy",
      action: "set",
      value: policyMatch[1].toLowerCase(),
      summary: `Set color policy to ${policyMatch[1].toLowerCase()}.`,
    });
  }

  const fontMatches = [...trimmed.matchAll(/["“]([^"”]+)["”]\s*(?:font)?/g)]
    .map((match) => match[1]?.trim() ?? "")
    .filter(Boolean);
  for (const font of fontMatches) {
    contractChanges.push({
      field: "surfaces.reference-target-web.allowedFonts",
      action: "add",
      value: font,
      summary: `Allow font ${font}.`,
    });
  }

  designerNotes.push(...fallbackColorNotes);

  let noteCandidate = trimmed;
  for (const explicitColor of extractExplicitColorValues(trimmed)) {
    noteCandidate = noteCandidate.replace(explicitColor, " ");
  }
  noteCandidate = noteCandidate.replace(NAMED_COLOR_PATTERN, " ");
  noteCandidate = noteCandidate.replace(/\bmax(?:imum)?(?:\s+content)?\s+\d{3,4}\s*px\b/gi, " ");
  noteCandidate = noteCandidate.replace(/\bmax\s+\d{3,4}\s*px\b/gi, " ");
  noteCandidate = noteCandidate.replace(/\bcolor policy\b.*\b(off|warn|strict)\b/gi, " ");
  noteCandidate = noteCandidate.replace(/\b(off|warn|strict)\b.*\bcolor\b/gi, " ");
  noteCandidate = noteCandidate.replace(/["“][^"”]+["”]\s*(?:font)?/g, " ");
  noteCandidate = noteCandidate.replace(/\s+/g, " ").replace(/^[,\s]+|[,\s]+$/g, "");

  if (/\bedge(?:\s*|-)\s*to(?:\s*|-)\s*edge\b/i.test(trimmed)) {
    designerNotes.push("Edge-to-edge layout intent should be preserved.");
  } else if (designerNotes.length === 0 && noteCandidate.split(" ").filter(Boolean).length >= 3) {
    designerNotes.push(noteCandidate);
  }
  const normalizedDesignerNotes = uniqueStrings(designerNotes);
  return {
    assistantMessage: buildTruthfulAssistantMessage(contractChanges, normalizedDesignerNotes),
    contractChanges,
    designerNotes: normalizedDesignerNotes.length > 0 ? normalizedDesignerNotes : contractChanges.length === 0 ? [trimmed] : [],
  };
}

function sanitizeContractShaperResult(payload: unknown, message: string): LocalContractShaperResult {
  const record = asRecord(payload);
  const rawChanges = Array.isArray(record.contractChanges) ? record.contractChanges : [];
  const contractChanges: LocalContractShaperResult["contractChanges"] = [];
  const inferredDesignerNotes: string[] = [];

  for (const entry of rawChanges) {
    const candidate = asRecord(entry);
    const field = String(candidate.field ?? "") as LocalWorkbenchContractChange["field"];
    const action = String(candidate.action ?? "") as LocalWorkbenchContractChange["action"];
    const value = candidate.value;
    const summary = typeof candidate.summary === "string" && candidate.summary.trim()
      ? candidate.summary.trim()
      : `Update ${field}.`;

    if (
      field === "color.allowedValues"
      && action === "add"
      && typeof value === "string"
      && value.trim()
    ) {
      const parsedColor = parseStructuredColorValue(value);
      if (parsedColor.kind === "supported" && parsedColor.value) {
        contractChanges.push({
          field,
          action,
          value: parsedColor.value,
          summary: `Allow color ${parsedColor.value} in the working contract.`,
        });
        const usageNote = deriveColorUsageNote(message, parsedColor.value);
        if (usageNote) {
          inferredDesignerNotes.push(usageNote);
        }
      } else if (parsedColor.kind === "note-only" && parsedColor.value) {
        inferredDesignerNotes.push(
          deriveColorUsageNote(message, parsedColor.value) ?? `Requested color ${parsedColor.value} was captured as a designer note.`,
        );
      }
      continue;
    }

    if (
      field === "surfaces.reference-target-web.allowedFonts"
      && action === "add"
      && typeof value === "string"
      && value.trim()
    ) {
      contractChanges.push({ field, action, value: value.trim(), summary });
      continue;
    }

    if (
      field === "color.policy"
      && action === "set"
      && typeof value === "string"
      && ["off", "warn", "strict"].includes(value.toLowerCase())
    ) {
      contractChanges.push({ field, action, value: value.toLowerCase(), summary });
      continue;
    }

    if (
      field === "surfaces.reference-target-web.layout.maxContentWidth"
      && action === "set"
      && typeof value === "number"
      && Number.isFinite(value)
      && value > 0
    ) {
      contractChanges.push({ field, action, value, summary });
    }
  }

  const designerNotes = uniqueStrings([
    ...(Array.isArray(record.designerNotes) ? record.designerNotes : [])
      .map((entry) => (typeof entry === "string" ? entry : ""))
      .filter(Boolean),
    ...inferredDesignerNotes,
  ]);

  const fallback = fallbackShapeDesignerMessage(message);
  const normalizedDesignerNotes = designerNotes.length > 0
    ? designerNotes
    : contractChanges.length === 0
      ? fallback.designerNotes
      : [];
  const assistantMessage = buildTruthfulAssistantMessage(
    contractChanges,
    normalizedDesignerNotes,
  );

  return {
    assistantMessage,
    contractChanges,
    designerNotes: normalizedDesignerNotes,
  };
}

export async function shapeLocalWorkbenchContract(input: {
  config: LocalLlmConfig;
  message: string;
  contractSummary: string;
  activeDesignerNotes?: LocalWorkbenchDesignerNote[];
}): Promise<LocalContractShaperResult> {
  const fallback = fallbackShapeDesignerMessage(input.message);
  const url = buildResponsesUrl(input.config.baseUrl);
  const activeNotesSummary = input.activeDesignerNotes?.length
    ? input.activeDesignerNotes.map((note) => `- ${note.content}`).join("\n")
    : "none";
  const prompt = [
    "You convert designer chat messages into supported working-contract changes.",
    "Return only JSON.",
    "Supported change fields:",
    '- `color.allowedValues` with action `add` and a CSS color value.',
    '- `color.policy` with action `set` and one of `off`, `warn`, `strict`.',
    '- `surfaces.reference-target-web.layout.maxContentWidth` with action `set` and a number.',
    '- `surfaces.reference-target-web.allowedFonts` with action `add` and a string font value.',
    "Normalize named CSS colors to canonical lowercase 6-digit hex.",
    "Keep explicit hex, rgb()/rgba(), hsl()/hsla(), and var(...) values as given.",
    "Do not use transparent/currentColor/inherit/unset/initial/revert/revert-layer as contract changes; capture them in designerNotes instead.",
    "Anything else must go into `designerNotes` as short strings.",
    "Do not invent unsupported fields or actions.",
    `Current working contract summary:\n${input.contractSummary}`,
    `Active designer notes:\n${activeNotesSummary}`,
    `Designer message:\n${input.message.trim()}`,
    'Return JSON as {"assistantMessage": string, "contractChanges": [], "designerNotes": []}.',
  ].join("\n\n");

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(input.config.apiKey ? { Authorization: `Bearer ${input.config.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: input.config.model,
        input: prompt,
      }),
    });

    if (!response.ok) {
      return fallback;
    }

    const payload = (await response.json()) as Record<string, unknown>;
    assertCompletedResponsesPayload(payload);
    const outputText = extractAssistantText(payload);
    if (!outputText) {
      return fallback;
    }

    const jsonText = extractFirstJsonObject(outputText);
    if (!jsonText) {
      return fallback;
    }

    return sanitizeContractShaperResult(JSON.parse(jsonText), input.message);
  } catch (error) {
    if (error instanceof LocalLlmAgentError && error.details?.kind === "incomplete_response") {
      return {
        ...fallback,
        assistantMessage: `${fallback.assistantMessage} ${error.message}`.trim(),
      };
    }
    return fallback;
  }
}

export async function runLocalLlmAgent(options: AgentOptions): Promise<LocalLlmAgentResult> {
  const maxTurns = options.maxTurns ?? 16;
  const maxToolCalls = options.maxToolCalls ?? 32;
  const maxWrites = options.maxWrites ?? 12;
  const maxWallTimeMs = options.maxWallTimeMs ?? 180_000;
  const transcript: LocalLlmTranscriptEntry[] = [];
  const readFiles = new Set<string>();
  const fileContents = new Map<string, string>();
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
  const initialAgentInput = buildInput(history);

  try {
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
      const diagnostics = inspectResponsesPayload(json);
      const output = Array.isArray(json.output) ? ensureOutputItems(json) : [];
      const assistantText = extractAssistantTextFromOutput(output, json.output_text);
      const assistantPayload = {
        ...(diagnostics.status ? { status: diagnostics.status } : {}),
        ...(diagnostics.incompleteDetails !== null ? { incomplete_details: diagnostics.incompleteDetails } : {}),
        output,
        ...(assistantText ? { output_text: assistantText } : {}),
      };

      transcript.push({
        type: "assistant",
        payload: assistantPayload,
        createdAt: new Date().toISOString(),
      });

      assertCompletedResponsesPayload(json, diagnostics);

      const toolCalls = extractToolCallsFromOutput(ensureOutputItems(json));
      if (assistantText) {
        history.push(`Assistant:\n${assistantText}`);
      }

      if (toolCalls.length === 0) {
        throw new LocalLlmAgentError("Local model did not return any function tools in the responses output.");
      }

      let shouldContinueTurn = false;
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
        history.push(`Assistant tool call ${name}:\n${JSON.stringify(args)}`);
        try {
          const result = await executeTool(
            name,
            args,
            {
              repoRoot: options.repoRoot,
              allowedRoots: options.allowedRoots,
              maxWrites,
              maxToolCalls,
            },
            readFiles,
            fileContents,
            touchedFiles,
            writeCount,
          );
          transcript.push({
            type: name === "finish" ? "finish" : "tool",
            payload: { name, args, result },
            createdAt: new Date().toISOString(),
          });
          history.push(`Tool result ${name}:\n${JSON.stringify(result)}`);
          if (name === "finish") {
            return {
              transcript,
              touchedFiles: [...touchedFiles].sort((left, right) => left.localeCompare(right)),
              summary: String(result.summary ?? ""),
              noChanges: Boolean(result.noChanges),
              agentInput: initialAgentInput,
            };
          }
        } catch (error) {
          if (!isRecoverableToolError(error)) {
            throw error;
          }
          const message = error.message;
          transcript.push({
            type: "tool",
            payload: { name, args, error: { message } },
            createdAt: new Date().toISOString(),
          });
          history.push(`Tool error ${name}:\n${JSON.stringify({ error: message })}`);
          shouldContinueTurn = true;
          break;
        }
      }

      if (shouldContinueTurn) {
        continue;
      }
    }
  } catch (error) {
    throw annotateAgentError(error, transcript);
  }

  throw annotateAgentError(
    new LocalLlmAgentError(`Local model did not finish within ${maxTurns} turn(s).`),
    transcript,
  );
}
