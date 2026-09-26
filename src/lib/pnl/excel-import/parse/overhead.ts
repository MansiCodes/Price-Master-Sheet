import type ExcelJS from "exceljs";
import { ManpowerShift } from "@prisma/client";
import { asUtcDate, num, str, ymd } from "@/lib/pnl/excel-import/cells";
import { ELECTRICITY_ALIASES, FAR_ALIASES, RENT_ALIASES } from "./aliases";
import {
  findHeaderRow,
  findSheet,
  findSheetFallbackDate,
  getCell,
  resolveEntryDate,
  todayUtc,
} from "./sheet";
import type { ParsedPnlWorkbook } from "./types";
import { sectionBreak } from "./values";

export function parseElectricitySheets(
  wb: ExcelJS.Workbook,
  result: ParsedPnlWorkbook,
): void {
  const dedicated = findSheet(wb, [
    "Electricity",
    "Electricity & Power",
    "Fuel & Power",
    "Fuel and Power",
  ]);
  const combined = findSheet(wb, ["Electricity, Rent & Stock"]);
  const sheets = [dedicated, combined].filter(
    (s, i, arr): s is ExcelJS.Worksheet =>
      !!s && arr.findIndex((x) => x?.name === s.name) === i,
  );
  for (const sheet of sheets) {
    const start =
      sheet.name.toLowerCase().includes("rent") ||
      sheet.name.toLowerCase().includes("stock")
        ? 10
        : 1;
    const header = findHeaderRow(sheet, ELECTRICITY_ALIASES, 60, start);
    if (!header || header.map.amount == null) continue;
    // Avoid re-using stock header
    if (header.map.quantity != null && header.map.item != null) continue;
    for (let r = header.row + 1; r <= sheet.rowCount; r++) {
      const dateRaw = asUtcDate(getCell(sheet, r, header.map, "date"));
      const amount = num(getCell(sheet, r, header.map, "amount")) ?? 0;
      const opening = num(getCell(sheet, r, header.map, "opening"));
      const closing = num(getCell(sheet, r, header.map, "closing"));
      if (!dateRaw && amount === 0 && opening == null && closing == null) {
        continue;
      }
      const label = str(getCell(sheet, r, header.map, "date"));
      if (/\bTOTAL\b/i.test(label) || sectionBreak(label)) break;
      if (!dateRaw || amount <= 0) continue;
      result.expenses.push({
        row: r,
        date: ymd(dateRaw),
        shift: ManpowerShift.DAY,
        target: "electricity",
        expenseHead: "Electricity",
        nature: null,
        description: str(getCell(sheet, r, header.map, "notes")) || null,
        payMode: "Bank",
        amount,
        contractorSalary: 0,
        supervisorSalary: 0,
        billNumber: null,
        openingReading: opening,
        closingReading: closing,
        vendor: null,
        cost: null,
        gst: null,
        depreciationPercent: null,
        coveredAreaSqft: null,
        rentRatePerSqft: null,
      });
    }
  }
}

export function parseRentSheets(
  wb: ExcelJS.Workbook,
  result: ParsedPnlWorkbook,
): void {
  const dedicated = findSheet(wb, ["Rent", "Factory Rent"]);
  const combined = findSheet(wb, ["Electricity, Rent & Stock"]);
  const sheets = [dedicated, combined].filter(
    (s, i, arr): s is ExcelJS.Worksheet =>
      !!s && arr.findIndex((x) => x?.name === s.name) === i,
  );
  for (const sheet of sheets) {
    const start =
      sheet.name.toLowerCase().includes("electricity") ||
      sheet.name.toLowerCase().includes("stock")
        ? 25
        : 1;
    const header = findHeaderRow(sheet, RENT_ALIASES, 80, start);
    if (!header) continue;
    if (header.map.opening != null || header.map.closing != null) continue;
    for (let r = header.row + 1; r <= sheet.rowCount; r++) {
      const dateRaw = asUtcDate(getCell(sheet, r, header.map, "date"));
      const area = num(getCell(sheet, r, header.map, "area"));
      const rentRate =
        num(getCell(sheet, r, header.map, "rentRate")) ??
        num(getCell(sheet, r, header.map, "rateOnly"));
      let amount = num(getCell(sheet, r, header.map, "amount"));
      if ((amount == null || amount === 0) && area != null && rentRate != null) {
        amount = area * rentRate;
      }
      amount = amount ?? 0;
      if (!dateRaw && amount === 0) continue;
      const label = str(getCell(sheet, r, header.map, "date"));
      if (/\bTOTAL\b/i.test(label)) break;
      if (!dateRaw || amount <= 0) continue;
      result.expenses.push({
        row: r,
        date: ymd(dateRaw),
        shift: ManpowerShift.DAY,
        target: "rent",
        expenseHead: "Factory Rent",
        nature: null,
        description: str(getCell(sheet, r, header.map, "notes")) || null,
        payMode: "Bank",
        amount,
        contractorSalary: 0,
        supervisorSalary: 0,
        billNumber: null,
        openingReading: null,
        closingReading: null,
        vendor: null,
        cost: null,
        gst: null,
        depreciationPercent: null,
        coveredAreaSqft: area,
        rentRatePerSqft: rentRate,
      });
    }
  }
}

export function parseFarSheet(
  wb: ExcelJS.Workbook,
  result: ParsedPnlWorkbook,
): void {
  const sheet = findSheet(wb, ["FAR", "Fixed Assets", "Fixed Asset"]);
  if (sheet) {
    const header = findHeaderRow(sheet, FAR_ALIASES);
    if (!header) {
      result.skipped.push({
        sheet: sheet.name,
        row: 0,
        reason: "No recognizable FAR header row",
      });
    } else {
      for (let r = header.row + 1; r <= sheet.rowCount; r++) {
        const vendor = str(getCell(sheet, r, header.map, "vendor"));
        const description = str(
          getCell(sheet, r, header.map, "description"),
        );
        const cost = num(getCell(sheet, r, header.map, "cost"));
        if (!vendor && !description && (cost == null || cost === 0)) continue;
        if (/\bTOTAL\b/i.test(vendor + description)) break;
        const billDate = asUtcDate(getCell(sheet, r, header.map, "billDate"));
        const dateRaw = resolveEntryDate(
          getCell(sheet, r, header.map, "date"),
          billDate,
          findSheetFallbackDate(sheet),
        );
        const dateFinal = dateRaw ?? todayUtc();
        const descFinal = description || vendor || "Fixed Asset";
        result.expenses.push({
          row: r,
          date: ymd(dateFinal),
          shift: ManpowerShift.DAY,
          target: "far",
          expenseHead: "FAR",
          nature: null,
          description: descFinal,
          payMode: "Bank",
          amount: 0,
          contractorSalary: 0,
          supervisorSalary: 0,
          billNumber:
            str(getCell(sheet, r, header.map, "billNumber")) || null,
          openingReading: null,
          closingReading: null,
          vendor: vendor || null,
          cost: cost ?? 0,
          gst: num(getCell(sheet, r, header.map, "gst")),
          depreciationPercent: num(
            getCell(sheet, r, header.map, "depPercent"),
          ),
          coveredAreaSqft: null,
          rentRatePerSqft: null,
        });
      }
    }
  }
}

export function parseUnloadingSheet(
  wb: ExcelJS.Workbook,
  result: ParsedPnlWorkbook,
): void {
  const sheet = findSheet(wb, [
    "Unloading of MT",
    "Unloading MT",
    "Unloading",
  ]);
  if (sheet) {
    const aliases: Record<string, string[]> = {
      date: ["date", "payment date", "entry date"],
      quantity: ["quantity mt", "quantity", "qty", "mt"],
      rate: ["rate mt", "rate"],
      paidTo: ["paid to", "payee", "contractor"],
      payMode: ["pay mode", "payment mode", "mode"],
      amount: ["amount", "value"],
      notes: ["remarks", "notes", "remark"],
    };
    const header = findHeaderRow(sheet, aliases);
    if (header) {
      for (let r = header.row + 1; r <= sheet.rowCount; r++) {
        const dateRaw = asUtcDate(getCell(sheet, r, header.map, "date"));
        const qty = num(getCell(sheet, r, header.map, "quantity"));
        const rate = num(getCell(sheet, r, header.map, "rate"));
        let amount = num(getCell(sheet, r, header.map, "amount"));
        if (
          (amount == null || amount === 0) &&
          qty != null &&
          rate != null
        ) {
          amount = qty * rate;
        }
        amount = amount ?? 0;
        if (!dateRaw || amount <= 0) continue;
        const paidTo = str(getCell(sheet, r, header.map, "paidTo"));
        const notes = str(getCell(sheet, r, header.map, "notes"));
        result.expenses.push({
          row: r,
          date: ymd(dateRaw),
          shift: ManpowerShift.DAY,
          target: "petty",
          expenseHead: "Unloading of MT",
          nature: null,
          description:
            [paidTo && `Paid to ${paidTo}`, notes, qty != null && `Qty ${qty} MT`]
              .filter(Boolean)
              .join(" · ") || null,
          payMode: str(getCell(sheet, r, header.map, "payMode")) || "Cash",
          amount,
          contractorSalary: 0,
          supervisorSalary: 0,
          billNumber: null,
          openingReading: null,
          closingReading: null,
          vendor: paidTo || null,
          cost: null,
          gst: null,
          depreciationPercent: null,
          coveredAreaSqft: null,
          rentRatePerSqft: null,
        });
      }
    }
  }
}
