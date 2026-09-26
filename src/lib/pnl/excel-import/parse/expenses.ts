import type ExcelJS from "exceljs";
import { asUtcDate, num, str, ymd } from "@/lib/pnl/excel-import/cells";
import { EXPENSE_ALIASES } from "./aliases";
import { findHeaderRow, findSheet, getCell, todayUtc } from "./sheet";
import type { ParsedPnlWorkbook, ParseWorkbookOpts } from "./types";
import { parseShift, resolveExpenseHead, resolveExpenseTarget } from "./values";

export function parseExpenseSheet(
  wb: ExcelJS.Workbook,
  result: ParsedPnlWorkbook,
  opts?: ParseWorkbookOpts,
): void {
  const sheet = findSheet(wb, [
    "Expense",
    "Expenses",
    "Misc Exp.",
    "Misc Exp",
    "Petty Cash",
  ]);
  if (sheet) {
    const header = findHeaderRow(sheet, EXPENSE_ALIASES);
    if (!header) {
      result.skipped.push({
        sheet: sheet.name,
        row: 0,
        reason: "No recognizable Expense header row",
      });
    } else {
      for (let r = header.row + 1; r <= sheet.rowCount; r++) {
        const headRaw =
          str(getCell(sheet, r, header.map, "head")) ||
          str(getCell(sheet, r, header.map, "nature"));
        const description = str(getCell(sheet, r, header.map, "description"));
        const amount = num(getCell(sheet, r, header.map, "amount")) ?? 0;
        const contractor =
          num(getCell(sheet, r, header.map, "contractor")) ?? 0;
        const supervisor =
          num(getCell(sheet, r, header.map, "supervisor")) ?? 0;
        const cost = num(getCell(sheet, r, header.map, "cost"));
        if (!headRaw && !description && amount === 0 && !cost) continue;
        if (/\bTOTAL\b/i.test(headRaw + description)) break;
        const dateRaw = asUtcDate(getCell(sheet, r, header.map, "date"));
        const dateFinal = dateRaw ?? todayUtc();
        const headFinal = headRaw || description || "General Expense";
        const expenseHead = resolveExpenseHead(headFinal, opts?.plantCode);
        const target = resolveExpenseTarget(expenseHead);
        const natureRaw = str(getCell(sheet, r, header.map, "nature"));
        result.expenses.push({
          row: r,
          date: ymd(dateFinal),
          shift: parseShift(getCell(sheet, r, header.map, "shift")),
          target,
          expenseHead,
          nature: natureRaw || null,
          description: description || null,
          payMode: str(getCell(sheet, r, header.map, "payMode")) || "Cash",
          amount,
          contractorSalary: contractor,
          supervisorSalary: supervisor,
          billNumber:
            str(getCell(sheet, r, header.map, "billNumber")) || null,
          openingReading: num(getCell(sheet, r, header.map, "opening")),
          closingReading: num(getCell(sheet, r, header.map, "closing")),
          vendor: str(getCell(sheet, r, header.map, "vendor")) || null,
          cost,
          gst: num(getCell(sheet, r, header.map, "gst")),
          depreciationPercent: num(
            getCell(sheet, r, header.map, "depPercent"),
          ),
          coveredAreaSqft: num(getCell(sheet, r, header.map, "area")),
          rentRatePerSqft: num(getCell(sheet, r, header.map, "rentRate")),
        });
      }
    }
  }
}
