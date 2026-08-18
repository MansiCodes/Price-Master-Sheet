import ExcelJS, { type CellValue, type Worksheet } from "exceljs";

const path = "C:/Users/Admin/Downloads/Noto_CAT-6 Plant P&L_V1.xlsx";

function resultValue(value: CellValue): unknown {
  if (value && typeof value === "object" && "result" in value)
    return (value as { result: unknown }).result;
  if (value && typeof value === "object" && "text" in value)
    return (value as { text: unknown }).text;
  return value;
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

function dateAt(sheet: Worksheet, r: number, c: number): Date | null {
  const v = resultValue(sheet.getCell(r, c).value);
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v;
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v.trim()))
    return new Date(`${v.trim().slice(0, 10)}T00:00:00Z`);
  return null;
}

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path);

  // Sales-NF: date is col 5
  const sales = wb.getWorksheet("Sales-NF")!;
  let salesBefore = 0, salesAfter = 0, salesTotal = 0;
  let countBefore = 0, countAfter = 0;
  const cutoff = new Date("2025-10-01T00:00:00Z");
  let firstDate: Date | null = null, lastDate: Date | null = null;
  for (let r = 3; r <= sales.rowCount; r++) {
    const d = dateAt(sales, r, 5);
    const v = num(sales, r, 10);
    if (!d || v == null) continue;
    salesTotal += v;
    if (!firstDate || d < firstDate) firstDate = d;
    if (!lastDate || d > lastDate) lastDate = d;
    if (d < cutoff) { salesBefore += v; countBefore++; }
    else { salesAfter += v; countAfter++; }
  }
  console.log("Sales-NF date range:", firstDate?.toISOString().slice(0,10), "to", lastDate?.toISOString().slice(0,10));
  console.log(`  before ${cutoff.toISOString().slice(0,10)}: ${countBefore} rows, ₹${salesBefore}`);
  console.log(`  after: ${countAfter} rows, ₹${salesAfter}`);
  console.log(`  total: ${countBefore+countAfter} rows, ₹${salesTotal}`);
  console.log(`  half of total: ₹${salesTotal / 2}`);
  console.log(`  Excel P&L says: ₹94755539.02`);

  // Check for duplicate rows by billNumber+date
  const seen = new Map<string, number>();
  let dupes = 0;
  for (let r = 3; r <= sales.rowCount; r++) {
    const d = dateAt(sales, r, 5);
    const v = num(sales, r, 10);
    if (!d || v == null) continue;
    const bn = String(resultValue(sales.getCell(r, 4).value) ?? "").trim();
    const key = `${bn}|${d.toISOString().slice(0,10)}|${v}`;
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  for (const [k, c] of seen) {
    if (c > 1) { dupes += c - 1; }
  }
  console.log(`  duplicate bill+date+value combos: ${dupes}`);

  // Check if there is a "Grand Total" row
  for (let r = 3; r <= sales.rowCount; r++) {
    const label = String(resultValue(sales.getCell(r, 3).value) ?? "").trim().toUpperCase();
    if (label.includes("GRAND TOTAL") || label.includes("TOTAL")) {
      const v = num(sales, r, 10);
      console.log(`  Found "${label}" at row ${r}: ₹${v}`);
    }
  }

  // Purchase: date is col 6
  const purchase = wb.getWorksheet("Purchase")!;
  let purchTotal = 0;
  let purchFirst: Date | null = null, purchLast: Date | null = null;
  let purchCount = 0;
  for (let r = 3; r <= purchase.rowCount; r++) {
    const d = dateAt(purchase, r, 6);
    const v = num(purchase, r, 11);
    if (!d || v == null) continue;
    purchTotal += v;
    purchCount++;
    if (!purchFirst || d < purchFirst) purchFirst = d;
    if (!purchLast || d > purchLast) purchLast = d;
  }
  console.log(`\nPurchase date range: ${purchFirst?.toISOString().slice(0,10)} to ${purchLast?.toISOString().slice(0,10)}`);
  console.log(`  ${purchCount} rows, ₹${purchTotal}`);
  console.log(`  half: ₹${purchTotal / 2}`);
  console.log(`  Excel says: ₹92722057.9`);

  // Check for "Grand Total" row in purchases
  for (let r = 3; r <= purchase.rowCount; r++) {
    const label = String(resultValue(purchase.getCell(r, 4).value) ?? "").trim().toUpperCase();
    if (label.includes("GRAND TOTAL") || label.includes("TOTAL")) {
      const v = num(purchase, r, 11);
      console.log(`  Found "${label}" at row ${r}: ₹${v}`);
    }
  }

  // Check Salary breakdown
  const salary = wb.getWorksheet("Salary")!;
  console.log("\nSalary breakdown:");
  for (let r = 3; r <= salary.rowCount; r++) {
    const d = dateAt(salary, r, 3);
    const v = num(salary, r, 4);
    if (!d || v == null || v === 0) continue;
    console.log(`  ${d.toISOString().slice(0,10)}: ₹${v}`);
  }
  console.log(`  Excel P&L WAGES & SALARY: ₹3354618.4`);
  console.log(`  Our salary total: ₹4792312`);

  // Stock (UP&UK) with breakdown
  const stock = wb.getWorksheet("Stock (UP&UK)")!;
  console.log("\nStock (UP&UK) items:");
  let stockTotal = 0;
  for (let r = 3; r <= stock.rowCount; r++) {
    const item = String(resultValue(stock.getCell(r, 2).value) ?? "").trim();
    const v = num(stock, r, 6);
    if (!item || v == null) continue;
    stockTotal += v;
    console.log(`  ${item}: ₹${v}`);
  }
  console.log(`  total: ₹${stockTotal}`);
  console.log(`  Excel CLOSING STOCK: ₹11586301.34`);
}

main().catch(e => { console.error(e); process.exitCode = 1; });
