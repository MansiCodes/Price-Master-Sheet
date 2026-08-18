import { formatDayMonthYear } from "@/lib/dates";

export type ReportTab =
  | "pnl"
  | "sales"
  | "purchase"
  | "production"
  | "stock"
  | "electricityRent"
  | "factoryRent"
  | "fixedAssets"
  | "expense"
  | "pettyCash";

export const REPORT_TABS: { key: ReportTab; label: string }[] = [
  { key: "pnl", label: "P&L" },
  { key: "sales", label: "Sales" },
  { key: "purchase", label: "Purchase" },
  { key: "production", label: "Production" },
  { key: "stock", label: "Stock" },
  { key: "electricityRent", label: "Electricity" },
  { key: "factoryRent", label: "Factory Rent" },
  { key: "fixedAssets", label: "FAR" },
  { key: "expense", label: "Expense" },
  { key: "pettyCash", label: "Petty Cash" },
];

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatDisplayDate(iso: string): string {
  return formatDayMonthYear(iso);
}

export function formatAmount(value: number | null | undefined): string {
  if (value == null || value === 0) return "—";
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatRatio(value: number | null | undefined): string {
  if (value == null) return "";
  return `${value.toFixed(2)}%`;
}
