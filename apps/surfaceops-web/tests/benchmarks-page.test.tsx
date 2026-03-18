import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import BenchmarksPage from "@/app/benchmarks/page";
import type { BenchmarkReportListItem } from "@/lib/benchmark-report-docs";

const redirect = vi.fn((target: string) => {
  throw new Error(`redirect:${target}`);
});

const listBenchmarkReports = vi.fn();

vi.mock("next/navigation", () => ({
  redirect: (target: string) => redirect(target),
}));

vi.mock("@/lib/benchmark-report-docs", () => ({
  listBenchmarkReports: (...args: unknown[]) => listBenchmarkReports(...args),
}));

function buildReport(overrides: Partial<BenchmarkReportListItem> = {}): BenchmarkReportListItem {
  return {
    id: "run-20260315060000",
    source: "artifact",
    sourceLabel: "Run",
    sourceId: "20260315060000",
    fileName: "benchmark-report.md",
    filePath: "/tmp/benchmark-report.md",
    title: "Benchmark Run 20260315060000",
    summary: "reference-target-web · prompt-summary vs json-primary",
    dateLabel: "March 15, 2026",
    generatedAt: "2026-03-15T06:00:00.000Z",
    ...overrides,
  };
}

describe("BenchmarksPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prefers the newest live run over a newer archive note for the landing redirect", () => {
    listBenchmarkReports.mockReturnValue([
      buildReport({
        id: "archive-2026-03-15-surfaceops-expanded-benchmark-rerun",
        source: "archive",
        sourceLabel: "Archive",
        sourceId: "2026-03-15-surfaceops-expanded-benchmark-rerun",
        fileName: "2026-03-15-surfaceops-expanded-benchmark-rerun.md",
        title: "2026-03-15 - SurfaceOps Expanded Benchmark Rerun",
        summary: "Archived summary.",
        generatedAt: "2026-03-15T12:00:00.000Z",
      }),
      buildReport({
        id: "run-20260315070000",
        sourceId: "20260315070000",
        title: "Benchmark Run 20260315070000",
        generatedAt: "2026-03-15T07:00:00.000Z",
      }),
    ]);

    expect(() => BenchmarksPage()).toThrow("redirect:/benchmarks/run-20260315070000");
    expect(redirect).toHaveBeenCalledWith("/benchmarks/run-20260315070000");
  });

  it("falls back to the newest archive note when no live runs exist", () => {
    listBenchmarkReports.mockReturnValue([
      buildReport({
        id: "archive-2026-03-15-surfaceops-expanded-benchmark-rerun",
        source: "archive",
        sourceLabel: "Archive",
        sourceId: "2026-03-15-surfaceops-expanded-benchmark-rerun",
        fileName: "2026-03-15-surfaceops-expanded-benchmark-rerun.md",
        title: "2026-03-15 - SurfaceOps Expanded Benchmark Rerun",
        summary: "Archived summary.",
        generatedAt: "2026-03-15T12:00:00.000Z",
      }),
    ]);

    expect(() => BenchmarksPage()).toThrow("redirect:/benchmarks/archive-2026-03-15-surfaceops-expanded-benchmark-rerun");
    expect(redirect).toHaveBeenCalledWith("/benchmarks/archive-2026-03-15-surfaceops-expanded-benchmark-rerun");
  });

  it("renders the empty state when no reports are available", () => {
    listBenchmarkReports.mockReturnValue([]);

    const html = renderToStaticMarkup(React.createElement(BenchmarksPage));

    expect(redirect).not.toHaveBeenCalled();
    expect(html).toContain("No benchmark runs or archive notes are available yet.");
    expect(html).toContain("artifacts/generation-benchmarks");
    expect(html).toContain("docs/archive");
  });
});
