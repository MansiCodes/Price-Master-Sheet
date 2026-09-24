/**
 * Parse Pending Order Excel (Railway + Private sheets) for Quad + Signal Stock.
 * Size match uses digit + first letter of words (12 Core → 12c, 6Q → 6q).
 * Qty in meters is converted to km.
 */
import ExcelJS from "exceljs";
import {
  asUtcDate,
  cellVal,
  normHeader,
  num,
  str,
} from "@/lib/pnl/excel-import/cells";
import {
  QUAD_SIGNAL_CABLE_SIZES,
  QUAD_SIGNAL_STOCK_CABLES,
} from "@/lib/plant-catalogs";
import {
  lookupStockOrder,
  orderKey,
  toSizeMatchKey,
  type ParseStockOrdersResult,
  type StockOrderBySize,
  type StockOrderPartyLine,
} from "@/lib/stock/order-excel-types";

export type {
  ParseStockOrdersResult,
  StockOrderBySize,
  StockOrderPartyLine,
} from "@/lib/stock/order-excel-types";
export { lookupStockOrder, orderKey, toSizeMatchKey } from "@/lib/stock/order-excel-types";

function allCatalogSizes(): Array<{ cable: string; size: string; key: string }> {
  const out: Array<{ cable: string; size: string; key: string }> = [];
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

const KNOWN_VARIANTS = ["lszh", "xlpe", "zhfr", "frls", "fr", "armoured", "armored", "unarmoured", "unarmored"];

function getVariantTokens(key: string): string[] {
  return KNOWN_VARIANTS.filter((v) => key.includes(v));
}

export function matchCableAndSize(
  excelSize: string,
): { cable: string; size: string } | null {
  const key = toSizeMatchKey(excelSize);
  if (!key || key.length < 2) return null;

  const excelVariants = getVariantTokens(key);

  const filterByVariantMatch = (candidates: typeof CATALOG) => {
    if (excelVariants.length === 0) return candidates;
    return candidates.filter((c) => {
      const candVariants = getVariantTokens(c.key);
      return excelVariants.every((v) => candVariants.includes(v));
    });
  };

  const exact = filterByVariantMatch(CATALOG.filter((c) => c.key === key));
  if (exact.length === 1) return exact[0]!;
  if (exact.length > 1) {
    const signalling = exact.find((c) => c.cable === "Signalling Cable");
    return signalling ?? exact[0]!;
  }

  const isPrefixMatch = (candKey: string) => {
    if (key === candKey) return true;
    if (candKey.startsWith(key)) return true;
    if (key.startsWith(candKey)) {
      const nextChar = key[candKey.length];
      if (nextChar && /\d/.test(nextChar)) return false;
      return true;
    }
    return false;
  };

  // Prefix / start-with hits (must also match variant requirements)
  const prefixHits = filterByVariantMatch(
    CATALOG.filter((c) => isPrefixMatch(c.key)),
  );
  if (prefixHits.length > 0) {
    prefixHits.sort((a, b) => b.key.length - a.key.length);
    const bestLen = prefixHits[0]!.key.length;
    const best = prefixHits.filter((c) => c.key.length === bestLen);
    const signalling = best.find((c) => c.cable === "Signalling Cable");
    return signalling ?? best[0]!;
  }

  // Preserve variant sizes (e.g. 12 Core x 1.5 sqmm LSZH) as their own size
  let cleaned = excelSize
    .replace(/\s+/g, " ")
    .replace(/\b(outer|sheath)\b/gi, "")
    .replace(/(\d+)\s*c\b/gi, "$1 Core")
    .replace(/\b(\d+)\s*q\b/gi, "$1 Quad")
    .replace(/\b(\d+)\s*p\b/gi, "$1 Pair")
    .replace(/\blzsh\b/gi, "LSZH")
    .trim();
  cleaned = cleaned.replace(/\s+/g, " ");

  // Determine cable category for unlisted sizes
  let cable = "Signalling Cable";
  if (/\bquads?\b|\b\d+\s*q\b/i.test(cleaned)) cable = "Quad Cable";
  else if (/\bpairs?\b|\b\d+\s*p\b/i.test(cleaned)) cable = "PIJF Cable";
  else if (/\bfire\b|\bfs\b/i.test(cleaned)) cable = "Fire Survival Cable";
  else if (/\bpower\b/i.test(cleaned)) cable = "Power Cable";

  return { cable, size: cleaned };
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
  // Coils often listed in meters-equivalent lengths in remarks — leave numeric as-is if KM, else /1000 when clearly meters
  if (u.includes("coil")) return qty;
  return qty;
}

function parseDeliveryDateToken(s: string): string | null {
  const dmy = s.match(/^(\d{1,2})[./\-](\d{1,2})[./\-](\d{2,4})$/);
  if (!dmy) return null;
  const day = Number(dmy[1]);
  const month = Number(dmy[2]);
  let year = Number(dmy[3]);
  if (year < 100) year += 2000;
  if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  return null;
}

function cleanDeliveryText(raw: string): string {
  return raw
    .replace(/^(comm(ercial)?|del(ivery)?(\s*period)?|due)\s*[:\-–]\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function formatDelivery(v: unknown): string | null {
  const d = asUtcDate(v);
  if (d) return d.toISOString().slice(0, 10);
  let s = str(v);
  if (!s || /^loa$/i.test(s)) return null;
  s = cleanDeliveryText(s);
  if (!s || /^loa$/i.test(s)) return null;
  const exact = parseDeliveryDateToken(s);
  if (exact) return exact;
  // e.g. "Comm : 01.04.2026" leftovers / trailing notes — take first date token
  const embedded = s.match(/(\d{1,2})[./\-](\d{1,2})[./\-](\d{2,4})/);
  if (embedded) {
    const parsed = parseDeliveryDateToken(embedded[0]);
    if (parsed) return parsed;
  }
  return s || null;
}

function findCol(
  map: Map<string, number>,
  aliases: string[],
): number | undefined {
  for (const a of aliases) {
    const hit = map.get(a);
    if (hit != null) return hit;
  }
  for (const [h, idx] of map) {
    for (const a of aliases) {
      if (h === a || h.includes(a) || a.includes(h)) return idx;
    }
  }
  return undefined;
}

function isJunkRow(size: string, party: string): boolean {
  const blob = `${size} ${party}`.toLowerCase();
  return (
    !size.trim() ||
    blob.includes("total pending") ||
    blob.includes("crore") ||
    /^loa$/i.test(size.trim())
  );
}

function addLine(
  byKey: Record<string, StockOrderBySize>,
  matched: { cable: string; size: string },
  line: StockOrderPartyLine,
) {
  const key = orderKey(matched.cable, matched.size);
  const existing = byKey[key];
  if (!existing) {
    byKey[key] = {
      cable: matched.cable,
      size: matched.size,
      totalQty: line.qty,
      parties: [line],
    };
    return;
  }
  existing.totalQty =
    Math.round((existing.totalQty + line.qty) * 10000) / 10000;
  // Merge same party name into one line (sum qty, keep deliveries)
  const same = existing.parties.find(
    (p) =>
      p.partyName.toLowerCase() === line.partyName.toLowerCase() &&
      (p.deliveryPeriod ?? "") === (line.deliveryPeriod ?? ""),
  );
  if (same) {
    same.qty = Math.round((same.qty + line.qty) * 10000) / 10000;
  } else {
    existing.parties.push(line);
  }
}

export async function parseStockOrdersExcel(
  buffer: ArrayBuffer | Buffer,
): Promise<ParseStockOrdersResult> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as never);

  const byKey: Record<string, StockOrderBySize> = {};
  const unmatched = new Set<string>();
  let matchedRows = 0;
  let skippedRows = 0;

  for (const sheet of wb.worksheets) {
    if (!sheet || sheet.state === "hidden" || sheet.state === "veryHidden") {
      continue;
    }

    // Find header row in first 12 rows
    let headerRow = 0;
    let colMap = new Map<string, number>();
    for (let r = 1; r <= Math.min(12, sheet.rowCount || 12); r++) {
      const row = sheet.getRow(r);
      const map = new Map<string, number>();
      row.eachCell({ includeEmpty: false }, (cell, col) => {
        const h = normHeader(cellVal(cell));
        if (h) map.set(h, col);
      });
      const hasSize =
        findCol(map, ["size", "cable size", "size of cable"]) != null;
      const hasQty =
        findCol(map, [
          "qty",
          "qty.",
          "quantity",
          "po qty",
          "po (qty)",
          "order qty",
        ]) != null;
      if (hasSize && hasQty) {
        headerRow = r;
        colMap = map;
        break;
      }
    }
    if (!headerRow) continue;

    const sizeCol = findCol(colMap, [
      "size",
      "cable size",
      "size of cable",
    ])!;
    const qtyCol = findCol(colMap, [
      "qty",
      "qty.",
      "quantity",
      "po qty",
      "po (qty)",
      "order qty",
      "order in hand",
    ])!;
    const uomCol = findCol(colMap, ["uom", "unit", "units"]);
    const partyCol = findCol(colMap, [
      "party name",
      "party",
      "consignee",
      "customer",
      "customer name",
    ]);
    const deliveryCol = findCol(colMap, [
      "delivery date",
      "delivery period",
      "delivery",
      "del date",
      "due date",
    ]);

    const last = Math.min(sheet.rowCount || headerRow, headerRow + 5000);
    for (let r = headerRow + 1; r <= last; r++) {
      const row = sheet.getRow(r);
      const sizeRaw = str(cellVal(row.getCell(sizeCol)));
      const partyName = partyCol
        ? str(cellVal(row.getCell(partyCol))) || "—"
        : "—";
      if (isJunkRow(sizeRaw, partyName)) {
        skippedRows += 1;
        continue;
      }
      const qtyRaw = num(cellVal(row.getCell(qtyCol)));
      if (qtyRaw == null || qtyRaw <= 0) {
        skippedRows += 1;
        continue;
      }
      const uom = uomCol ? str(cellVal(row.getCell(uomCol))) : "";
      const qtyKm = qtyToKm(qtyRaw, uom);
      if (qtyKm <= 0) {
        skippedRows += 1;
        continue;
      }
      const deliveryPeriod = deliveryCol
        ? formatDelivery(cellVal(row.getCell(deliveryCol)))
        : null;

      const matched = matchCableAndSize(sizeRaw);
      if (!matched) {
        unmatched.add(sizeRaw);
        skippedRows += 1;
        continue;
      }

      addLine(byKey, matched, {
        partyName,
        qty: qtyKm,
        deliveryPeriod,
      });
      matchedRows += 1;
    }
  }

  return {
    byKey,
    matchedRows,
    unmatchedSizes: [...unmatched].sort((a, b) => a.localeCompare(b)),
    skippedRows,
  };
}
