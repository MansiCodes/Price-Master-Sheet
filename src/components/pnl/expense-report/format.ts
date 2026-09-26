import { formatDayMonthYear } from "@/lib/dates";
import type { ExpenseRow } from "@/components/pnl/expense-report/types";

export function isoDate(value: string | Date) {
  return formatDayMonthYear(value);
}

export function formatMonth(value: string | Date) {
  const iso = isoDate(value);
  if (!iso || iso === "—") return "—";
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function totalAmount(r: ExpenseRow) {
  return (
    Number(r.amount) + Number(r.contractorSalary) + Number(r.supervisorSalary)
  );
}
