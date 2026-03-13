import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { LocalWorkbench } from "@/app/contracts/governance/_components/local-workbench";
import type { LocalWorkbenchData } from "@/lib/local-workbench/types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

function buildData(): LocalWorkbenchData {
  return {
    enabled: true,
    runRoot: "/tmp/surfaceops-local-runs/reference-target-web",
    target: {
      id: "reference-target-web",
      label: "Reference Target Web",
      appRoot: "/repo/apps/reference-target-web",
      contractPath: "/repo/contracts/generated/reference-target-web.contract.json",
      implementationBrief: "Refine the reference target UI to better match the contract-guided surface.",
    },
    contract: {
      contractId: "reference-target-web.generated",
      version: "0.1.0",
      description: "Generated fixture contract.",
      requiredSections: ["landing.hero", "landing.capabilities"],
      allowedFonts: ["Inter", "sans-serif"],
      maxContentWidth: 1160,
      colorPolicy: "warn",
    },
    latestRun: null,
    runs: [],
    chat: [
      {
        id: "empty",
        role: "assistant",
        title: "No rerun yet",
        content: "Run the local LLM once to capture baseline and current screenshots.",
      },
    ],
    localModel: {
      configured: true,
      baseUrl: "http://127.0.0.1:1234/v1",
      model: "openai/gpt-oss-20b",
    },
  };
}

describe("LocalWorkbench", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the simplified local-only shell", () => {
    const html = renderToStaticMarkup(React.createElement(LocalWorkbench, { data: buildData() }));
    expect(html).toContain("Reference Target Web");
    expect(html).toContain("Run local LLM");
    expect(html).toContain("baseline");
    expect(html).toContain("current");
    expect(html).toContain("controls");
    expect(html).toContain("chat");
    expect(html).toContain("Preview unavailable");
  });
});
