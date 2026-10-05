import { formatDayMonthYear } from "@/lib/dates";

export function formatBillDate(value: string | Date | null | undefined) {
  return formatDayMonthYear(value);
}

export function num(value: string | number) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function formatQty(value: string | number) {
  return num(value).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Debit is a reduction, so the rupee amount is shown as negative. */
export function debitRupees(debitQuantity: string | number, rate: string | number) {
  return num(debitQuantity) * num(rate);
}

export function netRupeesAfterDebit(
  quantity: string | number,
  debitQuantity: string | number,
  rate: string | number,
) {
  return (num(quantity) - num(debitQuantity)) * num(rate);
}
