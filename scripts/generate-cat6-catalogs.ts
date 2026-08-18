import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import ExcelJS, { type CellValue, type Worksheet } from "exceljs";

const path = "C:/Users/Admin/Downloads/Noto_CAT-6 Plant P&L_V1.xlsx";

function resultValue(value: CellValue): unknown {
  if (value && typeof value === "object" && "result" in value) {
    return (value as { result: unknown }).result;
  }
  if (value && typeof value === "object" && "text" in value) {
    return (value as { text: unknown }).text;
  }
  return value;
}

function text(sheet: Worksheet, row: number, col: number): string | null {
  const v = resultValue(sheet.getCell(row, col).value);
  if (v == null) return null;
  const t = String(v).replace(/\s+/g, " ").trim();
  return t || null;
}

function unique(sheet: Worksheet, col: number, start: number, skip: string[]) {
  const set = new Set<string>();
  for (let r = start; r <= sheet.rowCount; r += 1) {
    const t = text(sheet, r, col);
    if (!t) continue;
    if (skip.includes(t.toLowerCase())) continue;
    set.add(t);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

function tsArray(name: string, values: string[]): string {
  const body = values
    .map((v) => `  ${JSON.stringify(v)},`)
    .join("\n");
  return `export const ${name} = [\n${body}\n] as const;\n`;
}

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path);
  const sales = wb.getWorksheet("Sales-NF")!;
  const purchase = wb.getWorksheet("Purchase")!;
  const stock = wb.getWorksheet("Stock (UP&UK)")!;
  const bom = wb.getWorksheet("BOM")!;
  const petty = wb.getWorksheet("Petty Cash")!;

  const skip = [
    "customer name",
    "item details",
    "items",
    "grand total",
    "unit",
    "supplier name",
  ];

  const customers = unique(sales, 3, 3, skip);
  const products = unique(sales, 6, 3, skip);
  const vendors = unique(purchase, 4, 3, skip);
  const goods = unique(purchase, 7, 3, skip);
  const stockItems = unique(stock, 2, 3, skip);
  const bomItems = unique(bom, 1, 3, skip).filter(
    (item) => item.length > 1 && item !== "ALU" || true,
  );

  const goodsWithBom = [...new Set([...goods, ...bomItems])].sort((a, b) =>
    a.localeCompare(b),
  );
  const natures = unique(petty, 4, 4, skip);
  const persons = unique(petty, 6, 4, skip);
  const locations = unique(petty, 7, 4, skip);
  const checkedBy = unique(petty, 8, 4, skip);
  const approvedBy = unique(petty, 9, 4, skip);

  const file = `/** Dropdown options extracted from Noto_CAT-6 Plant P&L_V1.xlsx */\n\n${tsArray("CAT6_CUSTOMERS", customers)}\n${tsArray("CAT6_SALE_PRODUCTS", products)}\n${tsArray("CAT6_SUPPLIERS", vendors)}\n${tsArray("CAT6_PURCHASE_GOODS", goodsWithBom)}\n${tsArray("CAT6_STOCK_ITEMS", stockItems)}\n${tsArray("CAT6_PETTY_NATURES", natures)}\n${tsArray("CAT6_PETTY_PERSONS", persons)}\n${tsArray("CAT6_PETTY_LOCATIONS", locations)}\n${tsArray("CAT6_PETTY_CHECKED_BY", checkedBy)}\n${tsArray("CAT6_PETTY_APPROVED_BY", approvedBy)}\n`;

  const out = resolve(__dirname, "../src/lib/cat6-catalogs.ts");
  writeFileSync(out, file, "utf8");
  console.log("Wrote", out, {
    customers: customers.length,
    products: products.length,
    vendors: vendors.length,
    goods: goodsWithBom.length,
    stock: stockItems.length,
    natures: natures.length,
    persons: persons.length,
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
