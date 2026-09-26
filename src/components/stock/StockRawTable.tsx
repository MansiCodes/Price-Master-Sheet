import { Pagination } from "@/components/ui/Pagination";
import type { RawMaterialStockRow } from "@/lib/stock-production-status";
import { formatNum } from "./stock-status-format";

export function StockRawTable({
  filteredRawRows,
  pagedRawRows,
  page,
  pageSize,
  listTotal,
  rawTotals,
  rmSearchQuery,
  onSearchChange,
  onPageChange,
  onPageSizeChange,
}: {
  filteredRawRows: RawMaterialStockRow[];
  pagedRawRows: RawMaterialStockRow[];
  page: number;
  pageSize: number;
  listTotal: number;
  rawTotals: {
    qty: number | null;
    value: number | null;
    hasAny: boolean;
  };
  rmSearchQuery: string;
  onSearchChange: (query: string) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  return (
    <div className="stock-status-report rm-report-view">
      <div className="rm-summary-grid">
        <div className="rm-stat-card">
          <span className="rm-stat-card__label">Total Items</span>
          <div className="rm-stat-card__body">
            <div className="rm-stat-card__icon rm-stat-card__icon--teal">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
            </div>
            <span className="rm-stat-card__val">
              {filteredRawRows.filter((r) => r.hasData).length || filteredRawRows.length}
            </span>
          </div>
        </div>

        <div className="rm-stat-card">
          <span className="rm-stat-card__label">Total Quantity</span>
          <div className="rm-stat-card__body">
            <div className="rm-stat-card__icon rm-stat-card__icon--blue">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
            </div>
            <span className="rm-stat-card__val">
              {formatNum(rawTotals.qty ?? 0)} <span className="rm-stat-card__unit">KGS</span>
            </span>
          </div>
        </div>

        <div className="rm-stat-card">
          <span className="rm-stat-card__label">Total Inventory Value</span>
          <div className="rm-stat-card__body">
            <div className="rm-stat-card__icon rm-stat-card__icon--green">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 3h12M6 8h12M6 13l8.5 8M6 13h3a4.5 4.5 0 0 0 0-9" />
              </svg>
            </div>
            <span className="rm-stat-card__val">
              {formatNum(rawTotals.value ?? 0)}
            </span>
          </div>
        </div>
      </div>

      <div className="rm-card-container">
        <div className="rm-card-header">
          <h3 className="rm-card-title">Raw Materials List</h3>
          <div className="rm-card-search">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              type="text"
              placeholder="Search item…"
              value={rmSearchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        </div>

        <div className="stock-rm-table-wrap">
          <table className="stock-rm-table stock-rm-table--zebra">
            <thead>
              <tr>
                <th scope="col" className="text-center">S. NO.</th>
                <th scope="col">ITEM</th>
                <th scope="col" className="text-right">QTY</th>
                <th scope="col" className="text-center">UNIT</th>
                <th scope="col" className="text-right">RATE</th>
                <th scope="col" className="text-right">VALUE</th>
              </tr>
            </thead>
            <tbody>
              {pagedRawRows.map((row, idx) => (
                <tr
                  key={row.item}
                  className={row.hasData ? undefined : "is-empty"}
                >
                  <td className="text-center">{(page - 1) * pageSize + idx + 1}</td>
                  <td className="font-semibold">{row.item}</td>
                  <td className="text-right font-medium">
                    {row.hasData && row.qty != null ? formatNum(row.qty) : "—"}
                  </td>
                  <td className="text-center">{row.hasData ? row.unit || "KGS" : "—"}</td>
                  <td className="text-right">
                    {row.hasData && row.rate != null ? formatNum(row.rate) : "—"}
                  </td>
                  <td className="text-right font-semibold">
                    {row.hasData && row.value != null ? formatNum(row.value) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
            {rawTotals.hasAny ? (
              <tfoot>
                <tr className="stock-rm-table__total">
                  <td />
                  <td>Total</td>
                  <td className="text-right">
                    {rawTotals.qty != null ? formatNum(rawTotals.qty) : "—"}
                  </td>
                  <td className="text-center">—</td>
                  <td className="text-right">—</td>
                  <td className="text-right">
                    {rawTotals.value != null ? formatNum(rawTotals.value) : "—"}
                  </td>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>

        <Pagination
          page={page}
          pageSize={pageSize}
          total={listTotal}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      </div>
    </div>
  );
}
