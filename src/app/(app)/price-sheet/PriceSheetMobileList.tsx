import { SelectMenu } from "@/components/ui/SelectMenu";
import type { CableRate } from "@/lib/sheets/types";
import { rateRowKey } from "@/lib/price-sheet-share";
import { BULK_SELECT_OPTIONS, formatPrice } from "@/app/(app)/price-sheet/price-sheet-utils";

export function PriceSheetMobileList({
  loading,
  pageItems,
  selectionMode,
  selectedKeys,
  bulkSelectValue,
  emptyMessage,
  onSelectionMenuChange,
  onToggleRow,
}: {
  loading: boolean;
  pageItems: CableRate[];
  selectionMode: boolean;
  selectedKeys: Set<string>;
  bulkSelectValue: string;
  emptyMessage: string;
  onSelectionMenuChange: (value: string) => void;
  onToggleRow: (key: string) => void;
}) {
  return (
    <div className="ps-mobile-list ps-mobile-only" aria-live="polite">
      {selectionMode ? (
        <div className="ps-mobile-select-bar">
          <label className="ps-sr-only" htmlFor="ps-select-action-mobile">
            Bulk select
          </label>
          <SelectMenu
            id="ps-select-action-mobile"
            className="ps-select-action"
            value={bulkSelectValue}
            options={BULK_SELECT_OPTIONS}
            placeholder="Select"
            onChange={onSelectionMenuChange}
          />
        </div>
      ) : null}
      {loading
        ? Array.from({ length: 10 }, (_, i) => (
            <article key={`msk-${i}`} className="ps-skeleton-card">
              <div className="ps-sk-line ps-sk-title" />
              <div className="ps-sk-line ps-sk-sub" />
              <div className="ps-sk-prices">
                <div className="ps-sk-chip" />
                <div className="ps-sk-chip" />
                <div className="ps-sk-chip" />
                <div className="ps-sk-chip" />
                <div className="ps-sk-chip" />
              </div>
            </article>
          ))
        : pageItems.length === 0
          ? <p className="ps-mobile-empty">{emptyMessage}</p>
          : pageItems.map((row) => {
              const key = rateRowKey(row);
              return (
              <article key={`m-${key}`} className="ps-rate-card">
                {selectionMode ? (
                  <label className="ps-rate-card-select">
                    <input
                      type="checkbox"
                      className="ps-row-check"
                      checked={selectedKeys.has(key)}
                      onChange={() => onToggleRow(key)}
                    />
                    <span>Select</span>
                  </label>
                ) : null}
                <div className="ps-rate-card-top">
                  <p className="ps-rate-card-name" title={row.name}>{row.name}</p>
                  <span className="ps-rate-card-sno">{row.sNo ?? "—"}</span>
                </div>
                <div className="ps-rate-card-prices">
                  <div className="ps-price-chip is-primary">
                    <span>Per Box</span>
                    <strong>{formatPrice(row.rmCostingPerBox)}</strong>
                  </div>
                  <div className="ps-price-chip">
                    <span>Per meter</span>
                    <strong>{formatPrice(row.rmCostingPerMtr)}</strong>
                  </div>
                  <div className="ps-price-chip">
                    <span>P=10%</span>
                    <strong>{formatPrice(row.p10)}</strong>
                  </div>
                  <div className="ps-price-chip">
                    <span>P=12%</span>
                    <strong>{formatPrice(row.p12)}</strong>
                  </div>
                  <div className="ps-price-chip">
                    <span>P=15%</span>
                    <strong>{formatPrice(row.p15)}</strong>
                  </div>
                  <div className="ps-price-chip">
                    <span>P=20%</span>
                    <strong>{formatPrice(row.p20)}</strong>
                  </div>
                </div>
              </article>
            );
            })}
    </div>
  );
}
