import { formatDayMonthYear } from "@/lib/dates";

export function isoDate(value: string | Date | null | undefined) {
  return formatDayMonthYear(value);
}

export function num(value: string | number | null | undefined) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function formatQty(value: string | number, digits = 2) {
  return num(value).toLocaleString("en-IN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}
