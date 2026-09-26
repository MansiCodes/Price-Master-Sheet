import type ExcelJS from "exceljs";
import { asUtcDate, cellVal, normHeader, str } from "@/lib/pnl/excel-import/cells";
import type { ColMap } from "./types";

export function buildColMap(
  headerRow: ExcelJS.Row,
  aliases: Record<string, string[]>,
): ColMap {
  const map: ColMap = {};
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const h = normHeader(cellVal(cell));
    if (!h) return;
    // Prefer exact header matches first so short aliases (e.g. "stock")
    // do not steal columns like "Closing Stock".
    for (const [key, list] of Object.entries(aliases)) {
      if (map[key] != null) continue;
      if (list.some((a) => h === a)) {
        map[key] = colNumber;
        return;
      }
    }
    for (const [key, list] of Object.entries(aliases)) {
      if (map[key] != null) continue;
      if (list.some((a) => a.length >= 4 && h.includes(a))) {
        map[key] = colNumber;
        return;
      }
    }
  });
  return map;
}

export function findHeaderRow(
  sheet: ExcelJS.Worksheet,
  aliases: Record<string, string[]>,
  maxScan = 40,
  startRow = 1,
): { row: number; map: ColMap } | null {
  const requiredKeys = Object.keys(aliases).slice(0, 3);
  const end = Math.min(maxScan, sheet.rowCount || maxScan);
  for (let r = startRow; r <= end; r++) {
    const map = buildColMap(sheet.getRow(r), aliases);
    const hits = Object.keys(map).length;
    if (hits >= 2) {
      if (requiredKeys.some((k) => map[k] != null) || hits >= 3) {
        return { row: r, map };
      }
    }
  }
  return null;
}

/** Prefer an exact sheet name; fall back to fuzzy includes. */
export function findSheet(
  wb: ExcelJS.Workbook,
  names: string[],
): ExcelJS.Worksheet | undefined {
  for (const name of names) {
    const exact = wb.getWorksheet(name);
    if (exact) return exact;
  }
  const lower = names.map((n) => n.toLowerCase());
  for (const sheet of wb.worksheets) {
    const n = sheet.name.trim().toLowerCase();
    if (lower.some((x) => n === x)) return sheet;
  }
  for (const sheet of wb.worksheets) {
    const n = sheet.name.trim().toLowerCase();
    if (lower.some((x) => n.includes(x))) return sheet;
  }
  return undefined;
}

/** Prefer named sheets; otherwise any sheet whose header matches the aliases. */
export function findSheetWithHeaders(
  wb: ExcelJS.Workbook,
  preferredNames: string[],
  aliases: Record<string, string[]>,
  minHits = 3,
  opts?: {
    /** At least one of these keys must be present in the header map. */
    requireAny?: string[];
    /** Skip sheet when this returns true. */
    rejectIf?: (
      map: ColMap,
      sheet: ExcelJS.Worksheet,
      headerRow: number,
    ) => boolean;
    /** Skip these sheet names (already claimed by another import). */
    excludeSheetNames?: Set<string>;
  },
): { sheet: ExcelJS.Worksheet; header: { row: number; map: ColMap } } | null {
  const requireAny = opts?.requireAny;
  const rejectIf = opts?.rejectIf;
  const excluded = opts?.excludeSheetNames;

  const trySheet = (sheet: ExcelJS.Worksheet) => {
    if (excluded?.has(sheet.name)) return null;
    const header = findHeaderRow(sheet, aliases);
    if (!header) return null;
    const hits = Object.keys(header.map).length;
    if (hits < minHits) return null;
    if (
      requireAny &&
      requireAny.length > 0 &&
      !requireAny.some((k) => header.map[k] != null)
    ) {
      return null;
    }
    if (rejectIf?.(header.map, sheet, header.row)) return null;
    return { sheet, header, hits };
  };

  const preferred = findSheet(wb, preferredNames);
  if (preferred) {
    const hit = trySheet(preferred);
    if (hit) return { sheet: hit.sheet, header: hit.header };
  }

  let best: {
    sheet: ExcelJS.Worksheet;
    header: { row: number; map: ColMap };
    hits: number;
  } | null = null;
  for (const sheet of wb.worksheets) {
    if (preferred && sheet.name === preferred.name) continue;
    const hit = trySheet(sheet);
    if (!hit) continue;
    if (!best || hit.hits > best.hits) best = hit;
  }
  return best ? { sheet: best.sheet, header: best.header } : null;
}

export function todayUtc(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()));
}

export function findSheetFallbackDate(sheet: ExcelJS.Worksheet): Date | null {
  const end = Math.min(45, sheet.rowCount || 45);
  for (let r = 1; r <= end; r++) {
    const row = sheet.getRow(r);
    let found: Date | null = null;
    row.eachCell({ includeEmpty: false }, (cell, col) => {
      if (found) return;
      const v = cellVal(cell);
      const s = str(v);
      if (/as on/i.test(s) || /stock value/i.test(s)) {
        // Date often sits in a nearby cell on the same row
        for (let c = Math.max(1, col - 2); c <= col + 6; c++) {
          const nearby = asUtcDate(cellVal(row.getCell(c)));
          if (nearby) {
            found = nearby;
            return;
          }
        }
        const m = s.match(
          /(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}|\d{4}-\d{2}-\d{2}|\d{1,2}-[A-Za-z]{3}-\d{2,4})/,
        );
        if (m) {
          const parsed = asUtcDate(m[1]);
          if (parsed) found = parsed;
        }
        return;
      }
      const d = asUtcDate(v);
      if (d) found = d;
    });
    if (found) return found;
  }
  return null;
}

export function resolveEntryDate(
  primary: unknown,
  fallback: unknown,
  sheetFallback: Date | null,
): Date | null {
  return asUtcDate(primary) ?? asUtcDate(fallback) ?? sheetFallback;
}

export function getCell(
  sheet: ExcelJS.Worksheet,
  row: number,
  map: ColMap,
  key: string,
): unknown {
  const col = map[key];
  if (col == null) return null;
  return cellVal(sheet.getRow(row).getCell(col));
}
