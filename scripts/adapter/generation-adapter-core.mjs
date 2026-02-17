#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const VALID_TOOLS = new Set(["codex", "cursor", "lovable", "figma-make"]);
const VALID_MODES = new Set(["workspace", "descriptor"]);

const DEFAULT_CONTRACT_PATH = "contracts/surfaces.web.contract.json";
const DEFAULT_INTERFACECTL_CLI =
  "tools/interfacectl/packages/interfacectl-cli/dist/index.js";
const DEFAULT_GENERATION_GUARD =
  "tools/interfacectl/tools/check-generation-boundaries.mjs";

const VALIDATE_CODE_MAP = {
  "color.raw-value.used": "color.rawValues",
  "color.token.namespace.violation": "color.token.namespace",
  "shell.primitive.disallowed": "shell-owned-primitive-emitted",
};

export class AdapterInputError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "AdapterInputError";
    this.code = details.code ?? "adapter.input";
    this.meta = details.meta;
  }
}

export function isAdapterInputError(error) {
  return error instanceof AdapterInputError;
}

export function buildCoverage(mode) {
  if (mode === "workspace") {
    return { generationGuard: true, fullValidate: true };
  }
  return { generationGuard: true, fullValidate: false };
}

export function computeStatusFromFindings(findings) {
  const hasBlocking = findings.some(
    (finding) => finding.severity === "error" || finding.policy === "strict",
  );
  if (hasBlocking) return "block";
  if (findings.length > 0) return "warn";
  return "pass";
}

export function normalizeAdapterRequest(input) {
  if (!input || typeof input !== "object") {
    throw new AdapterInputError("Adapter request must be an object.");
  }

  const requestId =
    typeof input.requestId === "string" && input.requestId.trim().length > 0
      ? input.requestId.trim()
      : crypto.randomUUID();

  const tool =
    typeof input.tool === "string" ? input.tool.trim().toLowerCase() : "";
  if (!VALID_TOOLS.has(tool)) {
    throw new AdapterInputError(
      `Invalid tool \"${input.tool ?? ""}\". Expected one of: ${[
        ...VALID_TOOLS,
      ].join(", ")}.`,
    );
  }

  const surfaceId =
    typeof input.surfaceId === "string" ? input.surfaceId.trim() : "";
  if (!surfaceId) {
    throw new AdapterInputError("surfaceId is required.");
  }

  const mode = typeof input.mode === "string" ? input.mode.trim() : "";
  if (!VALID_MODES.has(mode)) {
    throw new AdapterInputError(
      `Invalid mode \"${input.mode ?? ""}\". Expected workspace|descriptor.`,
    );
  }

  let workspaceRoot;
  if (mode === "workspace") {
    workspaceRoot =
      typeof input.workspaceRoot === "string" && input.workspaceRoot.trim().length > 0
        ? path.resolve(input.workspaceRoot.trim())
        : undefined;
    if (!workspaceRoot) {
      throw new AdapterInputError(
        "workspaceRoot is required when mode=workspace.",
      );
    }
  }

  let descriptor;
  if (mode === "descriptor") {
    if (!Array.isArray(input.descriptor)) {
      throw new AdapterInputError(
        "descriptor must be an array when mode=descriptor.",
      );
    }
    descriptor = input.descriptor;
  }

  const contractPath =
    typeof input.contractPath === "string" && input.contractPath.trim().length > 0
      ? input.contractPath.trim()
      : undefined;

  const provenanceInput =
    input.provenance && typeof input.provenance === "object"
      ? input.provenance
      : {};

  const provenance = {
    sessionId:
      typeof provenanceInput.sessionId === "string"
        ? provenanceInput.sessionId
        : undefined,
    userId:
      typeof provenanceInput.userId === "string"
        ? provenanceInput.userId
        : undefined,
    timestamp:
      typeof provenanceInput.timestamp === "string"
        ? provenanceInput.timestamp
        : new Date().toISOString(),
  };

  return {
    requestId,
    tool,
    surfaceId,
    mode,
    workspaceRoot,
    descriptor,
    contractPath,
    provenance,
  };
}

function resolvePathOrDefault(value, fallback, cwd) {
  const candidate = value ?? fallback;
  if (!candidate) return undefined;
  return path.isAbsolute(candidate) ? candidate : path.resolve(cwd, candidate);
}

function resolveRuntimePaths(request, options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const contractPath = resolvePathOrDefault(
    request.contractPath,
    options.defaultContractPath ?? DEFAULT_CONTRACT_PATH,
    cwd,
  );

  const cliInput =
    options.interfacectlCliPath ??
    process.env.SURFACES_ADAPTER_INTERFACECTL_CLI ??
    DEFAULT_INTERFACECTL_CLI;

  const guardInput =
    options.generationGuardPath ??
    process.env.SURFACES_ADAPTER_GENERATION_GUARD ??
    DEFAULT_GENERATION_GUARD;

  return {
    cwd,
    contractPath,
    cliPath: resolvePathOrDefault(cliInput, undefined, cwd),
    guardPath: resolvePathOrDefault(guardInput, undefined, cwd),
    nodeBin: options.nodeBin ?? process.execPath,
    env: options.env ?? process.env,
  };
}

function ensureReadableFile(filePath, label) {
  if (!filePath) {
    throw new AdapterInputError(`${label} path is required.`);
  }

  if (!fs.existsSync(filePath)) {
    throw new AdapterInputError(`${label} file not found at ${filePath}.`);
  }

  if (!fs.statSync(filePath).isFile()) {
    throw new AdapterInputError(`${label} path is not a file: ${filePath}.`);
  }
}

function readJsonFile(filePath, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new AdapterInputError(
      `Failed to read ${label} JSON at ${filePath}: ${error.message}`,
    );
  }
}

function runNodeScript(runtime, scriptPath, args) {
  const result = spawnSync(runtime.nodeBin, [scriptPath, ...args], {
    cwd: runtime.cwd,
    env: runtime.env,
    encoding: "utf8",
  });

  if (result.error) {
    throw new Error(`Failed to run ${scriptPath}: ${result.error.message}`);
  }

  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function makeTempDescriptorFile(prefix, descriptorPayload) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), `${prefix}-`));
  const descriptorPath = path.join(tempDir, "descriptor.json");
  fs.writeFileSync(descriptorPath, `${JSON.stringify(descriptorPayload, null, 2)}\n`);
  return {
    tempDir,
    descriptorPath,
  };
}

function cleanupTempPath(tempDir) {
  if (!tempDir) return;
  fs.rmSync(tempDir, { recursive: true, force: true });
}

function parseCsv(value) {
  if (!value) return [];
  return String(value)
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseGuardFindings(output) {
  const findings = [];
  const lines = output.split(/\r?\n/);
  let section = "";

  const primitivePattern =
    /^-\s+surface=(\S+)\s+role=(\S+)\s+count=(\d+)\s+sources=(.*?)\s+disallowedSources=(.*)$/;
  const colorBlockingPattern =
    /^-\s+surface=(\S+)\s+rule=(\S+)\s+value=(.+?)\s+policy=(\S+)\s+source=(\S*)\s+message=(.*)$/;
  const colorWarningPattern =
    /^-\s+surface=(\S+)\s+rule=(\S+)\s+value=(.+?)\s+source=(\S*)\s+message=(.*)$/;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith("shell-owned-primitive-emitted detected")) {
      section = "primitive";
      continue;
    }
    if (line.startsWith("color-policy-blocking detected")) {
      section = "color-blocking";
      continue;
    }
    if (line.startsWith("color-policy-warning detected")) {
      section = "color-warning";
      continue;
    }
    if (!line.startsWith("- ")) {
      continue;
    }

    if (section === "primitive") {
      const match = line.match(primitivePattern);
      if (!match) continue;
      const [, surfaceId, role, count, sourcesRaw, disallowedRaw] = match;
      const sources = parseCsv(sourcesRaw);
      const disallowedSources = parseCsv(disallowedRaw);
      findings.push({
        code: "shell-owned-primitive-emitted",
        severity: "error",
        policy: "strict",
        message: `Shell-owned primitive \"${role}\" emitted for surface \"${surfaceId}\".`,
        location: {
          file: disallowedSources[0] ?? sources[0] ?? "",
          line: 0,
        },
        evidence: {
          source: "generationGuard",
          surfaceId,
          role,
          count: Number(count),
          sources,
          disallowedSources,
        },
      });
      continue;
    }

    if (section === "color-blocking") {
      const match = line.match(colorBlockingPattern);
      if (!match) continue;
      const [, surfaceId, rule, value, policy, source, message] = match;
      findings.push({
        code: rule,
        severity: "error",
        policy: policy === "warn" || policy === "off" ? "warn" : "strict",
        message,
        location: {
          file: source ?? "",
          line: 0,
        },
        evidence: {
          source: "generationGuard",
          surfaceId,
          value,
        },
      });
      continue;
    }

    if (section === "color-warning") {
      const match = line.match(colorWarningPattern);
      if (!match) continue;
      const [, surfaceId, rule, value, source, message] = match;
      findings.push({
        code: rule,
        severity: "warning",
        policy: "warn",
        message,
        location: {
          file: source ?? "",
          line: 0,
        },
        evidence: {
          source: "generationGuard",
          surfaceId,
          value,
        },
      });
    }
  }

  return findings;
}

function mapValidateCode(code) {
  return VALIDATE_CODE_MAP[code] ?? code;
}

function inferValidatePolicy(findingCode, severity) {
  if (findingCode === "color.token.namespace") {
    return "warn";
  }
  if (severity === "error") {
    return "strict";
  }
  return "warn";
}

function toFindingLocation(location) {
  if (!location || typeof location !== "string") {
    return { file: "", line: 0 };
  }
  return { file: location, line: 0 };
}

function parseJsonPayload(text) {
  if (!text || !text.trim()) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function normalizeValidateFindings(payload) {
  const findings = Array.isArray(payload?.findings) ? payload.findings : [];
  return findings.map((finding) => {
    const severity = finding.severity === "error" ? "error" : "warning";
    const code = mapValidateCode(finding.code ?? "validate.finding");
    const policy = inferValidatePolicy(code, severity);
    return {
      code,
      severity,
      policy,
      message:
        typeof finding.message === "string" && finding.message.trim().length > 0
          ? finding.message
          : code,
      location: toFindingLocation(finding.location),
      evidence: {
        source: "validate",
        surfaceId: finding.surface,
        category: finding.category,
        expected: finding.expected,
        found: finding.found,
      },
    };
  });
}

function uniqueFindings(findings) {
  const seen = new Set();
  const normalized = [];
  for (const finding of findings) {
    const key = JSON.stringify({
      code: finding.code,
      severity: finding.severity,
      policy: finding.policy,
      message: finding.message,
      file: finding.location?.file ?? "",
      line: finding.location?.line ?? 0,
      surfaceId: finding.evidence?.surfaceId,
    });

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    normalized.push({
      code: finding.code,
      severity: finding.severity,
      policy: finding.policy,
      message: finding.message,
      location: {
        file: finding.location?.file ?? "",
        line: Number.isInteger(finding.location?.line)
          ? finding.location.line
          : 0,
      },
      evidence: finding.evidence ?? {},
    });
  }
  return normalized;
}

function runGenerationGuard(request, runtime) {
  let descriptorTempDir;
  let descriptorPath;
  const findings = [];

  try {
    if (request.mode === "descriptor") {
      const temp = makeTempDescriptorFile("surfaces-adapter-descriptor", request.descriptor);
      descriptorTempDir = temp.tempDir;
      descriptorPath = temp.descriptorPath;
    } else {
      const temp = makeTempDescriptorFile("surfaces-adapter-describe", []);
      descriptorTempDir = temp.tempDir;
      descriptorPath = temp.descriptorPath;

      const describe = runNodeScript(runtime, runtime.cliPath, [
        "describe",
        "--root",
        request.workspaceRoot,
        "--contract",
        runtime.contractPath,
        "--surface",
        request.surfaceId,
        "--out",
        descriptorPath,
      ]);

      if (describe.status !== 0) {
        findings.push({
          code: "generation.guard.describe.failed",
          severity: "error",
          policy: "strict",
          message:
            `Failed to collect descriptors for generation guard: ${describe.stderr || describe.stdout || "unknown error"}`.trim(),
          location: { file: "", line: 0 },
          evidence: {
            source: "generationGuard",
            surfaceId: request.surfaceId,
            exitCode: describe.status,
          },
        });
        return findings;
      }
    }

    const guard = runNodeScript(runtime, runtime.guardPath, [
      "--contract",
      runtime.contractPath,
      "--descriptor",
      descriptorPath,
    ]);

    const parsedFindings = parseGuardFindings(`${guard.stderr}\n${guard.stdout}`);
    findings.push(...parsedFindings);

    if (guard.status === 1) {
      throw new AdapterInputError(
        `Generation guard failed due to invalid input: ${(guard.stderr || guard.stdout).trim()}`,
      );
    }

    if (guard.status === 2 && parsedFindings.length === 0) {
      findings.push({
        code: "generation.guard.blocked",
        severity: "error",
        policy: "strict",
        message: "Generation guard reported violations but emitted no structured findings.",
        location: { file: "", line: 0 },
        evidence: {
          source: "generationGuard",
          surfaceId: request.surfaceId,
          exitCode: guard.status,
        },
      });
    }

    if (guard.status !== 0 && guard.status !== 2) {
      findings.push({
        code: "generation.guard.execution.failed",
        severity: "error",
        policy: "strict",
        message:
          `Generation guard failed unexpectedly: ${guard.stderr || guard.stdout || "unknown error"}`.trim(),
        location: { file: "", line: 0 },
        evidence: {
          source: "generationGuard",
          surfaceId: request.surfaceId,
          exitCode: guard.status,
        },
      });
    }

    return findings;
  } finally {
    cleanupTempPath(descriptorTempDir);
  }
}

function runWorkspaceValidate(request, runtime) {
  const validate = runNodeScript(runtime, runtime.cliPath, [
    "validate",
    "--workspace-root",
    request.workspaceRoot,
    "--contract",
    runtime.contractPath,
    "--surface",
    request.surfaceId,
    "--format",
    "json",
    "--exit-codes",
    "v2",
  ]);

  const payload = parseJsonPayload(validate.stdout);
  if (!payload) {
    return [
      {
        code: "validate.execution.failed",
        severity: "error",
        policy: "strict",
        message:
          `validate command did not return JSON output: ${validate.stderr || validate.stdout || "unknown error"}`.trim(),
        location: { file: "", line: 0 },
        evidence: {
          source: "validate",
          surfaceId: request.surfaceId,
          exitCode: validate.status,
        },
      },
    ];
  }

  const allFindings = normalizeValidateFindings(payload);
  const findings = allFindings.filter((finding) => {
    const surfaceId = finding.evidence?.surfaceId;
    return !surfaceId || surfaceId === request.surfaceId;
  });

  if (validate.status !== 0 && findings.length === 0 && allFindings.length > 0) {
    return [];
  }

  if (validate.status !== 0 && findings.length === 0) {
    findings.push({
      code: "validate.blocked",
      severity: "error",
      policy: "strict",
      message: "validate command failed without structured findings.",
      location: { file: "", line: 0 },
      evidence: {
        source: "validate",
        surfaceId: request.surfaceId,
        exitCode: validate.status,
      },
    });
  }

  return findings;
}

export async function runGenerationAdapter(requestInput, options = {}) {
  const startedAt = Date.now();

  const request = normalizeAdapterRequest(requestInput);
  const runtime = resolveRuntimePaths(request, options);

  ensureReadableFile(runtime.contractPath, "Contract");
  ensureReadableFile(runtime.guardPath, "Generation guard");
  if (request.mode === "workspace") {
    ensureReadableFile(runtime.cliPath, "interfacectl CLI");
    if (!fs.existsSync(request.workspaceRoot)) {
      throw new AdapterInputError(
        `workspaceRoot does not exist: ${request.workspaceRoot}.`,
      );
    }
  }

  const contract = readJsonFile(runtime.contractPath, "contract");
  const surfaces = Array.isArray(contract.surfaces) ? contract.surfaces : [];
  const surfaceMatch = surfaces.find((surface) => surface.id === request.surfaceId);
  if (!surfaceMatch) {
    throw new AdapterInputError(
      `surfaceId \"${request.surfaceId}\" not found in contract ${runtime.contractPath}.`,
    );
  }

  const findings = [];
  findings.push(...runGenerationGuard(request, runtime));

  if (request.mode === "workspace") {
    findings.push(...runWorkspaceValidate(request, runtime));
  }

  const normalizedFindings = uniqueFindings(findings);
  const status = computeStatusFromFindings(normalizedFindings);

  return {
    requestId: request.requestId,
    status,
    surfaceId: request.surfaceId,
    contract: {
      id: typeof contract.contractId === "string" ? contract.contractId : "unknown",
      version: typeof contract.version === "string" ? contract.version : "unknown",
    },
    coverage: buildCoverage(request.mode),
    findings: normalizedFindings,
    timings: {
      totalMs: Date.now() - startedAt,
    },
    provenance: {
      ...request.provenance,
      evaluatedAt: new Date().toISOString(),
    },
  };
}
