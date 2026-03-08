#!/usr/bin/env node

import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MARKER_PATTERNS = {
  pageContainer:
    /\bdata-contract\s*=\s*(?:"page-container"|'page-container'|{`page-container`}|{\s*["'`]page-container["'`]\s*})/,
  section:
    /\bdata-contract-section\s*=\s*(?:"([^"]+)"|'([^']+)'|{`([^`]+)`}|{\s*["'`]([^"'`]+)["'`]\s*})/,
  layoutContainer:
    /\bdata-contract-container\s*=\s*(?:"([^"]+)"|'([^']+)'|{`([^`]+)`}|{\s*["'`]([^"'`]+)["'`]\s*})/,
};

const STYLE_OBJECT_PATTERN = /\bstyle\s*=\s*{{([\s\S]*?)}}/;
const STYLE_STRING_PATTERN =
  /\bstyle\s*=\s*(?:"([^"]+)"|'([^']+)'|{`([^`]+)`}|{\s*["'`]([^"'`]+)["'`]\s*})/;
const CLASSNAME_PATTERN =
  /\bclass(?:Name)?\s*=\s*(?:"([^"]+)"|'([^']+)'|{`([^`]+)`}|{\s*["'`]([^"'`]+)["'`]\s*})/;
const CSS_RULE_PATTERN = /([^{}]+)\{([^{}]+)\}/g;
const CSS_CLASS_SELECTOR_PATTERN = /\.([_a-zA-Z]+[\w-]*)/g;

const RADIUS_TOKEN_MAP = new Map([
  ["rounded-none", 0],
  ["rounded-sm", 2],
  ["rounded", 4],
  ["rounded-md", 6],
  ["rounded-lg", 8],
  ["rounded-xl", 12],
  ["rounded-2xl", 16],
  ["rounded-3xl", 24],
  ["rounded-full", Number.POSITIVE_INFINITY],
]);

function parseArgs(argv) {
  const args = argv.slice(2);
  const options = {
    workspaceRoot: process.cwd(),
    contractPath: "contracts/surfaces.web.contract.json",
    format: "text",
    configPath: "interfacectl.config.json",
  };

  for (let index = 0; index < args.length; index += 1) {
    const key = args[index];
    const value = args[index + 1];
    if (
      key === "--workspace-root" ||
      key === "--contract" ||
      key === "--format" ||
      key === "--config"
    ) {
      if (!value) {
        throw new Error(`Missing value for ${key}`);
      }
      if (key === "--workspace-root") options.workspaceRoot = value;
      if (key === "--contract") options.contractPath = value;
      if (key === "--format") options.format = value;
      if (key === "--config") options.configPath = value;
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${key}`);
  }

  if (options.format !== "text" && options.format !== "json") {
    throw new Error(`Invalid format "${options.format}". Expected text or json.`);
  }

  return options;
}

function readJsonSync(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

async function pathExists(filePath) {
  try {
    await fsp.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function walkFiles(rootDir) {
  const results = [];
  if (!(await pathExists(rootDir))) {
    return results;
  }

  const stack = [rootDir];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    const entries = await fsp.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }
      results.push(fullPath);
    }
  }

  return results;
}

function getClassNames(tag) {
  const match = CLASSNAME_PATTERN.exec(tag);
  CLASSNAME_PATTERN.lastIndex = 0;
  const raw = match?.[1] ?? match?.[2] ?? match?.[3] ?? match?.[4] ?? "";
  if (!raw) return [];
  return raw.split(/\s+/).map((token) => token.trim()).filter(Boolean);
}

function getStyleText(tag) {
  const objectMatch = STYLE_OBJECT_PATTERN.exec(tag);
  STYLE_OBJECT_PATTERN.lastIndex = 0;
  if (objectMatch?.[1]) {
    return { kind: "object", value: objectMatch[1] };
  }
  const stringMatch = STYLE_STRING_PATTERN.exec(tag);
  STYLE_STRING_PATTERN.lastIndex = 0;
  const raw =
    stringMatch?.[1] ??
    stringMatch?.[2] ??
    stringMatch?.[3] ??
    stringMatch?.[4] ??
    "";
  if (!raw) return undefined;
  return { kind: "string", value: raw };
}

function classifyShadow(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized || normalized === "none") return "none";
  if (normalized === "0" || normalized === "0px") return "none";

  const parts = normalized
    .split(/,(?![^()]*\))/)
    .map((part) => part.trim())
    .filter(Boolean);
  const hasInset = parts.some((part) => part.includes("inset"));
  const hasOuter = parts.some((part) => !part.includes("inset"));

  if (hasInset && hasOuter) return "mixed";
  if (hasInset) return "inset";
  return "outer";
}

function parsePxValue(rawValue) {
  const normalized = String(rawValue ?? "").trim().replace(/['"`]/g, "");
  if (!normalized) return undefined;
  if (normalized === "0") return 0;
  const pxMatch = normalized.match(/^(-?\d+(?:\.\d+)?)px$/i);
  if (pxMatch) return Number.parseFloat(pxMatch[1]);
  const numberMatch = normalized.match(/^-?\d+(?:\.\d+)?$/);
  if (numberMatch) return Number.parseFloat(normalized);
  return undefined;
}

function parseInlineSignals(styleText, source, targetType) {
  if (!styleText) return [];
  const signals = [];
  const body = styleText.value;
  if (styleText.kind === "object") {
    const radiusMatch = body.match(/\bborderRadius\s*:\s*([^,}]+)/);
    if (radiusMatch?.[1]) {
      signals.push({
        type: "radius",
        source,
        targetType,
        value: parsePxValue(radiusMatch[1]),
        evidence: `borderRadius: ${radiusMatch[1].trim()}`,
      });
    }
    const shadowMatch = body.match(/\bboxShadow\s*:\s*([^,}]+(?:,(?!\s*[a-zA-Z0-9_]+\s*:)[^,}]+)*)/);
    if (shadowMatch?.[1]) {
      signals.push({
        type: "shadow",
        source,
        targetType,
        value: classifyShadow(shadowMatch[1]),
        evidence: `boxShadow: ${shadowMatch[1].trim()}`,
      });
    }
    return signals;
  }

  const radiusDecl = body.match(/\bborder-radius\s*:\s*([^;]+)/i);
  if (radiusDecl?.[1]) {
    signals.push({
      type: "radius",
      source,
      targetType,
      value: parsePxValue(radiusDecl[1]),
      evidence: `border-radius: ${radiusDecl[1].trim()}`,
    });
  }

  const shadowDecl = body.match(/\bbox-shadow\s*:\s*([^;]+)/i);
  if (shadowDecl?.[1]) {
    signals.push({
      type: "shadow",
      source,
      targetType,
      value: classifyShadow(shadowDecl[1]),
      evidence: `box-shadow: ${shadowDecl[1].trim()}`,
    });
  }

  return signals;
}

function parseClassSignals(classNames, source, targetType) {
  const signals = [];
  for (const className of classNames) {
    if (RADIUS_TOKEN_MAP.has(className)) {
      signals.push({
        type: "radius",
        source,
        targetType,
        value: RADIUS_TOKEN_MAP.get(className),
        evidence: className,
      });
      continue;
    }

    const arbitraryRadiusMatch = className.match(/^rounded(?:-[trblsexy]{1,2})?-\[(\d+(?:\.\d+)?)px\]$/);
    if (arbitraryRadiusMatch?.[1]) {
      signals.push({
        type: "radius",
        source,
        targetType,
        value: Number.parseFloat(arbitraryRadiusMatch[1]),
        evidence: className,
      });
      continue;
    }

    if (className === "shadow-none") {
      signals.push({
        type: "shadow",
        source,
        targetType,
        value: "none",
        evidence: className,
      });
      continue;
    }

    if (className === "shadow-inner") {
      signals.push({
        type: "shadow",
        source,
        targetType,
        value: "inset",
        evidence: className,
      });
      continue;
    }

    if (
      className === "shadow" ||
      /^shadow-(xs|sm|md|lg|xl|2xl)$/.test(className) ||
      /^drop-shadow(?:-.+)?$/.test(className)
    ) {
      signals.push({
        type: "shadow",
        source,
        targetType,
        value: "outer",
        evidence: className,
      });
    }
  }

  return signals;
}

function collectTargetWrappers(fileContent, source, allowedTargets) {
  const wrappers = [];
  const tagPattern = /<[A-Za-z][\w.:-]*\b[^>]*>/g;
  let match;

  while ((match = tagPattern.exec(fileContent)) !== null) {
    const tag = match[0];
    if (tag.startsWith("</")) continue;

    if (allowedTargets.has("page-container") && MARKER_PATTERNS.pageContainer.test(tag)) {
      wrappers.push({
        targetType: "page-container",
        source,
        classNames: getClassNames(tag),
        styleText: getStyleText(tag),
        markerValue: "page-container",
      });
    }

    const sectionMatch = MARKER_PATTERNS.section.exec(tag);
    MARKER_PATTERNS.section.lastIndex = 0;
    if (allowedTargets.has("top-level-section") && sectionMatch) {
      wrappers.push({
        targetType: "top-level-section",
        source,
        classNames: getClassNames(tag),
        styleText: getStyleText(tag),
        markerValue:
          sectionMatch[1] ?? sectionMatch[2] ?? sectionMatch[3] ?? sectionMatch[4] ?? "",
      });
    }

    const layoutContainerMatch = MARKER_PATTERNS.layoutContainer.exec(tag);
    MARKER_PATTERNS.layoutContainer.lastIndex = 0;
    if (allowedTargets.has("layout-container") && layoutContainerMatch) {
      wrappers.push({
        targetType: "layout-container",
        source,
        classNames: getClassNames(tag),
        styleText: getStyleText(tag),
        markerValue:
          layoutContainerMatch[1] ??
          layoutContainerMatch[2] ??
          layoutContainerMatch[3] ??
          layoutContainerMatch[4] ??
          "",
      });
    }
  }

  return wrappers;
}

function parseCssRules(fileContent, source) {
  const rules = [];
  let match;
  while ((match = CSS_RULE_PATTERN.exec(fileContent)) !== null) {
    const selectorText = match[1]?.trim();
    const declarationText = match[2]?.trim();
    if (!selectorText || !declarationText) continue;
    const selectors = selectorText
      .split(",")
      .map((selector) => selector.trim())
      .filter(Boolean);
    rules.push({ selectors, declarationText, source });
  }
  return rules;
}

function selectorMatchesWrapper(selector, wrapper) {
  const classMatches = [...selector.matchAll(CSS_CLASS_SELECTOR_PATTERN)].map((match) => match[1]);
  if (classMatches.length > 0 && !classMatches.every((name) => wrapper.classNames.includes(name))) {
    return false;
  }

  if (wrapper.targetType === "page-container") {
    const pageContainerSelector =
      selector.includes('[data-contract="page-container"]') ||
      selector.includes("[data-contract='page-container']") ||
      selector.includes("[data-contract=page-container]") ||
      selector.includes("[data-contract]");
    if (pageContainerSelector) return true;
  }

  if (wrapper.targetType === "top-level-section") {
    const genericSection = selector.includes("[data-contract-section]");
    const specificSection =
      wrapper.markerValue &&
      (selector.includes(`[data-contract-section="${wrapper.markerValue}"]`) ||
        selector.includes(`[data-contract-section='${wrapper.markerValue}']`) ||
        selector.includes(`[data-contract-section=${wrapper.markerValue}]`));
    if (genericSection || specificSection) return true;
  }

  if (wrapper.targetType === "layout-container") {
    const genericContainer = selector.includes("[data-contract-container]");
    const specificContainer =
      wrapper.markerValue &&
      (selector.includes(`[data-contract-container="${wrapper.markerValue}"]`) ||
        selector.includes(`[data-contract-container='${wrapper.markerValue}']`) ||
        selector.includes(`[data-contract-container=${wrapper.markerValue}]`));
    if (genericContainer || specificContainer) return true;
  }

  return classMatches.length > 0;
}

function parseCssSignals(rule, wrapper) {
  const signals = [];
  const radiusMatch = rule.declarationText.match(/\bborder-radius\s*:\s*([^;]+)/i);
  if (radiusMatch?.[1]) {
    signals.push({
      type: "radius",
      source: rule.source,
      targetType: wrapper.targetType,
      value: parsePxValue(radiusMatch[1]),
      evidence: `${rule.selectors.join(", ")} { border-radius: ${radiusMatch[1].trim()} }`,
    });
  }

  const shadowMatch = rule.declarationText.match(/\bbox-shadow\s*:\s*([^;]+)/i);
  if (shadowMatch?.[1]) {
    signals.push({
      type: "shadow",
      source: rule.source,
      targetType: wrapper.targetType,
      value: classifyShadow(shadowMatch[1]),
      evidence: `${rule.selectors.join(", ")} { box-shadow: ${shadowMatch[1].trim()} }`,
    });
  }

  return signals;
}

function buildViolations(surfaceId, wrapper, policy, signals) {
  const violations = [];
  const radiusSignals = signals.filter((signal) => signal.type === "radius");
  const shadowSignals = signals.filter((signal) => signal.type === "shadow");

  const exceededRadius = radiusSignals.find(
    (signal) =>
      typeof signal.value === "number" &&
      Number.isFinite(signal.value) &&
      signal.value > policy.maxBorderRadiusPx,
  );
  if (exceededRadius) {
    violations.push({
      code: "layout.chrome.radius-exceeded",
      surfaceId,
      targetType: wrapper.targetType,
      source: exceededRadius.source,
      message: `Wrapper uses border radius ${exceededRadius.value}px, above the ${policy.maxBorderRadiusPx}px cap.`,
      evidence: exceededRadius.evidence,
    });
  }

  const disallowedShadow = shadowSignals.find((signal) => {
    if (signal.value === "outer" || signal.value === "mixed") {
      return !policy.allowOuterShadow;
    }
    if (signal.value === "inset") {
      return !policy.allowInsetShadow;
    }
    return false;
  });
  if (disallowedShadow) {
    violations.push({
      code: "layout.chrome.outer-shadow-disallowed",
      surfaceId,
      targetType: wrapper.targetType,
      source: disallowedShadow.source,
      message: `Wrapper uses disallowed ${disallowedShadow.value} shadow treatment.`,
      evidence: disallowedShadow.evidence,
    });
  }

  return violations;
}

function formatText(result) {
  if (result.violations.length === 0) {
    return `Elevated-card policy passed for ${result.checkedSurfaces.length} surfaces.`;
  }

  const lines = [
    `Elevated-card policy found ${result.violations.length} violation(s) across ${result.checkedSurfaces.length} surfaces.`,
  ];
  for (const violation of result.violations) {
    lines.push(
      `- [${violation.surfaceId}] ${violation.code} in ${violation.source} (${violation.targetType}): ${violation.message} Evidence: ${violation.evidence}`,
    );
  }
  return lines.join("\n");
}

export async function checkElevatedCards({
  workspaceRoot,
  contractPath,
  configPath,
}) {
  const workspace = path.resolve(workspaceRoot);
  const contract = readJsonSync(path.resolve(workspace, contractPath));
  const configResolved = path.resolve(workspace, configPath);
  const config = (await pathExists(configResolved)) ? readJsonSync(configResolved) : {};
  const surfaceRootMap = config.surfaceRoots ?? {};

  const checkedSurfaces = [];
  const violations = [];

  for (const surface of contract.surfaces ?? []) {
    if (surface.type !== "web") continue;
    const chromePolicy = surface.layout?.chromePolicy;
    if (!chromePolicy || chromePolicy.policy === "off") continue;
    const allowedTargets = new Set(chromePolicy.targets ?? []);

    const surfaceRoot = path.resolve(
      workspace,
      surfaceRootMap[surface.id] ?? path.join("apps", surface.id),
    );
    const appRoot = path.join(surfaceRoot, "app");
    if (!(await pathExists(appRoot))) continue;

    checkedSurfaces.push(surface.id);
    const files = await walkFiles(appRoot);
    const markupFiles = files.filter((filePath) => /\.[cm]?[jt]sx?$/.test(filePath));
    const cssFiles = files.filter((filePath) => filePath.endsWith(".css"));

    const wrappers = [];
    for (const filePath of markupFiles) {
      const content = await fsp.readFile(filePath, "utf8");
      wrappers.push(
        ...collectTargetWrappers(
          content,
          path.relative(workspace, filePath),
          allowedTargets,
        ),
      );
    }

    const cssRules = [];
    for (const filePath of cssFiles) {
      const content = await fsp.readFile(filePath, "utf8");
      cssRules.push(
        ...parseCssRules(content, path.relative(workspace, filePath)),
      );
    }

    for (const wrapper of wrappers) {
      const signals = [
        ...parseInlineSignals(wrapper.styleText, wrapper.source, wrapper.targetType),
        ...parseClassSignals(wrapper.classNames, wrapper.source, wrapper.targetType),
      ];

      for (const rule of cssRules) {
        if (rule.selectors.some((selector) => selectorMatchesWrapper(selector, wrapper))) {
          signals.push(...parseCssSignals(rule, wrapper));
        }
      }

      violations.push(...buildViolations(surface.id, wrapper, chromePolicy, signals));
    }
  }

  return {
    ok: violations.length === 0,
    checkedSurfaces,
    violations,
    contractPath: path.resolve(workspace, contractPath),
  };
}

async function main() {
  try {
    const options = parseArgs(process.argv);
    const result = await checkElevatedCards({
      workspaceRoot: options.workspaceRoot,
      contractPath: options.contractPath,
      configPath: options.configPath,
    });

    if (options.format === "json") {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    } else {
      process.stdout.write(`${formatText(result)}\n`);
    }

    process.exit(result.ok ? 0 : 2);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exit(1);
  }
}

const currentFilePath = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === currentFilePath) {
  await main();
}
