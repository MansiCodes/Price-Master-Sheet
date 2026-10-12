"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

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

export type ReportFooterRow = {
  cells?: Record<string, ReactNode>;
  variant?: "total" | "subtotal";
  colSpanContent?: ReactNode;
};

export function ReportTable<T extends { id: string }>({
  columns,
  rows,
  loading,
  emptyLabel = "No records in this date range.",
  variant = "register",
  footer,
  secondaryFooter,
  footerRows,
}: {
  columns: ReportColumn<T>[];
  rows: T[];
  loading?: boolean;
  emptyLabel?: string;
  variant?: "default" | "register";
  footer?: Record<string, ReactNode>;
  secondaryFooter?: Record<string, ReactNode>;
  footerRows?: ReportFooterRow[];
}) {
  const isRegister = variant !== "default";
  const tableClass = isRegister
    ? "pnl-report-table pnl-report-table--register"
    : "pnl-report-table";
  const wrapRef = useRef<HTMLDivElement>(null);
  const skipSerial =
    /^(s|sno)$/i.test(columns[0]?.key ?? "") ||
    /^s\.?\s*no/i.test(columns[0]?.label ?? "");
  const stickyFrom = skipSerial ? 1 : 0;

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const ths = wrap?.querySelectorAll("thead th");
    const firstSticky = ths?.[stickyFrom];
    if (!wrap || !firstSticky) return;

    const sync = () => {
      const width = firstSticky.getBoundingClientRect().width;
      wrap.style.setProperty(
        "--pnl-sticky-col1",
        `${Math.max(0, Math.floor(width) - 1)}px`,
      );
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(firstSticky);
    return () => ro.disconnect();
  }, [columns, rows, loading, stickyFrom]);

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

  function isStickyCol(colIndex?: number) {
    return (
      colIndex != null &&
      colIndex >= stickyFrom &&
      colIndex < stickyFrom + 2
    );
  }

  function cellClass(col: ReportColumn<T>, colIndex?: number) {
    return [
      alignClass(col.align),
      wrapClass(col.wrap),
      col.compact ? "is-compact" : "",
      col.key === "actions" ? "is-actions" : "",
      isStickyCol(colIndex) ? "is-sticky-col" : "",
      colIndex === stickyFrom + 1 ? "is-sticky-edge" : "",
    ]
      .filter(Boolean)
      .join(" ");
  }

  function headerClass(col: ReportColumn<T>, colIndex?: number) {
    return [
      alignClass(col.headerAlign ?? col.align),
      wrapClass(col.wrap),
      col.compact ? "is-compact" : "",
      col.key === "actions" ? "is-actions" : "",
      isStickyCol(colIndex) ? "is-sticky-col" : "",
      colIndex === stickyFrom + 1 ? "is-sticky-edge" : "",
    ]
      .filter(Boolean)
      .join(" ");
  }

  function colStyle(col: ReportColumn<T>, colIndex: number) {
    const sticky = isStickyCol(colIndex)
      ? {
          left:
            colIndex === stickyFrom ? 0 : "var(--pnl-sticky-col1)",
        }
      : {};
    if (!col.width && !isStickyCol(colIndex)) return undefined;
    return {
      ...(col.width ? { width: col.width, minWidth: col.width } : {}),
      ...sticky,
    };
  }

  const showEmpty = !loading && rows.length === 0;
  const fallbackFooters: ReportFooterRow[] = [];
  if (footer) fallbackFooters.push({ cells: footer, variant: "total" });
  if (secondaryFooter) {
    fallbackFooters.push({ cells: secondaryFooter, variant: "subtotal" });
  }
  const tfootRows = footerRows ?? fallbackFooters;

  return (
    <div
      ref={wrapRef}
      className={`pnl-report-table-wrap${isRegister ? " pnl-report-table-wrap--register" : ""}`}
    >
      <table className={tableClass}>
        <thead>
          <tr>
            {columns.map((col, colIndex) => (
              <th
                key={col.key}
                className={headerClass(col, colIndex) || undefined}
                style={colStyle(col, colIndex)}
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
                  <td
                    key={col.key}
                    className={cellClass(col, columnIndex) || undefined}
                    style={colStyle(col, columnIndex)}
                  >
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
                {columns.map((col, colIndex) => (
                  <td
                    key={col.key}
                    className={cellClass(col, colIndex) || undefined}
                    style={colStyle(col, colIndex)}
                  >
                    {col.render(row, index)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
        {tfootRows.length > 0 && !loading && rows.length > 0 ? (
          <tfoot>
            {tfootRows.map((foot, idx) => (
              <tr
                key={`foot-${idx}`}
                className={
                  foot.variant === "subtotal"
                    ? "pnl-report-table__subtotal"
                    : "pnl-report-table__total"
                }
              >
                {foot.colSpanContent ? (
                  <td colSpan={columns.length}>{foot.colSpanContent}</td>
                ) : (
                  columns.map((col, colIndex) => (
                    <td
                      key={col.key}
                      className={cellClass(col, colIndex) || undefined}
                      style={colStyle(col, colIndex)}
                    >
                      {(foot.cells ?? {})[col.key] ?? ""}
                    </td>
                  ))
                )}
              </tr>
            ))}
          </tfoot>
        ) : null}
      </table>
    </div>
  );
}
