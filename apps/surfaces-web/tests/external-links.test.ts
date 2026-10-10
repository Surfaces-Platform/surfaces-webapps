// @vitest-environment jsdom

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const iconPath = "M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25";
const sameContextTargets = new Set(["", "_self", "_parent", "_top"]);
const opensNewContext = (target: string) => !sameContextTargets.has(target.toLowerCase());
const contextTitle = (target: string) => target.toLowerCase() === "_blank" ? "Opens in a new tab" : "Opens in a new window";

function filesUnder(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(file) : [file];
  });
}

function checkHtml(source: string): string[] {
  const document = new DOMParser().parseFromString(source, "text/html");
  const failures: string[] = [];
  const baseTarget = document.querySelector("base[target]")?.getAttribute("target") ?? "";
  for (const link of document.querySelectorAll("a, area, form, [formtarget]")) {
    const target = link.getAttribute("formtarget") ?? link.getAttribute("target") ?? baseTarget;
    if (!opensNewContext(target)) continue;
    const label = link.textContent?.trim() || link.getAttribute("href") || link.tagName;
    const icon = link.querySelector("svg.external-link-icon");
    if (!icon || icon.querySelector("path")?.getAttribute("d") !== iconPath) failures.push(`${label}: missing external-link icon`);
    if (link.getAttribute("title") !== contextTitle(target)) failures.push(`${label}: missing new-tab tooltip`);
    const rel = new Set((link.getAttribute("rel") ?? "").split(/\s+/));
    if (link.tagName === "A" && (!rel.has("noopener") || !rel.has("noreferrer"))) failures.push(`${label}: missing safe rel`);
  }
  return failures;
}

function checkJsx(source: string, file: string): string[] {
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const failures: string[] = [];
  function attribute(node: ts.JsxOpeningLikeElement, name: string) {
    const value = node.attributes.properties.find((item) => ts.isJsxAttribute(item) && item.name.getText(tree) === name);
    return value && ts.isJsxAttribute(value) ? value.initializer : undefined;
  }
  function literal(value: ts.JsxAttributeValue | undefined): string | undefined {
    if (value && ts.isStringLiteral(value)) return value.text;
    if (value && ts.isJsxExpression(value) && value.expression && ts.isStringLiteralLike(value.expression)) return value.expression.text;
    return undefined;
  }
  function visit(node: ts.Node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const target = attribute(node, "target") ?? attribute(node, "formTarget");
      if (target && (literal(target) === undefined || opensNewContext(literal(target)!))) {
        const label = `${node.tagName.getText(tree)} at line ${tree.getLineAndCharacterOfPosition(node.getStart(tree)).line + 1}`;
        const markup = node.parent.getText(tree);
        if (!markup.includes("ArrowTopRightOnSquareIcon") || !markup.includes("external-link-icon")) failures.push(`${label}: missing external-link icon`);
        if (literal(attribute(node, "title")) !== contextTitle(literal(target) ?? "_blank")) failures.push(`${label}: missing new-tab tooltip`);
        const rel = new Set((literal(attribute(node, "rel")) ?? "").split(/\s+/));
        if (["a", "Link"].includes(node.tagName.getText(tree)) && (!rel.has("noopener") || !rel.has("noreferrer"))) failures.push(`${label}: missing safe rel`);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(tree);
  return failures;
}

describe("new-tab links across the public site", () => {
  it("checks every source page and published HTML document", () => {
    const failures: string[] = [];
    const files = ["app", "public"].flatMap((directory) => filesUnder(path.resolve(directory)));
    for (const file of files) {
      if (!/\.(?:html|[cm]?[jt]sx?)$/.test(file)) continue;
      const source = readFileSync(file, "utf8");
      const findings = file.endsWith(".html") ? checkHtml(source) : file.endsWith(".tsx") || file.endsWith(".jsx") ? checkJsx(source, file) : [];
      // Keep new-window actions as indicated links so their behavior remains visible.
      if (/\b(?:window|globalThis)\s*(?:\.\s*open|\[\s*["']open["']\s*\])\s*\(/.test(source)) findings.push("use an indicated link instead of window.open");
      failures.push(...findings.map((finding) => `${path.relative(process.cwd(), file)}: ${finding}`));
    }
    expect(failures).toEqual([]);
  });

  it("rejects missing indicators for blank and named targets, including inherited targets", () => {
    for (const target of ["_blank", "_BLANK", "reportWindow"]) {
      expect(checkHtml(`<a target="${target}" href="/report">Report</a>`)).toContain("Report: missing external-link icon");
      expect(checkJsx(`<a target="${target}" href="/report">Report</a>`, "fixture.tsx")).toContain("a at line 1: missing external-link icon");
    }
    expect(checkHtml('<base target="reportWindow"><a href="/report">Report</a>')).toContain("Report: missing external-link icon");
    expect(checkHtml(`<a target="reportWindow" href="/report" rel="noopener noreferrer" title="Opens in a new window">Report<svg class="external-link-icon"><path d="${iconPath}"></path></svg></a>`)).toEqual([]);
    expect(checkJsx('<a target="reportWindow" rel="noopener noreferrer" title="Opens in a new window"><Icon icon={ArrowTopRightOnSquareIcon} className="external-link-icon" /></a>', "fixture.tsx")).toEqual([]);
    expect(checkHtml('<a target="_self" href="/report">Report</a>')).toEqual([]);
    expect(checkHtml(`<a target="_blank" href="/report" rel="noopener noreferrer" title="Opens in a new tab">Report<svg class="external-link-icon"><path d="${iconPath}"></path></svg></a>`)).toEqual([]);
    expect(checkJsx('<a target="_blank" rel="noopener noreferrer" title="Opens in a new tab"><Icon icon={ArrowTopRightOnSquareIcon} className="external-link-icon" /></a>', "fixture.tsx")).toEqual([]);
  });
});
