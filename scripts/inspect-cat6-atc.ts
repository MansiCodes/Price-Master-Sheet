import ExcelJS, { type CellValue, type Worksheet } from "exceljs";

const path = "C:/Users/Admin/Downloads/Noto_CAT-6 Plant P&L_V1.xlsx";

function rv(value: CellValue): unknown {
  if (value && typeof value === "object" && "result" in value) return (value as any).result;
  if (value && typeof value === "object" && "text" in value) return (value as any).text;
  return value;
}
function cell(s: Worksheet, r: number, c: number): string {
  const v = rv(s.getCell(r, c).value);
  return v == null ? "" : String(v).trim();
}
function num(s: Worksheet, r: number, c: number): number | null {
  const v = rv(s.getCell(r, c).value);
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return null;
}

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path);

  // ATC to NF
  const atc = wb.getWorksheet("ATC to NF")!;
  console.log("=== ATC to NF rows 1-25 ===");
  for (let r = 1; r <= 25; r++) {
    const cols: string[] = [];
    for (let c = 1; c <= 12; c++) {
      const t = cell(atc, r, c);
      if (t) cols.push(`${c}:${t}`);
    }
    if (cols.length) console.log(`R${r} ${cols.join(" | ")}`);
  }
  console.log(`ATC to NF H21: ${num(atc, 21, 8)}`);

  // Stock (UP&UK) — check what's at F26 and N28
  const stock = wb.getWorksheet("Stock (UP&UK)")!;
  console.log(`\nStock (UP&UK) F26: ${num(stock, 26, 6)}`);
  console.log(`Stock (UP&UK) N28: ${num(stock, 28, 14)}`);
  // Check cols 9-16 headers
  console.log("Stock (UP&UK) row 2 cols 9-16:");
  for (let c = 9; c <= 16; c++) {
    const h = cell(stock, 2, c);
    if (h) console.log(`  col ${c}: ${h}`);
  }
  // Dump rows 24-30 cols 1-16
  for (let r = 24; r <= 30; r++) {
    const cols: string[] = [];
    for (let c = 1; c <= 16; c++) {
      const t = cell(stock, r, c);
      if (t) cols.push(`${c}:${t}`);
    }
    if (cols.length) console.log(`R${r} ${cols.join(" | ")}`);
  }

  // Sales-NF rows 500-510 and 585-595
  const sales = wb.getWorksheet("Sales-NF")!;
  console.log("\n=== Sales-NF rows 500-510 ===");
  for (let r = 500; r <= 510; r++) {
    const cols: string[] = [];
    for (let c = 1; c <= 13; c++) {
      const t = cell(sales, r, c);
      if (t) cols.push(`${c}:${t}`);
    }
    if (cols.length) console.log(`R${r} ${cols.join(" | ")}`);
  }
  console.log("\n=== Sales-NF rows 585-595 ===");
  for (let r = 585; r <= 595; r++) {
    const cols: string[] = [];
    for (let c = 1; c <= 13; c++) {
      const t = cell(sales, r, c);
      if (t) cols.push(`${c}:${t}`);
    }
    if (cols.length) console.log(`R${r} ${cols.join(" | ")}`);
  }
  console.log(`Sales-NF J505: ${num(sales, 505, 10)}`);
  console.log(`Sales-NF J591: ${num(sales, 591, 10)}`);

  // Stock-Mar-25 O57
  const stockMar = wb.getWorksheet("Stock-Mar-25")!;
  console.log(`\nStock-Mar-25 O57: ${num(stockMar, 57, 15)}`);
  // Rows around 57
  for (let r = 50; r <= 60; r++) {
    const cols: string[] = [];
    for (let c = 1; c <= 16; c++) {
      const t = cell(stockMar, r, c);
      if (t) cols.push(`${c}:${t}`);
    }
    if (cols.length) console.log(`R${r} ${cols.join(" | ")}`);
  }

  // Salary C22
  const sal = wb.getWorksheet("Salary")!;
  console.log(`\nSalary C22 (raw): ${cell(sal, 22, 3)}`);
  console.log(`Salary D22: ${num(sal, 22, 4)}`);
  for (let r = 15; r <= 22; r++) {
    const cols: string[] = [];
    for (let c = 1; c <= 6; c++) {
      const t = cell(sal, r, c);
      if (t) cols.push(`${c}:${t}`);
    }
    if (cols.length) console.log(`R${r} ${cols.join(" | ")}`);
  }
}

main().catch(console.error);
