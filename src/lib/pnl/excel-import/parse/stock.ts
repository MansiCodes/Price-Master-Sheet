import type ExcelJS from "exceljs";
import { asUtcDate, cellVal, num, str, ymd } from "@/lib/pnl/excel-import/cells";
import { QUAD_STOCK_PROCESS_HEADERS } from "@/lib/pnl/excel-import/quad-stock-columns";
import { STOCK_ALIASES } from "./aliases";
import {
  findHeaderRow,
  findSheet,
  findSheetFallbackDate,
  getCell,
  resolveEntryDate,
  todayUtc,
} from "./sheet";
import type { ParsedPnlWorkbook, ParseWorkbookOpts } from "./types";
import { parseShift, parseStockCategory, sectionBreak } from "./values";

/** Process production columns used on Quad + Signal stock import template. */
const QS_STOCK_PROCESS_HEADERS = QUAD_STOCK_PROCESS_HEADERS;

export function parseStockSheet(
  wb: ExcelJS.Workbook,
  result: ParsedPnlWorkbook,
  opts?: ParseWorkbookOpts,
): void {
  const sheet = findSheet(wb, [
    "Stock",
    "Closing Stock",
    "Stocks",
    "Electricity, Rent & Stock",
  ]);
  if (sheet) {
    const header = findHeaderRow(sheet, STOCK_ALIASES);
    const sheetDate = findSheetFallbackDate(sheet);
    if (!header) {
      result.skipped.push({
        sheet: sheet.name,
        row: 0,
        reason: "No recognizable Stock header row",
      });
    } else {
      // Map process production columns by exact header text (Quad template).
      const processColByName: Record<string, number> = {};
      sheet.getRow(header.row).eachCell({ includeEmpty: false }, (cell, col) => {
        const h = str(cellVal(cell));
        if (!h) return;
        const match = QS_STOCK_PROCESS_HEADERS.find(
          (p) => p.toLowerCase() === h.toLowerCase(),
        );
        if (match) processColByName[match] = col;
      });
      const isQuadPlant =
        opts?.plantCode?.toUpperCase() === "QUAD" ||
        opts?.plantCode?.toUpperCase() === "SIGNALLING" ||
        opts?.plantCode?.toUpperCase() === "QUADSIGNAL";

      for (let r = header.row + 1; r <= sheet.rowCount; r++) {
        const item = str(getCell(sheet, r, header.map, "item"));
        const qty = num(getCell(sheet, r, header.map, "quantity"));
        let rate = num(getCell(sheet, r, header.map, "rate"));
        const value = num(getCell(sheet, r, header.map, "value"));
        const stockTypeRaw = str(getCell(sheet, r, header.map, "stockType"));
        const rowText = [
          item,
          str(getCell(sheet, r, header.map, "category")),
          stockTypeRaw,
        ].join(" ");
        if (sectionBreak(rowText) && !qty) break;
        if (!item) {
          // Blank gap between stock and electricity on combined sheets
          if (result.stock.length > 0) {
            let blankish = true;
            sheet.getRow(r).eachCell({ includeEmpty: false }, () => {
              blankish = false;
            });
            if (blankish) continue;
            // Next section title row
            const first = str(cellVal(sheet.getRow(r).getCell(4))) ||
              str(cellVal(sheet.getRow(r).getCell(5))) ||
              str(cellVal(sheet.getRow(r).getCell(6)));
            if (sectionBreak(first)) break;
          }
          continue;
        }
        if (/\bTOTAL\b/i.test(item) || /stock value/i.test(item)) break;
        const dateRaw = resolveEntryDate(
          getCell(sheet, r, header.map, "date"),
          null,
          sheetDate,
        );

        const production: Record<string, number> = {};
        let hasProduction = false;
        for (const [proc, col] of Object.entries(processColByName)) {
          const cell = sheet.getRow(r).getCell(col);
          const n = num(cellVal(cell));
          if (n != null && n >= 0) {
            production[proc] = n;
            if (n > 0) hasProduction = true;
          }
        }

        const resolvedDate = dateRaw ?? todayUtc();
        const finalQty = qty != null && qty >= 0 ? qty : 0;
        if ((rate == null || rate === 0) && value != null && (qty ?? 0) > 0) {
          rate = value / (qty as number);
        }
        rate = rate ?? 0;
        const size = str(getCell(sheet, r, header.map, "size"));
        const itemName = size ? `${item} · ${size}` : item;

        const typeLower = stockTypeRaw.toLowerCase();
        const looksCable =
          /cable/.test(typeLower) ||
          (isQuadPlant && size.length > 0) ||
          hasProduction;
        const looksRaw =
          /raw/.test(typeLower) ||
          typeLower === "rm" ||
          (!looksCable && isQuadPlant && !size && !hasProduction);

        let qsKind: "raw" | "cable" | undefined;
        if (isQuadPlant) {
          qsKind =
            looksRaw && !looksCable ? "raw" : looksCable ? "cable" : "raw";
        }
        if (qsKind === "cable" && !size) {
          qsKind = "raw";
        }

        const salesKm = num(getCell(sheet, r, header.map, "salesKm"));
        const drumLength =
          str(getCell(sheet, r, header.map, "drumLength")) || null;
        const unitRaw = str(getCell(sheet, r, header.map, "unit"));
        const unit =
          unitRaw ||
          (isQuadPlant ? "KGS" : "kg");

        result.stock.push({
          row: r,
          date: ymd(resolvedDate),
          shift: parseShift(getCell(sheet, r, header.map, "shift")),
          itemName,
          category: parseStockCategory(
            getCell(sheet, r, header.map, "category") ??
              (qsKind === "cable" ? "FG" : "RM"),
          ),
          unit,
          quantity: finalQty,
          rate,
          notes: str(getCell(sheet, r, header.map, "notes")) || null,
          ...(qsKind
            ? {
                qsKind,
                qsCable: qsKind === "cable" ? item : undefined,
                qsSize: qsKind === "cable" ? size || undefined : undefined,
                qsProduction:
                  qsKind === "cable" && Object.keys(production).length
                    ? production
                    : undefined,
                qsSalesKm:
                  qsKind === "cable" && salesKm != null ? salesKm : undefined,
                qsDrumLabel: qsKind === "cable" ? drumLength : undefined,
                qsCallPutup:
                  qsKind === "cable"
                    ? str(getCell(sheet, r, header.map, "callPutup")) || null
                    : undefined,
                qsPutupDate:
                  qsKind === "cable"
                    ? (() => {
                        const raw = getCell(
                          sheet,
                          r,
                          header.map,
                          "putupDate",
                        );
                        const parsed = asUtcDate(raw);
                        if (parsed) return ymd(parsed);
                        const s = str(raw);
                        return s || null;
                      })()
                    : undefined,
                qsPartyName:
                  qsKind === "cable"
                    ? str(getCell(sheet, r, header.map, "partyName")) || null
                    : undefined,
                qsDispatchPending:
                  qsKind === "cable"
                    ? num(getCell(sheet, r, header.map, "dispatchPending")) ??
                      undefined
                    : undefined,
                qsDispatchParty:
                  qsKind === "cable"
                    ? str(getCell(sheet, r, header.map, "dispatchParty")) ||
                      null
                    : undefined,
              }
            : {}),
        });
      }
    }
  }
}
