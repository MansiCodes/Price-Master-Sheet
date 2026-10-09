import ExcelJS from "exceljs";
import {
  asUtcDate,
  cellVal,
  normHeader,
  num,
  str,
} from "@/lib/pnl/excel-import/cells";
import {
  orderKey,
  type ParseStockOrdersResult,
  type StockOrderBySize,
  type StockOrderPartyLine,
} from "@/lib/stock/order-excel-types";
import { matchCableAndSize, qtyToKm } from "./order-excel-match";

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

/** Exact Done/Supplied header only — not "dated" (contains "done"). */
function findDoneCol(map: Map<string, number>): number | undefined {
  const exact = [
    "done",
    "done qty",
    "qty done",
    "supplied",
    "supplied qty",
    "qty supplied",
    "offered",
    "offered qty",
    "ready qty",
    "executed",
    "executed qty",
    "call putup",
    "call put up",
  ];
  for (const a of exact) {
    const hit = map.get(a);
    if (hit != null) return hit;
  }
  for (const [h, idx] of map) {
    if (h === "dated" || h === "date") continue;
    if (/\bdone\b/.test(h) || /\bsupplied\b/.test(h)) return idx;
  }
  return undefined;
}

function isCarryParty(raw: string): boolean {
  const t = raw.trim().toLowerCase();
  if (!t || t === "—" || t === "-") return true;
  const n = t.replace(/[.\s'"-]/g, "");
  return n === "do" || n === "ditto" || n === "same";
}

function cellStr(
  row: { getCell: (col: number) => unknown },
  col: number,
): string {
  const cell = row.getCell(col) as {
    master?: Parameters<typeof cellVal>[0];
  } & Parameters<typeof cellVal>[0];
  return str(cellVal(cell.master ?? cell));
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
    same.done = Math.round((same.done + line.done) * 10000) / 10000;
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
  let hasDoneColumn = false;

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
    const partyCol =
      findCol(colMap, ["party name"]) ??
      findCol(colMap, ["party"]) ??
      findCol(colMap, ["consignee", "customer", "customer name"]);
    const deliveryCol = findCol(colMap, [
      "delivery date",
      "delivery period",
      "delivery",
      "del date",
      "due date",
    ]);
    const doneCol = findDoneCol(colMap);
    if (doneCol != null) hasDoneColumn = true;

    const last = Math.min(sheet.rowCount || headerRow, headerRow + 5000);
    let lastParty = "";
    let lastUom = "";
    for (let r = headerRow + 1; r <= last; r++) {
      const row = sheet.getRow(r);
      const sizeRaw = cellStr(row, sizeCol);
      let partyName = partyCol ? cellStr(row, partyCol) : "";
      if (isCarryParty(partyName)) partyName = lastParty;
      else lastParty = partyName.trim();
      if (isJunkRow(sizeRaw, partyName)) {
        skippedRows += 1;
        continue;
      }
      const qtyRaw = num(cellVal(row.getCell(qtyCol)));
      if (qtyRaw == null || qtyRaw <= 0) {
        skippedRows += 1;
        continue;
      }
      let uom = uomCol ? cellStr(row, uomCol) : "";
      if (!uom.trim() && lastUom) uom = lastUom;
      else if (uom.trim()) lastUom = uom;
      const qtyKm = qtyToKm(qtyRaw, uom);
      if (qtyKm <= 0) {
        skippedRows += 1;
        continue;
      }
      const deliveryPeriod = deliveryCol
        ? formatDelivery(cellVal(row.getCell(deliveryCol)))
        : null;
      let doneKm = 0;
      if (doneCol != null) {
        const doneRaw = num(cellVal(row.getCell(doneCol)));
        if (doneRaw != null && doneRaw >= 0) {
          doneKm = qtyToKm(doneRaw, uom);
        }
      }

      const matched = matchCableAndSize(sizeRaw);
      if (!matched) {
        unmatched.add(sizeRaw);
        skippedRows += 1;
        continue;
      }

      addLine(byKey, matched, {
        partyName,
        qty: qtyKm,
        done: doneKm,
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
    hasDoneColumn,
  };
}
