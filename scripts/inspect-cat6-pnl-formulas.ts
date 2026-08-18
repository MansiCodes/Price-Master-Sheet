import ExcelJS, { type CellValue, type Worksheet } from "exceljs";

const path = "C:/Users/Admin/Downloads/Noto_CAT-6 Plant P&L_V1.xlsx";

function rv(value: CellValue): unknown {
  if (value && typeof value === "object" && "result" in value)
    return (value as { result: unknown }).result;
  return value;
}

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path);

  const pnl = wb.getWorksheet("P&L")!;

  // Check raw cell formulas for key P&L cells
  const cells = [
    [9, 3, "OPENING STOCK debit"],
    [9, 6, "CLOSING STOCK credit"],
    [11, 3, "PURCHASES debit"],
    [11, 6, "SALES credit"],
    [14, 3, "PETTY CASH EXP"],
    [22, 3, "WAGES & SALARY"],
    [23, 3, "DEPRECIATION"],
    [24, 3, "INTEREST ON TL"],
    [25, 3, "VARIABLE COST@1%"],
  ] as const;

  for (const [r, c, label] of cells) {
    const cell = pnl.getCell(r, c);
    const raw = cell.value;
    const result = rv(raw);
    const formula = raw && typeof raw === "object" && "formula" in raw ? (raw as any).formula : null;
    console.log(`${label} (R${r}C${c}): formula=${formula}, result=${result}`);
  }

  // List all worksheets
  console.log("\n=== All worksheets ===");
  wb.eachSheet((sheet, id) => {
    console.log(`  ${id}: "${sheet.name}" (${sheet.rowCount} rows)`);
  });

  // Check if there's a second purchase sheet or ATC sheet
  for (const name of ["ATC to NF", "ATC", "ATCL"]) {
    const s = wb.getWorksheet(name);
    if (s) {
      console.log(`\n=== ${name} headers (row 1-3) ===`);
      for (let r = 1; r <= 3; r++) {
        const cols: string[] = [];
        for (let c = 1; c <= 15; c++) {
          const t = String(rv(s.getCell(r, c).value) ?? "").trim();
          if (t) cols.push(`${c}:${t}`);
        }
        if (cols.length) console.log(`  R${r}: ${cols.join(" | ")}`);
      }
      console.log(`  rowCount: ${s.rowCount}`);
    }
  }
}

main().catch(console.error);
