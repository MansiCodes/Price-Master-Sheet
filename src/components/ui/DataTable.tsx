import { ReactNode } from "react";

export type DataTableColumn<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  align?: "left" | "right";
};

type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  loading?: boolean;
  emptyMessage?: string;
};

export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  loading = false,
  emptyMessage = "No entries yet.",
}: DataTableProps<T>) {
  return (
    <div className="data-table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                style={col.align === "right" ? { textAlign: "right" } : undefined}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading && rows.length === 0 ? (
            Array.from({ length: 5 }, (_, rowIndex) => (
              <tr key={`sk-${rowIndex}`} className="data-table__skeleton-row">
                {columns.map((col) => (
                  <td key={col.key}>
                    <span className="data-table__skeleton-line" />
                  </td>
                ))}
              </tr>
            ))
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="data-table__empty">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={getRowKey(row)}>
                {columns.map((col) => (
                  <td
                    key={col.key}
                    style={col.align === "right" ? { textAlign: "right" } : undefined}
                  >
                    {col.render(row)}
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
