"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useTransition } from "react";
import { colors } from "@surfaces/ui/tokens/colors";
import type { BenchmarkReportListItem } from "@/lib/benchmark-report-docs";

interface BenchmarkReportSwitcherProps {
  reports: BenchmarkReportListItem[];
  currentReportId: string;
  previousReportId: string | null;
  nextReportId: string | null;
}

function formatOptionLabel(report: BenchmarkReportListItem): string {
  if (report.source === "artifact") {
    return `${report.sourceId} · ${report.dateLabel ?? "Undated"}`;
  }
  return report.dateLabel
    ? `${report.title} · ${report.dateLabel}`
    : report.title;
}

function NavLink({
  label,
  href,
}: {
  label: string;
  href: string | null;
}) {
  if (!href) {
    return (
      <span
        aria-disabled="true"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          minWidth: "120px",
          padding: "10px 14px",
          borderRadius: "999px",
          border: `1px solid ${colors.neutral[200]}`,
          backgroundColor: colors.neutral[50],
          color: colors.neutral[400],
          fontSize: "12px",
          fontWeight: 600,
        }}
      >
        {label}
      </span>
    );
  }

  return (
    <Link
      href={href}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: "120px",
        padding: "10px 14px",
        borderRadius: "999px",
        border: `1px solid ${colors.neutral[200]}`,
        backgroundColor: colors.neutral[0],
        color: colors.neutral[900],
        textDecoration: "none",
        fontSize: "12px",
        fontWeight: 600,
      }}
    >
      {label}
    </Link>
  );
}

export function BenchmarkReportSwitcher({
  reports,
  currentReportId,
  previousReportId,
  nextReportId,
}: BenchmarkReportSwitcherProps) {
  const router = useRouter();
  const selectId = useId();
  const [isPending, startTransition] = useTransition();
  const liveReports = reports.filter((report) => report.source === "artifact");
  const archiveReports = reports.filter((report) => report.source === "archive");
  const currentReport = reports.find((report) => report.id === currentReportId) ?? null;

  return (
    <div
      data-testid="benchmark-report-switcher"
      style={{
        marginTop: "18px",
        paddingTop: "18px",
        borderTop: `1px solid ${colors.neutral[200]}`,
        display: "grid",
        gap: "14px",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
        }}
      >
        <div>
          <div style={{ fontSize: "12px", fontWeight: 600, color: colors.neutral[400], marginBottom: "4px" }}>
            Choose report
          </div>
          <div style={{ fontSize: "13px", color: colors.neutral[600] }}>
            {currentReport
              ? `${currentReport.sourceLabel} · ${currentReport.sourceId}`
              : "Select a benchmark report"}
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          <NavLink
            label="Previous report"
            href={previousReportId ? `/benchmarks/${previousReportId}` : null}
          />
          <NavLink
            label="Next report"
            href={nextReportId ? `/benchmarks/${nextReportId}` : null}
          />
        </div>
      </div>

      <div style={{ display: "grid", gap: "8px" }}>
        <label
          htmlFor={selectId}
          style={{
            fontSize: "12px",
            fontWeight: 600,
            color: colors.neutral[600],
          }}
        >
          Report list
        </label>
        <select
          id={selectId}
          value={currentReportId}
          disabled={isPending}
          onChange={(event) => {
            const nextId = event.currentTarget.value;
            if (!nextId || nextId === currentReportId) {
              return;
            }
            startTransition(() => {
              router.push(`/benchmarks/${nextId}`);
            });
          }}
          style={{
            width: "100%",
            borderRadius: "14px",
            border: `1px solid ${colors.neutral[200]}`,
            backgroundColor: colors.neutral[0],
            color: colors.neutral[900],
            fontSize: "14px",
            lineHeight: 1.5,
            padding: "12px 14px",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.5)",
          }}
        >
          {liveReports.length > 0 && (
            <optgroup label="Live runs">
              {liveReports.map((report) => (
                <option key={report.id} value={report.id}>
                  {formatOptionLabel(report)}
                </option>
              ))}
            </optgroup>
          )}
          {archiveReports.length > 0 && (
            <optgroup label="Archive notes">
              {archiveReports.map((report) => (
                <option key={report.id} value={report.id}>
                  {formatOptionLabel(report)}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </div>
    </div>
  );
}
