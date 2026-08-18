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
  width?: string;
  render: (row: T, index?: number) => ReactNode;
};

export function ReportTable<T extends { id: string }>({
  columns,
  rows,
  loading,
  emptyLabel = "No records in this date range.",
  variant = "default",
  footer,
}: {
  columns: ReportColumn<T>[];
  rows: T[];
  loading?: boolean;
  emptyLabel?: string;
  variant?: "default" | "register";
  footer?: Record<string, ReactNode>;
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

  const showEmpty = !loading && rows.length === 0;

  return (
    <div
      className={`pnl-report-table-wrap${isRegister ? " pnl-report-table-wrap--register" : ""}`}
    >
      <table className={tableClass}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={headerClass(col) || undefined}
                style={col.width ? { width: col.width, minWidth: col.width } : undefined}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 8 }, (_, rowIndex) => (
              <tr key={`skeleton-${rowIndex}`} className="pnl-report-skeleton-row">
                {columns.map((col, columnIndex) => (
                  <td key={col.key} className={cellClass(col) || undefined}>
                    <span
                      className="pnl-skeleton-line"
                      style={{ width: `${55 + ((rowIndex + columnIndex) % 4) * 10}%` }}
                    />
                  </td>
                ))}
              </tr>
            ))
          ) : showEmpty ? (
            <tr>
              <td colSpan={columns.length} className="is-muted">
                {emptyLabel}
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={row.id}>
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cellClass(col) || undefined}
                    style={col.width ? { width: col.width, minWidth: col.width } : undefined}
                  >
                    {col.render(row, index)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
        {footer && !loading && rows.length > 0 ? (
          <tfoot>
            <tr className="pnl-report-table__total">
              {columns.map((col) => (
                <td key={col.key} className={cellClass(col) || undefined}>
                  {footer[col.key] ?? ""}
                </td>
              ))}
            </tr>
          </tfoot>
        ) : null}
      </table>
    </div>
  );
}
