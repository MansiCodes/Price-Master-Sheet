import { config } from "dotenv";
import { resolve } from "node:path";
config({ path: resolve(__dirname, "../.env"), override: true });

import ExcelJS, { type CellValue, type Worksheet } from "exceljs";

const path = "C:/Users/Admin/Downloads/Noto_CAT-6 Plant P&L_V1.xlsx";

function resultValue(value: CellValue): unknown {
  if (value && typeof value === "object" && "result" in value)
    return (value as { result: unknown }).result;
  if (value && typeof value === "object" && "text" in value)
    return (value as { text: unknown }).text;
  return value;
}

function cell(sheet: Worksheet, r: number, c: number): string {
  const v = resultValue(sheet.getCell(r, c).value);
  if (v == null) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).replace(/\s+/g, " ").trim();
}

function num(sheet: Worksheet, r: number, c: number): number | null {
  const v = resultValue(sheet.getCell(r, c).value);
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const p = Number(v.replace(/,/g, ""));
    return Number.isFinite(p) ? p : null;
  }
  return null;
}

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path);

  // 1) Dump P&L sheet rows 1-40, cols 1-12
  const pnl = wb.getWorksheet("P&L")!;
  console.log("==== P&L sheet (rows 1-40) ====");
  for (let r = 1; r <= 40; r++) {
    const cols: string[] = [];
    for (let c = 1; c <= 12; c++) {
      const t = cell(pnl, r, c);
      if (t) cols.push(`${c}:${t}`);
    }
    if (cols.length) console.log(`R${r} ${cols.join(" | ")}`);
  }

  // 2) Stock-Mar-25 rows 1-20
  const stockMar = wb.getWorksheet("Stock-Mar-25");
  if (stockMar) {
    console.log("\n==== Stock-Mar-25 (rows 1-20) ====");
    for (let r = 1; r <= 20; r++) {
      const cols: string[] = [];
      for (let c = 1; c <= 16; c++) {
        const t = cell(stockMar, r, c);
        if (t) cols.push(`${c}:${t}`);
      }
      if (cols.length) console.log(`R${r} ${cols.join(" | ")}`);
    }
  }

  // 3) Stock (UP&UK) check total
  const stockUPUK = wb.getWorksheet("Stock (UP&UK)")!;
  let stockTotal = 0;
  let stockCount = 0;
  for (let r = 3; r <= stockUPUK.rowCount; r++) {
    const val = num(stockUPUK, r, 6);
    if (val != null) { stockTotal += val; stockCount++; }
  }
  console.log(`\nStock (UP&UK) total value: ${stockTotal} rows: ${stockCount}`);

  // 4) Excel P&L all rows with numbers (to find exact structure)
  console.log("\n==== P&L all rows with labels/numbers ====");
  for (let r = 1; r <= pnl.rowCount; r++) {
    const hasNum = [3,4,5,6,7,8,9,10].some(c => num(pnl, r, c) !== null);
    const hasLabel = [2,3,7].some(c => cell(pnl, r, c).length > 2);
    if (!hasNum && !hasLabel) continue;
    const cols: string[] = [];
    for (let c = 1; c <= 12; c++) {
      const t = cell(pnl, r, c);
      if (t) cols.push(`${c}:${t}`);
    }
    console.log(`R${r} ${cols.join(" | ")}`);
  }

  // 5) Sales total from Sales-NF
  const sales = wb.getWorksheet("Sales-NF")!;
  let salesTotal = 0;
  for (let r = 3; r <= sales.rowCount; r++) {
    const v = num(sales, r, 10);
    if (v != null) salesTotal += v;
  }
  console.log(`\nSales-NF total: ${salesTotal}`);

  // 6) Purchase total
  const purchase = wb.getWorksheet("Purchase")!;
  let purchaseTotal = 0;
  for (let r = 3; r <= purchase.rowCount; r++) {
    const v = num(purchase, r, 11);
    if (v != null) purchaseTotal += v;
  }
  console.log(`Purchase total (col 11 = Purchase Amt): ${purchaseTotal}`);

  // 7) Salary total
  const salary = wb.getWorksheet("Salary")!;
  let salaryTotal = 0;
  for (let r = 3; r <= salary.rowCount; r++) {
    const v = num(salary, r, 4);
    if (v != null) salaryTotal += v;
  }
  console.log(`Salary total: ${salaryTotal}`);

  // 8) Petty cash total
  const petty = wb.getWorksheet("Petty Cash")!;
  let pettyTotal = 0;
  for (let r = 4; r <= petty.rowCount; r++) {
    const v = num(petty, r, 3);
    if (v != null) pettyTotal += v;
  }
  console.log(`Petty Cash total: ${pettyTotal}`);
}

main().catch(e => { console.error(e); process.exitCode = 1; });
