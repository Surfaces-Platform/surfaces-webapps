import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bridgeScript(inspectorOrigin: string): string {
  return `
(() => {
  const CHANNEL = "surfaceops-governance-inspector-v1";
  const VERSION = 1;
  const CANDIDATE_SELECTOR = "[data-contract], [data-contract-section], header, nav, main, section, article, aside, footer, [role]";
  const inspectorOrigin = ${JSON.stringify(inspectorOrigin)};
  let nodeCounter = 0;
  const elementToNodeId = new WeakMap();
  const nodeIdToElement = new Map();
  let currentHighlight = { violations: [], selectedViolationId: undefined };
  const overlaysRoot = document.createElement("div");
  overlaysRoot.setAttribute("data-inspector-overlays", "true");
  Object.assign(overlaysRoot.style, {
    position: "fixed",
    inset: "0",
    pointerEvents: "none",
    zIndex: "2147483000",
  });
  function mountOverlaysRoot() {
    const host = document.body || document.documentElement;
    if (host && !overlaysRoot.parentElement) {
      host.appendChild(overlaysRoot);
    }
  }
  mountOverlaysRoot();

  function validInboundOrigin(origin) {
    if (!inspectorOrigin) return true;
    return origin === inspectorOrigin;
  }

  function post(payload) {
    window.parent.postMessage({ channel: CHANNEL, version: VERSION, ...payload }, inspectorOrigin || "*");
  }

  function ensureNodeId(element) {
    const existing = elementToNodeId.get(element);
    if (existing) {
      nodeIdToElement.set(existing, element);
      return existing;
    }
    nodeCounter += 1;
    const id = "node-" + nodeCounter;
    elementToNodeId.set(element, id);
    nodeIdToElement.set(id, element);
    return id;
  }

  function getElementForNodeId(nodeId) {
    const element = nodeIdToElement.get(nodeId);
    if (element instanceof HTMLElement) return element;
    return null;
  }

  function closestInspectableElement(target) {
    let cursor = target;
    while (cursor && cursor instanceof Element) {
      if (elementToNodeId.has(cursor)) return cursor;
      if (cursor.matches && cursor.matches(CANDIDATE_SELECTOR)) return cursor;
      cursor = cursor.parentElement;
    }
    return target instanceof Element ? target : null;
  }

  function computeNavDepth(nav) {
    let maxDepth = 1;
    const listItems = nav.querySelectorAll("li");
    for (const li of listItems) {
      let depth = 1;
      let cursor = li.parentElement;
      while (cursor && cursor !== nav) {
        if (cursor.tagName === "UL" || cursor.tagName === "OL") depth += 1;
        cursor = cursor.parentElement;
      }
      maxDepth = Math.max(maxDepth, depth);
    }
    return maxDepth;
  }

  function collectSnapshot() {
    const candidates = document.querySelectorAll(CANDIDATE_SELECTOR);
    nodeIdToElement.clear();
    const nodes = [];
    candidates.forEach((element) => {
      if (!(element instanceof HTMLElement)) return;
      const id = ensureNodeId(element);
      const rect = element.getBoundingClientRect();
      const computed = window.getComputedStyle(element);
      const attributes = {};
      for (const attr of element.attributes) attributes[attr.name] = attr.value;
      const sectionId = element.getAttribute("data-contract-section") || undefined;
      const label = sectionId || element.getAttribute("aria-label") || element.getAttribute("data-contract") || element.tagName.toLowerCase();
      const parentElement = element.parentElement;
      const parentNodeId =
        parentElement instanceof HTMLElement ? elementToNodeId.get(parentElement) || undefined : undefined;
      nodes.push({
        nodeId: id,
        sectionId,
        role: element.getAttribute("role") || undefined,
        label,
        tagName: element.tagName.toLowerCase(),
        rect: {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        },
        parentNodeId,
        attributes,
        style: {
          inline: element.getAttribute("style") || "",
          color: computed.color,
          backgroundColor: computed.backgroundColor,
          navDepth:
            element.tagName.toLowerCase() === "nav" ||
            element.getAttribute("role") === "navigation"
              ? computeNavDepth(element)
              : undefined,
        },
      });
    });
    post({
      type: "DOM_SNAPSHOT",
      snapshot: {
        nodes: nodes.slice(0, 450),
        capturedAt: new Date().toISOString(),
      },
    });
  }

  function clearOverlays() {
    mountOverlaysRoot();
    overlaysRoot.innerHTML = "";
  }

  function renderOverlays() {
    clearOverlays();
    const renderedNodeIds = new Set();
    (currentHighlight.violations || []).forEach((violation) => {
      (violation.nodeIds || []).forEach((nodeId) => {
        if (renderedNodeIds.has(nodeId)) return;
        const element = getElementForNodeId(nodeId);
        if (!(element instanceof HTMLElement)) return;
        const rect = element.getBoundingClientRect();
        if (rect.width < 2 || rect.height < 2) return;
        renderedNodeIds.add(nodeId);
        const selected = currentHighlight.selectedViolationId === violation.id;
        const severityColor =
          violation.severity === "blocking"
            ? "#ef4444"
            : violation.severity === "warning"
              ? "#f59e0b"
              : "#3b82f6";

        const box = document.createElement("div");
        Object.assign(box.style, {
          position: "fixed",
          left: rect.left + "px",
          top: rect.top + "px",
          width: rect.width + "px",
          height: rect.height + "px",
          border: selected ? "2px solid #3b82f6" : "2px dashed " + severityColor,
          boxSizing: "border-box",
          background: selected ? "rgba(59,130,246,0.06)" : "transparent",
          borderRadius: "4px",
        });

        const label = document.createElement("div");
        label.textContent = String(violation.severity || "info").toUpperCase() + ": " + String(violation.title || "Violation");
        Object.assign(label.style, {
          position: "fixed",
          left: rect.left + "px",
          top: Math.max(0, rect.top - 22) + "px",
          maxWidth: "320px",
          fontSize: "11px",
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Courier New", monospace',
          color: "#fff",
          background: "rgba(15,23,42,0.92)",
          padding: "2px 6px",
          borderRadius: "4px",
          border: "1px solid " + severityColor,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          pointerEvents: "none",
        });

        overlaysRoot.appendChild(box);
        overlaysRoot.appendChild(label);
      });
    });
  }

  function onClick(event) {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const selectedElement = closestInspectableElement(target);
    if (!(selectedElement instanceof Element)) return;
    event.preventDefault();
    event.stopPropagation();
    const nodeId = ensureNodeId(selectedElement);
    post({ type: "NODE_SELECTED", nodeId });
  }

  function onMessage(event) {
    if (!validInboundOrigin(event.origin)) return;
    const payload = event.data;
    if (!payload || payload.channel !== CHANNEL || payload.version !== VERSION) return;
    if (payload.type === "INSPECTOR_INIT" || payload.type === "REQUEST_DOM_SNAPSHOT") {
      collectSnapshot();
      return;
    }
    if (payload.type === "HIGHLIGHT_VIOLATIONS") {
      currentHighlight = {
        violations: Array.isArray(payload.violations) ? payload.violations : [],
        selectedViolationId: typeof payload.selectedViolationId === "string" ? payload.selectedViolationId : undefined,
      };
      renderOverlays();
      return;
    }
    if (payload.type === "SELECT_NODE") {
      if (typeof payload.nodeId !== "string") return;
      const element = getElementForNodeId(payload.nodeId);
      if (element instanceof HTMLElement) {
        element.scrollIntoView({ block: "center", inline: "center", behavior: "smooth" });
      }
      return;
    }
    if (payload.type === "CLEAR_HIGHLIGHTS") {
      currentHighlight = { violations: [] };
      clearOverlays();
    }
  }

  window.addEventListener("message", onMessage);
  window.addEventListener("scroll", renderOverlays, true);
  window.addEventListener("resize", renderOverlays);
  window.addEventListener("click", onClick, true);
  post({ type: "INSPECTOR_READY" });
  collectSnapshot();
})();
`;
}

export async function GET(request: NextRequest) {
  const inspectorOrigin = request.nextUrl.searchParams.get("inspectorOrigin") ?? "";
  return new NextResponse(bridgeScript(inspectorOrigin), {
    status: 200,
    headers: {
      "content-type": "application/javascript; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
