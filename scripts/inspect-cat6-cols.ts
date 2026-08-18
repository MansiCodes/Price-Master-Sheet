import ExcelJS, { type CellValue, type Worksheet } from "exceljs";

const path = "C:/Users/Admin/Downloads/Noto_CAT-6 Plant P&L_V1.xlsx";

function rv(value: CellValue): unknown {
  if (value && typeof value === "object" && "result" in value)
    return (value as { result: unknown }).result;
  if (value && typeof value === "object" && "text" in value)
    return (value as { text: unknown }).text;
  return value;
}

function cell(sheet: Worksheet, r: number, c: number): string {
  const v = rv(sheet.getCell(r, c).value);
  if (v == null) return "";
  return String(v).trim();
}

function num(sheet: Worksheet, r: number, c: number): number | null {
  const v = rv(sheet.getCell(r, c).value);
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return null;
}

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path);

  // Sales-NF headers and column totals
  const sales = wb.getWorksheet("Sales-NF")!;
  console.log("=== Sales-NF headers (row 2) ===");
  for (let c = 1; c <= 16; c++) {
    const h = cell(sales, 2, c);
    if (h) console.log(`  col ${c}: ${h}`);
  }
  console.log("Column totals (data rows 3+):");
  for (let c = 8; c <= 14; c++) {
    let sum = 0, cnt = 0;
    for (let r = 3; r <= sales.rowCount; r++) {
      const v = num(sales, r, c);
      if (v != null) { sum += v; cnt++; }
    }
    if (cnt > 0) console.log(`  col ${c} (${cell(sales, 2, c)}): ₹${sum} (${cnt} rows)`);
  }

  // Purchase headers and column totals
  const purchase = wb.getWorksheet("Purchase")!;
  console.log("\n=== Purchase headers (row 2) ===");
  for (let c = 1; c <= 16; c++) {
    const h = cell(purchase, 2, c);
    if (h) console.log(`  col ${c}: ${h}`);
  }
  console.log("Column totals (data rows 3+):");
  for (let c = 7; c <= 14; c++) {
    let sum = 0, cnt = 0;
    for (let r = 3; r <= purchase.rowCount; r++) {
      const v = num(purchase, r, c);
      if (v != null) { sum += v; cnt++; }
    }
    if (cnt > 0) console.log(`  col ${c} (${cell(purchase, 2, c)}): ₹${sum} (${cnt} rows)`);
  }

  // Stock (UP&UK) headers
  const stock = wb.getWorksheet("Stock (UP&UK)")!;
  console.log("\n=== Stock (UP&UK) headers (row 2) ===");
  for (let c = 1; c <= 10; c++) {
    const h = cell(stock, 2, c);
    if (h) console.log(`  col ${c}: ${h}`);
  }

  // Stock-Mar-25 — try to find a total row
  const stockMar = wb.getWorksheet("Stock-Mar-25")!;
  console.log("\n=== Stock-Mar-25 searching for total/value rows ===");
  for (let r = 1; r <= stockMar.rowCount; r++) {
    for (let c = 1; c <= 15; c++) {
      const t = cell(stockMar, r, c).toUpperCase();
      if (t.includes("TOTAL") || t.includes("STOCK VALUE") || t.includes("CLOSING") || t.includes("OPENING")) {
        const cols: string[] = [];
        for (let cc = 1; cc <= 15; cc++) {
          const cv = cell(stockMar, r, cc);
          if (cv) cols.push(`${cc}:${cv}`);
        }
        console.log(`  R${r} ${cols.join(" | ")}`);
        break;
      }
    }
  }

  // Salary: check col headers
  const salary = wb.getWorksheet("Salary")!;
  console.log("\n=== Salary headers (row 2) ===");
  for (let c = 1; c <= 10; c++) {
    const h = cell(salary, 2, c);
    if (h) console.log(`  col ${c}: ${h}`);
  }
  // Sum only FY 2025-26 months (Apr 2025 - Mar 2026)
  let salFY = 0;
  for (let r = 3; r <= salary.rowCount; r++) {
    const raw = rv(salary.getCell(r, 3).value);
    let d: Date | null = null;
    if (raw instanceof Date) d = raw;
    else if (typeof raw === "string") d = new Date(raw);
    const v = num(salary, r, 4);
    if (!d || v == null) continue;
    if (d >= new Date("2025-04-01") && d < new Date("2026-04-01")) {
      salFY += v;
    }
  }
  console.log(`Salary FY 2025-26 (Apr-25 to Mar-26): ₹${salFY}`);
}

main().catch(e => { console.error(e); process.exitCode = 1; });
