import type ExcelJS from "exceljs";
import { PurchaseType } from "@prisma/client";
import { asUtcDate, num, str, ymd } from "@/lib/pnl/excel-import/cells";
import {
  PVC_ATCL_PURCHASE_NOTE_PREFIX,
  PVC_ATCL_VENDOR_NAME,
} from "@/lib/plant-catalogs";
import { PURCHASE_ALIASES } from "./aliases";
import {
  findSheetFallbackDate,
  findSheetWithHeaders,
  getCell,
  resolveEntryDate,
  todayUtc,
} from "./sheet";
import type { ParsedPnlWorkbook, ParseWorkbookOpts } from "./types";
import { parsePurchaseType, parseShift } from "./values";

/** Same rules as Today Entry: Vendor vs Stock Taken from ATCL. */
function applyPurchaseSource(
  sourceRaw: string,
  vendorName: string,
  notes: string | null,
): { vendorName: string; notes: string | null } {
  const src = sourceRaw.trim().toLowerCase();
  const isAtcl =
    /stock\s*taken\s*from\s*atcl|from\s*atcl|\batcl\b/.test(src) &&
    !/vendor|purchase from vendor/.test(src);
  const vendorLooksAtcl = /atcl/i.test(vendorName);
  if (!isAtcl && !vendorLooksAtcl) {
    return { vendorName: vendorName || "—", notes };
  }
  const taggedNotes =
    notes && notes.startsWith(PVC_ATCL_PURCHASE_NOTE_PREFIX)
      ? notes
      : notes
        ? `${PVC_ATCL_PURCHASE_NOTE_PREFIX} · ${notes}`
        : PVC_ATCL_PURCHASE_NOTE_PREFIX;
  return {
    vendorName: vendorName.trim() || PVC_ATCL_VENDOR_NAME,
    notes: taggedNotes,
  };
}

export function parsePurchasesSheet(
  wb: ExcelJS.Workbook,
  result: ParsedPnlWorkbook,
  claimedSheets: Set<string>,
  opts?: ParseWorkbookOpts,
): void {
  const found = findSheetWithHeaders(
    wb,
    ["Purchase", "Purchases", "PURCHASE", "Purchase Register"],
    PURCHASE_ALIASES,
    3,
    {
      requireAny: ["vendor"],
      excludeSheetNames: claimedSheets,
    },
  );
  if (found) {
    const { sheet, header } = found;
    claimedSheets.add(sheet.name);
    const sheetDate = findSheetFallbackDate(sheet);
    for (let r = header.row + 1; r <= sheet.rowCount; r++) {
      const vendor = str(getCell(sheet, r, header.map, "vendor"));
      const item = str(getCell(sheet, r, header.map, "item"));
      const qtyRawCell = getCell(sheet, r, header.map, "quantity");
      let qtyNum = num(qtyRawCell);
      let unitRaw = str(getCell(sheet, r, header.map, "unit"));
      if ((qtyNum == null || qtyNum === 0) && unitRaw) {
        const unitAsQty = num(unitRaw);
        if (unitAsQty != null && unitAsQty > 0) {
          qtyNum = unitAsQty;
          unitRaw = "";
        }
      }
      const qty = qtyNum != null && qtyNum >= 0 ? qtyNum : 0;
      const rate = num(getCell(sheet, r, header.map, "rate")) ?? 0;
      if (!vendor && !item) continue;
      if (/\bTOTAL\b/i.test(vendor + item)) break;
      const billDate = asUtcDate(getCell(sheet, r, header.map, "billDate"));
      const dateRaw =
        resolveEntryDate(
          getCell(sheet, r, header.map, "date"),
          billDate,
          sheetDate,
        ) ?? todayUtc();
      if (!item && !vendor) continue;

      if (!unitRaw && qtyRawCell != null) {
        const uMatch = String(qtyRawCell).match(/[a-zA-Z]+/);
        if (uMatch) unitRaw = uMatch[0];
      }
      const plantCodeUpper = opts?.plantCode?.toUpperCase();
      const unit =
        unitRaw ||
        (plantCodeUpper === "QUAD" || plantCodeUpper === "SIGNALLING" || plantCodeUpper === "QUADSIGNAL"
          ? "KGS"
          : "kg");

      const gstRaw = num(getCell(sheet, r, header.map, "gstPercent"));
      let gstPercent = 18;
      if (gstRaw != null) {
        gstPercent = gstRaw > 100 ? 18 : gstRaw;
      }
      if (
        plantCodeUpper === "CAT6" &&
        header.map.gstPercent == null
      ) {
        gstPercent = 0;
      }
      const type = parsePurchaseType(
        getCell(sheet, r, header.map, "type"),
        item || vendor,
      );
      const sourced = applyPurchaseSource(
        str(getCell(sheet, r, header.map, "source")),
        vendor,
        str(getCell(sheet, r, header.map, "notes")) || null,
      );
      const debitRaw = num(getCell(sheet, r, header.map, "debitQuantity"));
      const debitQuantity =
        debitRaw != null && debitRaw > 0 && debitRaw <= qty ? debitRaw : 0;
      result.purchases.push({
        row: r,
        date: ymd(dateRaw),
        shift: parseShift(getCell(sheet, r, header.map, "shift")),
        type,
        typeOther: type === PurchaseType.OTHERS ? item || vendor : null,
        vendorName: sourced.vendorName,
        billNumber: str(getCell(sheet, r, header.map, "billNumber")) || null,
        billDate: billDate ? ymd(billDate) : null,
        itemDescription: item || vendor || "Purchase item",
        unit,
        quantity: qty,
        debitQuantity,
        rate,
        gstPercent,
        gstin: str(getCell(sheet, r, header.map, "gstin")) || null,
        notes: sourced.notes,
      });
    }
  }
}
