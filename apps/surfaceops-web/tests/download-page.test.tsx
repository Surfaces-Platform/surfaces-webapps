import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import DownloadPage from "@/app/(overview)/download/page";
import ReleaseNotesPage from "@/app/(overview)/release-notes/page";

describe("surfaceops marketing routes", () => {
  it("renders the download page with public alpha messaging", async () => {
    const html = renderToStaticMarkup(await DownloadPage());

    expect(html).toContain("Download SurfaceOps");
    expect(html).toContain("SurfaceOps is shipping as a Mac desktop workbench first.");
    expect(html).toContain("Current public channels");
    expect(html).toContain("Managed local model tiers");
    expect(html).toContain("Qwen3 4B");
    expect(html).toContain("Qwen3 8B");
    expect(html).toContain("gpt-oss 20B");
    expect(html).toContain("release notes");
    expect(html).not.toContain("Latest milestone");
    expect(html).not.toContain("Get desktop release updates");
    expect(html).not.toContain("Get release updates");
  });

  it("renders release notes for the desktop rollout", async () => {
    const html = renderToStaticMarkup(await ReleaseNotesPage());

    expect(html).toContain("Desktop release history");
    expect(html).toContain("0.1.0");
    expect(html).toContain("The public alpha release line is wired through the same canonical manifest that powers downloads, release notes, and desktop updates.");
  });
});
