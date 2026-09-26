import {
  QUAD_SIGNAL_CABLE_SIZES,
  QUAD_SIGNAL_STOCK_CABLES,
} from "@/lib/plant-catalogs";
import { inferCableFromExcelSize } from "@/lib/stock/order-excel-infer";
import { toSizeMatchKey } from "@/lib/stock/order-excel-types";

export { inferCableFromExcelSize } from "@/lib/stock/order-excel-infer";

type CatalogRow = { cable: string; size: string; key: string };

function allCatalogSizes(): CatalogRow[] {
  const out: CatalogRow[] = [];
  for (const cable of QUAD_SIGNAL_STOCK_CABLES) {
    if (cable === "Other") continue;
    for (const size of QUAD_SIGNAL_CABLE_SIZES[cable] ?? []) {
      if (size === "Other") continue;
      out.push({ cable, size, key: toSizeMatchKey(size) });
    }
  }
  return out;
}

const CATALOG = allCatalogSizes();

const VARIANT_TAIL = /^(unarmoured|armoured|lszh|xlpe|zhfr|frls|fr)+$/;

function variantExtra(longer: string, shorter: string): string | null {
  if (!longer.startsWith(shorter)) return null;
  const extra = longer.slice(shorter.length);
  if (!extra) return "";
  return VARIANT_TAIL.test(extra) ? extra : null;
}

function cleanSize(excelSize: string): string {
  return excelSize
    .replace(/\s+/g, " ")
    .replace(/\b(outer|sheath)\b/gi, "")
    .replace(/(\d+)\s*c\b/gi, "$1 Core")
    .replace(/\b(\d+)\s*q\b/gi, "$1 Quad")
    .replace(/\b(\d+)\s*p\b/gi, "$1 Pair")
    .replace(/\blzsh\b/gi, "LSZH")
    .trim()
    .replace(/\s+/g, " ");
}

function pickBest(hits: CatalogRow[], inferred: string): CatalogRow {
  const typed = hits.filter((c) => c.cable === inferred);
  return (typed[0] ?? hits[0])!;
}

export function matchCableAndSize(
  excelSize: string,
): { cable: string; size: string } | null {
  const key = toSizeMatchKey(excelSize);
  if (!key) return null;

  const inferred = inferCableFromExcelSize(excelSize);

  const exact = CATALOG.filter((c) => c.key === key);
  if (exact.length >= 1) {
    const row = pickBest(exact, inferred);
    return { cable: row.cable, size: row.size };
  }
  if (key.length < 2) return null;

  // Catalog size + LSZH/armour (or Excel omitted armour). Never ABC/ATC/twin prefix.
  const extensions = CATALOG.filter((c) => {
    const extraOnCatalog = variantExtra(c.key, key);
    const extraOnExcel = variantExtra(key, c.key);
    return extraOnCatalog !== null || extraOnExcel !== null;
  });
  if (extensions.length === 1) {
    const row = extensions[0]!;
    if (variantExtra(key, row.key)) {
      return { cable: row.cable, size: cleanSize(excelSize) };
    }
    return { cable: row.cable, size: row.size };
  }
  if (extensions.length > 1) {
    const typed = extensions.filter((c) => c.cable === inferred);
    const pool = typed.length > 0 ? typed : extensions;
    if (pool.length === 1) {
      const row = pool[0]!;
      return variantExtra(key, row.key)
        ? { cable: row.cable, size: cleanSize(excelSize) }
        : { cable: row.cable, size: row.size };
    }
  }

  return { cable: inferred, size: cleanSize(excelSize) };
}

/** Convert qty to km using UOM (MTRS/MTR → /1000, KM unchanged). */
export function qtyToKm(qty: number, uomRaw: string): number {
  const u = uomRaw.toLowerCase().replace(/\s+/g, "");
  if (!u) return qty;
  if (
    u.startsWith("mtr") ||
    u.startsWith("meter") ||
    u.startsWith("metre") ||
    u === "m" ||
    u === "mts"
  ) {
    return Math.round((qty / 1000) * 10000) / 10000;
  }
  if (u.includes("coil")) return qty;
  return qty;
}
