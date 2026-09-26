import { parseQuadSignalStockNotes } from "@/lib/plant-catalogs";
import { toIsoDateString } from "@/lib/dates";
import type { RawMaterialStockRow } from "./types";

/**
 * Build Raw Materials status rows from catalog + newest RM stock entry per item.
 * Rows should be newest-first. Catalog order is preserved; caller may re-sort.
 */
export function buildRawMaterialStockStatus(
  catalog: readonly string[],
  rows: Array<{
    itemName: string;
    date: Date;
    quantity: number | { toString(): string };
    unit: string;
    rate: number | { toString(): string };
    notes: string | null;
  }>,
): RawMaterialStockRow[] {
  const latest = new Map<
    string,
    {
      qty: number;
      unit: string;
      rate: number;
      entryDate: string;
    }
  >();

  for (const row of rows) {
    const { meta } = parseQuadSignalStockNotes(row.notes);
    if (meta && meta.kind !== "raw") continue;
    const item = row.itemName.trim();
    if (!item || latest.has(item)) continue;
    const qty = Number(row.quantity);
    const rate = Number(row.rate);
    latest.set(item, {
      qty: Number.isFinite(qty) ? qty : 0,
      unit: row.unit || "KGS",
      rate: Number.isFinite(rate) ? rate : 0,
      entryDate: toIsoDateString(row.date),
    });
  }

  const catalogSet = new Set(catalog.filter((c) => c !== "Other"));
  const out: RawMaterialStockRow[] = [];

  for (const item of catalog) {
    if (item === "Other") continue;
    const hit = latest.get(item);
    if (hit) {
      out.push({
        item,
        qty: hit.qty,
        unit: hit.unit,
        rate: hit.rate,
        value: Math.round(hit.qty * hit.rate * 10000) / 10000,
        entryDate: hit.entryDate,
        hasData: true,
      });
      latest.delete(item);
    } else {
      out.push({
        item,
        qty: null,
        unit: null,
        rate: null,
        value: null,
        entryDate: null,
        hasData: false,
      });
    }
  }

  // Any RM entries not in catalog (e.g. custom Other names) — with data first.
  for (const [item, hit] of latest) {
    if (catalogSet.has(item)) continue;
    out.push({
      item,
      qty: hit.qty,
      unit: hit.unit,
      rate: hit.rate,
      value: Math.round(hit.qty * hit.rate * 10000) / 10000,
      entryDate: hit.entryDate,
      hasData: true,
    });
  }

  out.sort((a, b) => {
    if (a.hasData !== b.hasData) return a.hasData ? -1 : 1;
    return 0;
  });

  return out;
}
