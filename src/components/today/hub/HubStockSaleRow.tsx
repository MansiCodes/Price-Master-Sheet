import type { Dispatch, ReactNode, SetStateAction } from "react";
import { PnlThemedDateField } from "@/components/pnl/PnlThemedDateField";
import type { StockSaleItem } from "@/components/today/today-hub-model";

function patchSale(
  setItems: Dispatch<SetStateAction<StockSaleItem[]>>,
  idx: number,
  patch: Partial<StockSaleItem>,
) {
  setItems((prev) => prev.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
}

function num(raw: string) {
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function saleTotals(item: StockSaleItem) {
  const total = num(item.rate) * num(item.quantity);
  const gstAmt = total * (num(item.gstPercent) / 100);
  return { total, grand: total + gstAmt };
}

function SaleField({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
    </div>
  );
}

function ph(hint: string | undefined, fallback: string) {
  const t = String(hint ?? "").trim();
  return t ? t : fallback;
}

export function HubStockSaleRow({
  item,
  idx,
  count,
  setItems,
  onRemove,
  hint,
}: {
  item: StockSaleItem;
  idx: number;
  count: number;
  setItems: Dispatch<SetStateAction<StockSaleItem[]>>;
  onRemove: (i: number) => void;
  hint?: StockSaleItem;
}) {
  const { total, grand } = saleTotals(item);
  return (
    <div className="qs-wip__sale-block">
      <div className="qs-wip__sale-grid">
        <SaleField id={`st-sale-inv-${idx}`} label="Invoice no.">
          <input
            id={`st-sale-inv-${idx}`}
            aria-label="Invoice no"
            placeholder={ph(hint?.invoiceNo, "Invoice no.")}
            value={item.invoiceNo}
            onChange={(e) => patchSale(setItems, idx, { invoiceNo: e.target.value })}
          />
        </SaleField>
        <SaleField id={`st-sale-date-${idx}`} label="Date">
          <div className="today-hub-date">
            <PnlThemedDateField
              id={`st-sale-date-${idx}`}
              label="Date"
              hideLabel
              align="end"
              value={item.date}
              onChange={(val) => patchSale(setItems, idx, { date: val })}
            />
          </div>
        </SaleField>
        <SaleField id={`st-sale-party-${idx}`} label="Party name">
          <input
            id={`st-sale-party-${idx}`}
            aria-label="Party name"
            placeholder={ph(hint?.partyName, "Party name")}
            value={item.partyName}
            onChange={(e) => patchSale(setItems, idx, { partyName: e.target.value })}
          />
        </SaleField>
        <SaleField id={`st-sale-rate-${idx}`} label="Rate">
          <input
            id={`st-sale-rate-${idx}`}
            inputMode="decimal"
            aria-label="Rate"
            placeholder={ph(hint?.rate, "Rate")}
            value={item.rate}
            onChange={(e) => patchSale(setItems, idx, { rate: e.target.value })}
          />
        </SaleField>
        <SaleField id={`st-sale-qty-${idx}`} label="Quantity">
          <input
            id={`st-sale-qty-${idx}`}
            inputMode="decimal"
            aria-label="Quantity"
            placeholder={ph(hint?.quantity, "Qty")}
            value={item.quantity}
            onChange={(e) => patchSale(setItems, idx, { quantity: e.target.value })}
          />
        </SaleField>
        <SaleField id={`st-sale-gst-${idx}`} label="GST %">
          <input
            id={`st-sale-gst-${idx}`}
            inputMode="decimal"
            aria-label="GST percent"
            placeholder={ph(hint?.gstPercent, "GST %")}
            value={item.gstPercent}
            onChange={(e) => patchSale(setItems, idx, { gstPercent: e.target.value })}
          />
        </SaleField>
        {count > 1 ? (
          <button type="button" className="qs-wip__ins-remove" onClick={() => onRemove(idx)} aria-label="Remove sale">
            ×
          </button>
        ) : (
          <span />
        )}
        <div className="qs-wip__sale-totals">
          <div className="field">
            <span className="qs-wip__sale-label">Total</span>
            <span className="qs-wip__sale-calc">{total ? total.toFixed(2) : "0"}</span>
          </div>
          <div className="field">
            <span className="qs-wip__sale-label">Grand total</span>
            <span className="qs-wip__sale-calc">{grand ? grand.toFixed(2) : "0"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
