import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ProjectConnectForm } from "@/app/contracts/governance/_components/project-connect-form";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
    push: vi.fn(),
  }),
}));

describe("ProjectConnectForm", () => {
  it("renders the protected SurfaceOps dogfood defaults", () => {
    const html = renderToStaticMarkup(React.createElement(ProjectConnectForm));
    expect(html).toContain("SurfaceOps Protected Dogfood");
    expect(html).toContain("contracts/generated/surfaceops-web.contract.json");
    expect(html).toContain("surfaceops-web");
    expect(html).toContain("SurfaceOps Web");
    expect(html).toContain("surfaceopsai-git-main-surfaces-platform.vercel.app/contracts/governance");
    expect(html).toContain("surfaceopsai-git-{branch}-surfaces-platform.vercel.app/contracts/governance");
    expect(html).toContain("surfaceops-governance-preview");
    expect(html).toContain("Contract workbench");
  });
});
