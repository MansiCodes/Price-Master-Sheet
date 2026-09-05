/** Shared Excel cell helpers for P&L workbook import. */
import type ExcelJS from "exceljs";

export function cellVal(cell: ExcelJS.Cell | undefined): unknown {
  if (!cell) return null;
  const v = cell.value as unknown;
  if (v == null) return null;
  if (typeof v === "object" && v !== null && "result" in (v as object)) {
    const r = (v as { result?: unknown }).result;
    if (r === undefined) return null;
    return r;
  }
  if (typeof v === "object" && v !== null && "richText" in (v as object)) {
    return (v as { richText: { text: string }[] }).richText
      .map((t) => t.text)
      .join("");
  }
  if (typeof v === "object" && v !== null && "text" in (v as object)) {
    return (v as { text: string }).text;
  }
  if (typeof v === "object" && v !== null && "formula" in (v as object)) {
    return (v as { result?: unknown }).result ?? null;
  }
  return v;
}

export function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const s = String(v)
    .replace(/,/g, "")
    .replace(/[^\d.\-]/g, "")
    .trim();
  if (!s || s === "-" || s === "." || s === "-.") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function str(v: unknown): string {
  if (v == null) return "";
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return "";
    return v.toISOString().slice(0, 10);
  }
  return String(v).trim();
}

/** Normalize header text for fuzzy column matching. */
export function normHeader(v: unknown): string {
  return str(v)
    .toLowerCase()
    .replace(/[%#]/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function asUtcDate(v: unknown): Date | null {
  if (v == null || v === "") return null;
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    const y = v.getFullYear();
    if (y < 2000 || y > 2100) return null;
    return new Date(Date.UTC(v.getFullYear(), v.getMonth(), v.getDate()));
  }
  if (typeof v === "number" && Number.isFinite(v)) {
    // Excel serial date
    const epoch = Date.UTC(1899, 11, 30);
    const ms = Math.round(v * 86400000);
    const d = new Date(epoch + ms);
    if (!Number.isNaN(d.getTime())) {
      const y = d.getUTCFullYear();
      if (y < 2000 || y > 2100) return null;
      return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    }
  }
  const s = str(v);
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(Date.UTC(+iso[1], +iso[2] - 1, +iso[3]));
  const dmy = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (dmy) {
    const day = +dmy[1];
    const month = +dmy[2];
    let year = +dmy[3];
    if (year < 100) year += 2000;
    return new Date(Date.UTC(year, month - 1, day));
  }
  const mon = s.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})$/);
  if (mon) {
    const months: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
    };
    const mi = months[mon[2].toLowerCase()];
    if (mi != null) {
      let year = +mon[3];
      if (year < 100) year += 2000;
      return new Date(Date.UTC(year, mi, +mon[1]));
    }
  }
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    const y = d.getFullYear();
    if (y < 2000 || y > 2100) return null;
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  }
  return null;
}

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function round4(n: number) {
  return Math.round(n * 10_000) / 10_000;
}

export function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function monthStart(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}
