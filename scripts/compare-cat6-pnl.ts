import ExcelJS, { type CellValue, type Worksheet } from "exceljs";
import { prisma } from "../src/lib/db";
import {
  calculatePlantPnlStatement,
} from "../src/lib/pnl/calculate";
import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(__dirname, "../.env"), override: true });

const WORKBOOK_PATH =
  "C:/Users/Admin/Downloads/Noto_CAT-6 Plant P&L_V1.xlsx";

function resultValue(value: CellValue): unknown {
  if (value && typeof value === "object" && "result" in value) {
    return (value as { result: unknown }).result;
  }
  if (value && typeof value === "object" && "text" in value) {
    return (value as { text: unknown }).text;
  }
  return value;
}

function cellText(sheet: Worksheet, row: number, col: number): string {
  const raw = resultValue(sheet.getCell(row, col).value);
  if (raw == null) return "";
  if (raw instanceof Date) return raw.toISOString().slice(0, 10);
  return String(raw).replace(/\s+/g, " ").trim();
}

function cellNum(sheet: Worksheet, row: number, col: number): number | null {
  const raw = resultValue(sheet.getCell(row, col).value);
  if (raw == null) return null;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string" && raw.trim()) {
    const parsed = Number(raw.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function pickFirstNumber(candidates: Array<number | null | undefined>): number {
  for (const v of candidates) {
    if (v == null) continue;
    if (Number.isFinite(v)) return v;
  }
  return 0;
}

async function extractPnlKeyLines(sheet: Worksheet) {
  const needles = [
    "OPENING STOCK",
    "CLOSING STOCK",
    "Total Purchases",
    "Purchase from Vendor",
    "Total Sales",
    "Sales to Customer",
    "PETTY CASH EXP",
    "NET PROFIT",
    "NET LOSS",
    "INCOME TAX PAYABLE",
    "GROSS PROFIT",
    "GROSS LOSS",
  ];

  const matches: Array<{
    row: number;
    firstCol: string;
    label: string;
    debitCandidate: number;
    creditCandidate: number;
  }> = [];

  // Excel layout varies a bit between sheets, so we:
  // 1) search needles in columns 1..14
  // 2) for debit/credit we still assume commonly used columns (5 and 9),
  //    but we fall back to "any number in the row".
  for (let r = 1; r <= sheet.rowCount; r += 1) {
    let foundLabel = "";
    let hitNeedle: string | null = null;
    for (let c = 1; c <= 14; c += 1) {
      const t = cellText(sheet, r, c);
      if (!t) continue;
      const upper = t.toUpperCase();
      const match = needles.find((n) => upper.includes(n.toUpperCase()));
      if (!match) continue;
      foundLabel = t;
      hitNeedle = match;
      break;
    }

    if (!hitNeedle || !foundLabel) continue;

    const debit = cellNum(sheet, r, 5);
    const credit = cellNum(sheet, r, 9);

    // fallback: first number in the row
    const rowNums: Array<number | null> = [];
    for (let c = 1; c <= 14; c += 1) {
      rowNums.push(cellNum(sheet, r, c));
    }
    const fallbackFirst = rowNums.find((n) => n != null);

    matches.push({
      row: r,
      firstCol: cellText(sheet, r, 2),
      label: foundLabel,
      debitCandidate: debit ?? fallbackFirst ?? 0,
      creditCandidate: credit ?? 0,
    });
  }

  return matches;
}

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(WORKBOOK_PATH);
  const pnlSheet = wb.getWorksheet("P&L")!;

  const cat6 = await prisma.plant.findUnique({
    where: { code: "CAT6" },
    select: { id: true, name: true, code: true },
  });
  if (!cat6) throw new Error("CAT6 plant not found");

  const fromDate = new Date("2025-04-01T00:00:00.000Z");
  const toDate = new Date("2026-05-22T00:00:00.000Z");

  const excelLines = await extractPnlKeyLines(pnlSheet);

  const computed = await calculatePlantPnlStatement(cat6.id, fromDate, toDate);

  console.log("Computed P&L (from entries)");
  console.log({
    salesRevenue: computed.salesRevenue,
    purchases: computed.purchases,
    openingStock: computed.openingStock,
    closingStock: computed.closingStock,
    cogs: computed.cogs,
    manpower: computed.manpower,
    pettyCash: computed.pettyCash,
    electricity: computed.electricity,
    rent: computed.rent,
    depreciation: computed.depreciation,
    grossProfit: computed.grossProfit,
    netProfit: computed.netProfit,
    profitBeforeTax: computed.profitBeforeTax,
  });

  console.log("\nExcel P&L matching lines (rough debit/credit extraction)");
  for (const m of excelLines) {
    console.log(
      `row=${m.row} label=${m.label} debit=${m.debitCandidate} credit=${m.creditCandidate}`,
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

