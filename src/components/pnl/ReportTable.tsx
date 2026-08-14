"use client";

import type { ReactNode } from "react";

export type ReportColumn<T> = {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  /** Header alignment (defaults to `align`). */
  headerAlign?: "left" | "right" | "center";
  /** Wrap long text. Use `"wide"` for remarks that need more room. */
  wrap?: boolean | "wide";
  /** Keep this column compact (unit / qty / rate). */
  compact?: boolean;
  render: (row: T, index?: number) => ReactNode;
};

export function ReportTable<T extends { id: string }>({
  columns,
  rows,
  loading,
  emptyLabel = "No records in this date range.",
  variant = "default",
}: {
  columns: ReportColumn<T>[];
  rows: T[];
  loading?: boolean;
  emptyLabel?: string;
  variant?: "default" | "register";
}) {
  const isRegister = variant === "register";
  const tableClass = isRegister
    ? "pnl-report-table pnl-report-table--register"
    : "pnl-report-table";

  function alignClass(align?: "left" | "right" | "center") {
    if (align === "right") return "is-right";
    if (align === "center") return "is-center";
    return "";
  }

  function wrapClass(wrap?: boolean | "wide") {
    if (wrap === "wide") return "is-wrap is-wrap-wide";
    if (wrap) return "is-wrap";
    return "";
  }

  function cellClass(col: ReportColumn<T>) {
    return [alignClass(col.align), wrapClass(col.wrap), col.compact ? "is-compact" : ""]
      .filter(Boolean)
      .join(" ");
  }

  function headerClass(col: ReportColumn<T>) {
    return [
      alignClass(col.headerAlign ?? col.align),
      wrapClass(col.wrap),
      col.compact ? "is-compact" : "",
    ]
      .filter(Boolean)
      .join(" ");
  }

  const emptyState = loading ? "Loading…" : emptyLabel;
  const showEmpty = loading || rows.length === 0;

  return (
    <div
      className={`pnl-report-table-wrap${isRegister ? " pnl-report-table-wrap--register" : ""}`}
    >
      <table className={tableClass}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={headerClass(col) || undefined}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {showEmpty ? (
            <tr>
              <td colSpan={columns.length} className="is-muted">
                {emptyState}
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={row.id}>
                {columns.map((col) => (
                  <td key={col.key} className={cellClass(col) || undefined}>
                    {col.render(row, index)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
