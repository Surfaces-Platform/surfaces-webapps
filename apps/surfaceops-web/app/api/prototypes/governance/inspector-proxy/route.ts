import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isHtml(contentType: string): boolean {
  return contentType.toLowerCase().includes("text/html");
}

function sanitizeUpstreamHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(
      /<link\b[^>]*rel=["'](?:modulepreload|preload)["'][^>]*as=["']script["'][^>]*>/gi,
      "",
    )
    .replace(/<link\b[^>]*rel=["']preload["'][^>]*as=["']font["'][^>]*>/gi, "");
}

function injectInspectorAssets(input: {
  html: string;
  target: URL;
  inspectorOrigin: string;
  appOrigin: string;
}): string {
  const baseHref = new URL(".", input.target).toString();
  const bridgeUrl = new URL("/api/prototypes/governance/inspector-bridge", input.appOrigin);
  if (input.inspectorOrigin) {
    bridgeUrl.searchParams.set("inspectorOrigin", input.inspectorOrigin);
  }
  const visibilityOverrides = `
<style data-inspector-visibility-overrides="true">
  [style*="opacity:0"] { opacity: 1 !important; }
  [style*="opacity: 0"] { opacity: 1 !important; }
  [style*="transform:translateY("] { transform: none !important; }
  [style*="transform: translateY("] { transform: none !important; }
</style>`;
  const injectedBase = /<base\s/i.test(input.html)
    ? input.html
    : input.html.replace(
        /<head[^>]*>/i,
        (match) => `${match}\n<base href="${baseHref}">`,
      );
  const scriptTag = `<script src="${bridgeUrl.toString()}"></script>`;
  if (/<\/head>/i.test(injectedBase)) {
    return injectedBase.replace(/<\/head>/i, `${visibilityOverrides}\n${scriptTag}\n</head>`);
  }
  return `${visibilityOverrides}\n${scriptTag}\n${injectedBase}`;
}

function badRequest(message: string): NextResponse {
  return NextResponse.json({ ok: false, error: message }, { status: 400 });
}

export async function GET(request: NextRequest) {
  const targetRaw = request.nextUrl.searchParams.get("target");
  if (!targetRaw) {
    return badRequest("Missing `target` query parameter.");
  }
  let target: URL;
  try {
    target = new URL(targetRaw);
  } catch {
    return badRequest("Invalid target URL.");
  }
  if (!["http:", "https:"].includes(target.protocol)) {
    return badRequest("Target URL protocol must be http or https.");
  }

  let upstream: Response;
  try {
    upstream = await fetch(target.toString(), {
      method: "GET",
      redirect: "follow",
      headers: {
        "user-agent": "SurfaceOps-Inspector/1.0",
        accept: "text/html,application/xhtml+xml",
      },
      cache: "no-store",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_fetch_error";
    return NextResponse.json(
      {
        ok: false,
        error: `Failed to fetch target URL (${message}).`,
      },
      { status: 502 },
    );
  }
  if (!upstream.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: `Failed to fetch target (${upstream.status}).`,
      },
      { status: 502 },
    );
  }

  const contentType = upstream.headers.get("content-type") ?? "";
  if (!isHtml(contentType)) {
    return NextResponse.json(
      {
        ok: false,
        error: `Target content is not HTML (${contentType || "unknown"}).`,
      },
      { status: 415 },
    );
  }

  const html = await upstream.text();
  const sanitized = sanitizeUpstreamHtml(html);
  const inspectorOrigin =
    request.nextUrl.searchParams.get("inspectorOrigin") ?? request.nextUrl.origin;
  const injected = injectInspectorAssets({
    html: sanitized,
    target,
    inspectorOrigin,
    appOrigin: request.nextUrl.origin,
  });
  return new NextResponse(injected, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
