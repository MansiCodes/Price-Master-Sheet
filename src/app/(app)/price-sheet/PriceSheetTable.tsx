import { SelectMenu } from "@/components/ui/SelectMenu";
import type { CableRate } from "@/lib/sheets/types";
import { rateRowKey } from "@/lib/price-sheet-share";
import { BULK_SELECT_OPTIONS, formatPrice } from "@/app/(app)/price-sheet/price-sheet-utils";

export function PriceSheetTable({
  loading,
  pageItems,
  skeletonRows,
  selectionMode,
  selectedKeys,
  bulkSelectValue,
  tableColSpan,
  emptyMessage,
  onSelectionMenuChange,
  onToggleRow,
}: {
  loading: boolean;
  pageItems: CableRate[];
  skeletonRows: number;
  selectionMode: boolean;
  selectedKeys: Set<string>;
  bulkSelectValue: string;
  tableColSpan: number;
  emptyMessage: string;
  onSelectionMenuChange: (value: string) => void;
  onToggleRow: (key: string) => void;
}) {
  return (
    <section className="ps-panel ps-desktop-only">
      <div className="ps-table-shell">
        <table className="ps-rates-table">
          <thead>
            <tr>
              {selectionMode ? (
                <th className="ps-col-check">
                  <label className="ps-sr-only" htmlFor="ps-select-action-desktop">
                    Bulk select
                  </label>
                  <SelectMenu
                    id="ps-select-action-desktop"
                    className="ps-select-action"
                    value={bulkSelectValue}
                    options={BULK_SELECT_OPTIONS}
                    placeholder="Select"
                    onChange={onSelectionMenuChange}
                  />
                </th>
              ) : null}
              <th className="ps-col-sno">S NO.</th>
              <th className="ps-col-name">NAME OF CABLE</th>
              <th className="ps-col-price ps-col-rm">RM Costing (Per Box=305Mtr)</th>
              <th className="ps-col-price">Price / meter</th>
              <th className="ps-col-price">P=10%</th>
              <th className="ps-col-price">P=12%</th>
              <th className="ps-col-price">P=15%</th>
              <th className="ps-col-price">P=20%</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: skeletonRows }, (_, i) => (
                  <tr key={`sk-${i}`}>
                    {selectionMode ? <td><span className="ps-skeleton ps-sk-sno" /></td> : null}
                    <td><span className="ps-skeleton ps-sk-sno" /></td>
                    <td><span className="ps-skeleton ps-sk-name" /></td>
                    <td><span className="ps-skeleton ps-sk-price" /></td>
                    <td><span className="ps-skeleton ps-sk-price" /></td>
                    <td><span className="ps-skeleton ps-sk-price" /></td>
                    <td><span className="ps-skeleton ps-sk-price" /></td>
                    <td><span className="ps-skeleton ps-sk-price" /></td>
                    <td><span className="ps-skeleton ps-sk-price" /></td>
                  </tr>
                ))
              : pageItems.length === 0
                ? (
                    <tr className="ps-empty-row">
                      <td colSpan={tableColSpan}>{emptyMessage}</td>
                    </tr>
                  )
                : pageItems.map((row) => {
                    const key = rateRowKey(row);
                    return (
                    <tr key={key}>
                      {selectionMode ? (
                        <td className="ps-col-check">
                          <input
                            type="checkbox"
                            className="ps-row-check"
                            aria-label={`Select ${row.name}`}
                            checked={selectedKeys.has(key)}
                            onChange={() => onToggleRow(key)}
                          />
                        </td>
                      ) : null}
                      <td className="ps-sno">{row.sNo ?? "—"}</td>
                      <td className="ps-name" title={row.name}>{row.name}</td>
                      <td className="ps-price ps-price-primary">
                        {formatPrice(row.rmCostingPerBox)}
                      </td>
                      <td className="ps-price">
                        {formatPrice(row.rmCostingPerMtr)}
                      </td>
                      <td className="ps-price">{formatPrice(row.p10)}</td>
                      <td className="ps-price">{formatPrice(row.p12)}</td>
                      <td className="ps-price">{formatPrice(row.p15)}</td>
                      <td className="ps-price">{formatPrice(row.p20)}</td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
