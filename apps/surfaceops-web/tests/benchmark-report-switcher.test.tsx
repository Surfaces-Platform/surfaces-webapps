import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BenchmarkReportSwitcher } from "@/app/benchmarks/_components/benchmark-report-switcher";
import type { BenchmarkReportListItem } from "@/lib/benchmark-report-docs";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
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

describe("BenchmarkReportSwitcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders grouped report options with previous and next links", () => {
    const reports = [
      buildReport({ id: "run-20260315070000", sourceId: "20260315070000", title: "Benchmark Run 20260315070000" }),
      buildReport(),
      buildReport({
        id: "archive-2026-03-15-surfaceops-expanded-benchmark-rerun",
        source: "archive",
        sourceLabel: "Archive",
        sourceId: "2026-03-15-surfaceops-expanded-benchmark-rerun",
        title: "2026-03-15 - SurfaceOps Expanded Benchmark Rerun",
        summary: "Archived summary.",
        fileName: "2026-03-15-surfaceops-expanded-benchmark-rerun.md",
        dateLabel: "March 15, 2026",
      }),
    ];

    const html = renderToStaticMarkup(React.createElement(BenchmarkReportSwitcher, {
      reports,
      currentReportId: "run-20260315060000",
      previousReportId: "run-20260315070000",
      nextReportId: "archive-2026-03-15-surfaceops-expanded-benchmark-rerun",
    }));

    expect(html).toContain("Choose report");
    expect(html).toContain("Run · 20260315060000");
    expect(html).toContain("Live runs");
    expect(html).toContain("Archive notes");
    expect(html).toContain("20260315070000 · March 15, 2026");
    expect(html).toContain("2026-03-15 - SurfaceOps Expanded Benchmark Rerun · March 15, 2026");
    expect(html).toContain("/benchmarks/run-20260315070000");
    expect(html).toContain("/benchmarks/archive-2026-03-15-surfaceops-expanded-benchmark-rerun");
  });

  it("disables previous and next controls when only one report exists", () => {
    const html = renderToStaticMarkup(React.createElement(BenchmarkReportSwitcher, {
      reports: [buildReport()],
      currentReportId: "run-20260315060000",
      previousReportId: null,
      nextReportId: null,
    }));

    expect((html.match(/aria-disabled="true"/g) ?? [])).toHaveLength(2);
    expect(html).not.toContain("/benchmarks/");
  });
});
