import { formatDayMonthYear } from "@/lib/dates";
import type { SaleRow } from "@/components/pnl/sales-report/types";

export function formatBillDate(value: string | Date | null | undefined) {
  return formatDayMonthYear(value);
}

export function formatQty(value: string | number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatRate(value: string | number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function goodsValue(row: SaleRow) {
  const qty = Number(row.quantity);
  const rate = Number(row.rate);
  if (Number.isFinite(qty) && Number.isFinite(rate)) {
    return qty * rate;
  }
  return Number(row.salesValue) || 0;
}
