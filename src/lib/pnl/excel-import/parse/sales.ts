import type ExcelJS from "exceljs";
import { SaleType } from "@prisma/client";
import { asUtcDate, num, str, ymd } from "@/lib/pnl/excel-import/cells";
import { SALE_ALIASES } from "./aliases";
import {
  buildColMap,
  findSheetFallbackDate,
  findSheetWithHeaders,
  getCell,
  resolveEntryDate,
  todayUtc,
} from "./sheet";
import type { ParsedPnlWorkbook, ParseWorkbookOpts } from "./types";
import { parseSaleType, parseShift } from "./values";

export function parseSalesSheet(
  wb: ExcelJS.Workbook,
  result: ParsedPnlWorkbook,
  claimedSheets: Set<string>,
  opts?: ParseWorkbookOpts,
): void {
  const found = findSheetWithHeaders(
    wb,
    ["Sales", "Sale", "SALES", "Sales Register"],
    SALE_ALIASES,
    3,
    {
      requireAny: ["customer", "item"],
      // Vendor/supplier sheets belong to Purchase, not Sales
      rejectIf: (map, sheet, headerRow) => {
        if (map.customer != null) return false;
        const probe = buildColMap(sheet.getRow(headerRow), {
          vendor: [
            "vendor s name",
            "vendor name",
            "vendor",
            "supplier name",
            "supplier",
          ],
        });
        return probe.vendor != null;
      },
    },
  );
  if (!found) {
    // Sales optional when the file only has Purchase/Stock/etc.
  } else {
    const { sheet, header } = found;
    claimedSheets.add(sheet.name);
    const sheetDate = findSheetFallbackDate(sheet);
    for (let r = header.row + 1; r <= sheet.rowCount; r++) {
      const customer = str(getCell(sheet, r, header.map, "customer"));
      const item = str(getCell(sheet, r, header.map, "item"));
      const qtyRaw = num(getCell(sheet, r, header.map, "quantity"));
      const qtyMtrVal = num(getCell(sheet, r, header.map, "qtyMtr"));
      const inMeterVal = num(getCell(sheet, r, header.map, "inMeter"));
      let rate = num(getCell(sheet, r, header.map, "rate"));
      const salesValue = num(getCell(sheet, r, header.map, "salesValue"));

      // Prefer Quantity when > 0; otherwise CAT6 QTY-MTR
      let qty =
        qtyRaw != null && qtyRaw > 0
          ? qtyRaw
          : qtyMtrVal != null && qtyMtrVal > 0
            ? qtyMtrVal
            : qtyRaw;

      const blankish =
        !customer &&
        !item &&
        !(qty != null && qty > 0) &&
        !(salesValue != null && salesValue > 0);
      if (blankish) continue;
      if (/\bTOTAL\b/i.test(`${customer} ${item}`)) break;
      if (!item && !customer) continue;

      // Incomplete trailing rows (name/item only, no amounts) — ignore quietly
      const hasAmountSignal =
        (qty != null && qty > 0) ||
        (salesValue != null && salesValue > 0) ||
        (rate != null && rate > 0 && (qtyMtrVal != null || inMeterVal != null));
      if (!hasAmountSignal) continue;

      const billDate = asUtcDate(getCell(sheet, r, header.map, "billDate"));
      const dateRaw =
        resolveEntryDate(
          getCell(sheet, r, header.map, "date"),
          billDate,
          sheetDate,
        ) ?? todayUtc();

      if (!(qty != null && qty > 0)) {
        if (salesValue != null && rate != null && rate > 0) {
          qty = salesValue / rate;
        } else if (salesValue != null && salesValue > 0) {
          qty = 1;
          rate = rate ?? salesValue;
        } else {
          qty = 0;
        }
      }
      if ((rate == null || rate === 0) && salesValue != null && qty > 0) {
        rate = salesValue / qty;
      }
      rate = rate ?? 0;

      const resolvedCustomer = customer || "—";
      const resolvedItem = item || customer || "Sale item";
      const unitRaw = str(getCell(sheet, r, header.map, "unit"));
      // Avoid "Unit (MTR)" when Quantity unit should be NOS for CAT6
      const unit =
        unitRaw && !/mtr/i.test(unitRaw)
          ? unitRaw
          : opts?.plantCode?.toUpperCase() === "CAT6"
            ? "NOS"
            : unitRaw || "nos";

      const type = parseSaleType(
        getCell(sheet, r, header.map, "type"),
        resolvedItem,
      );
      result.sales.push({
        row: r,
        date: ymd(dateRaw),
        shift: parseShift(getCell(sheet, r, header.map, "shift")),
        type,
        typeOther: type === SaleType.OTHERS ? resolvedItem : null,
        customerName: resolvedCustomer,
        billNumber: str(getCell(sheet, r, header.map, "billNumber")) || null,
        billDate: billDate ? ymd(billDate) : null,
        itemDescription: resolvedItem,
        unit,
        quantity: qty,
        rate,
        notes: str(getCell(sheet, r, header.map, "notes")) || null,
        inMeter: inMeterVal,
        qtyMtr: qtyMtrVal,
        meterUnit: /mtr/i.test(unitRaw) ? unitRaw : "MTR",
      });
    }
  }
}
