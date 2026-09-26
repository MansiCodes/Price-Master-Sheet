/**
 * Parse a multi-sheet P&L Excel workbook into typed draft rows.
 * Sheets (any of): Sales, Purchase / Purchases, Stock, Expense / Expenses / Misc Exp.
 * Header row is detected by known column aliases; missing columns stay blank/null.
 */
import ExcelJS from "exceljs";
import { parseExpenseSheet } from "./expenses";
import {
  parseElectricitySheets,
  parseFarSheet,
  parseRentSheets,
  parseUnloadingSheet,
} from "./overhead";
import { parsePurchasesSheet } from "./purchases";
import { parseSalesSheet } from "./sales";
import { parseStockSheet } from "./stock";
import type { ParsedPnlWorkbook, ParseWorkbookOpts } from "./types";

export async function parsePnlWorkbook(
  buffer: ArrayBuffer | Buffer,
  opts?: ParseWorkbookOpts,
): Promise<ParsedPnlWorkbook> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as never);

  const result: ParsedPnlWorkbook = {
    sales: [],
    purchases: [],
    stock: [],
    expenses: [],
    skipped: [],
    sheetsFound: wb.worksheets.map((s) => s.name),
  };

  const claimedSheets = new Set<string>();

  parseSalesSheet(wb, result, claimedSheets, opts);
  parsePurchasesSheet(wb, result, claimedSheets, opts);
  parseStockSheet(wb, result, opts);
  parseExpenseSheet(wb, result, opts);
  parseElectricitySheets(wb, result);
  parseRentSheets(wb, result);
  parseFarSheet(wb, result);
  parseUnloadingSheet(wb, result);

  return result;
}
