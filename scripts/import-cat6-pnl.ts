import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(__dirname, "../.env"), override: true });

import {
  ManpowerShift,
  PettyCashKind,
  Prisma,
  PurchaseType,
  SaleType,
  StockCategory,
} from "@prisma/client";
import ExcelJS, { type CellValue, type Worksheet } from "exceljs";
import { prisma } from "../src/lib/db";
import { mapCat6PettyNature } from "../src/lib/plant-layout";

const WORKBOOK_PATH =
  process.env.CAT6_PNL_WORKBOOK_PATH ??
  "C:/Users/Admin/Downloads/Noto_CAT-6 Plant P&L_V1.xlsx";
const SOURCE_PREFIX = "xlsx:cat6-pnl-v1:";
const STOCK_AS_OF = new Date(Date.UTC(2026, 4, 22));
const OPENING_STOCK_AS_OF = new Date(Date.UTC(2025, 2, 31));

function resultValue(value: CellValue): unknown {
  if (value && typeof value === "object" && "result" in value) {
    return (value as { result: unknown }).result;
  }
  if (value && typeof value === "object" && "text" in value) {
    return (value as { text: unknown }).text;
  }
  return value;
}

function colValue(sheet: Worksheet, row: number, col: number): unknown {
  return resultValue(sheet.getCell(row, col).value);
}

function textAt(sheet: Worksheet, row: number, col: number): string | null {
  const value = colValue(sheet, row, col);
  if (value == null) return null;
  const text = String(value).replace(/\s+/g, " ").trim();
  return text || null;
}

function numberAt(sheet: Worksheet, row: number, col: number): number | null {
  const value = colValue(sheet, row, col);
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function dateAt(sheet: Worksheet, row: number, col: number): Date | null {
  const value = colValue(sheet, row, col);
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(
      Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
    );
  }
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value.trim())) {
    return new Date(`${value.trim().slice(0, 10)}T00:00:00Z`);
  }
  return null;
}

function requiredSheet(workbook: ExcelJS.Workbook, name: string): Worksheet {
  const sheet = workbook.getWorksheet(name);
  if (!sheet) throw new Error(`Workbook sheet not found: ${name}`);
  return sheet;
}

async function main() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(WORKBOOK_PATH);

  const salesSheet = requiredSheet(workbook, "Sales-NF");
  const purchaseSheet = requiredSheet(workbook, "Purchase");
  const pettyCashSheet = requiredSheet(workbook, "Petty Cash");
  const salarySheet = requiredSheet(workbook, "Salary");
  const stockSheet = requiredSheet(workbook, "Stock (UP&UK)");
  const stockMarchSheet = requiredSheet(workbook, "Stock-Mar-25");
  const atcSheet = requiredSheet(workbook, "ATC to NF");

  const plant = await prisma.plant.findUnique({
    where: { code: "CAT6" },
    select: { id: true, name: true },
  });
  if (!plant) throw new Error("CAT-6 Cable Plant does not exist");

  const actor = await prisma.user.findFirst({
    where: { globalRole: "SUPER_ADMIN", isActive: true },
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true },
  });
  if (!actor) throw new Error("Active Super Admin does not exist");

  const sales: Prisma.SaleCreateManyInput[] = [];
  for (let row = 3; row <= salesSheet.rowCount; row += 1) {
    if (row >= 506 && row <= 581) continue;
    const date = dateAt(salesSheet, row, 5);
    const customerName = textAt(salesSheet, row, 3);
    const itemDescription = textAt(salesSheet, row, 6);
    const quantity = numberAt(salesSheet, row, 7);
    const rate = numberAt(salesSheet, row, 9);
    const salesValue = numberAt(salesSheet, row, 10);
    if (
      !date ||
      !customerName ||
      customerName.toLowerCase() === "customer name" ||
      customerName.toUpperCase().includes("TOTAL") ||
      !itemDescription ||
      quantity == null ||
      rate == null ||
      salesValue == null ||
      salesValue === 0
    ) {
      continue;
    }

    sales.push({
      sourceKey: `${SOURCE_PREFIX}sales-nf:${row}`,
      plantId: plant.id,
      date,
      shift: ManpowerShift.DAY,
      type: SaleType.FINISHED_GOOD,
      typeOther: null,
      customerName,
      billNumber: textAt(salesSheet, row, 4),
      billDate: date,
      itemDescription,
      unit: textAt(salesSheet, row, 8) ?? "PCS",
      quantity,
      rate,
      salesValue,
      inMeter: numberAt(salesSheet, row, 11),
      qtyMtr: numberAt(salesSheet, row, 12),
      meterUnit: textAt(salesSheet, row, 13),
      notes: null,
      enteredById: actor.id,
      isBackdated: true,
    });
  }

  // Excel P&L adds Online Sale separately from the Sales-NF detail rows.
  sales.push({
    sourceKey: `${SOURCE_PREFIX}sales-online:excel`,
    plantId: plant.id,
    date: STOCK_AS_OF,
    shift: ManpowerShift.DAY,
    type: SaleType.FINISHED_GOOD,
    typeOther: "Online Sale",
    customerName: "Online Sale",
    billNumber: "EXCEL-ONLINE-SALE",
    billDate: STOCK_AS_OF,
    itemDescription: "Online Sale",
    unit: "LOT",
    quantity: 1,
    rate: 514436,
    salesValue: 514436,
    notes: "Imported from Excel P&L formula",
    enteredById: actor.id,
    isBackdated: true,
  });

  const purchases: Prisma.PurchaseCreateManyInput[] = [];
  for (let row = 3; row <= 250; row += 1) {
    const date = dateAt(purchaseSheet, row, 6);
    const vendorName = textAt(purchaseSheet, row, 4);
    const itemDescription = textAt(purchaseSheet, row, 7);
    const quantity = numberAt(purchaseSheet, row, 8);
    const rate = numberAt(purchaseSheet, row, 10);
    const basicValue = numberAt(purchaseSheet, row, 11);
    if (
      !date ||
      !vendorName ||
      !itemDescription ||
      quantity == null ||
      rate == null ||
      basicValue == null
    ) {
      continue;
    }

    purchases.push({
      sourceKey: `${SOURCE_PREFIX}purchase:${row}`,
      plantId: plant.id,
      date,
      shift: ManpowerShift.DAY,
      type: PurchaseType.RAW_MATERIAL,
      typeOther: null,
      vendorName,
      billNumber: textAt(purchaseSheet, row, 5),
      billDate: date,
      gstin: textAt(purchaseSheet, row, 3),
      booksDate: dateAt(purchaseSheet, row, 2),
      itemDescription,
      unit: textAt(purchaseSheet, row, 9) ?? "KGS",
      quantity,
      rate,
      basicValue,
      gstPercent: 0,
      gstAmount: 0,
      invoiceValue: basicValue,
      notes: textAt(purchaseSheet, row, 12),
      enteredById: actor.id,
      isBackdated: true,
    });
  }

  for (let row = 6; row <= atcSheet.rowCount; row += 1) {
    const date = dateAt(atcSheet, row, 1);
    const basicValueRaw = numberAt(atcSheet, row, 8);
    if (!date || basicValueRaw == null || basicValueRaw === 0) continue;
    const basicValue = Math.abs(basicValueRaw);
    purchases.push({
      sourceKey: `${SOURCE_PREFIX}purchase-atc:${row}`,
      plantId: plant.id,
      date,
      shift: ManpowerShift.DAY,
      type: PurchaseType.RAW_MATERIAL,
      typeOther: "ATC to NF",
      vendorName: "ATC to NF",
      billNumber: `ATC-${row}`,
      billDate: date,
      gstin: null,
      booksDate: date,
      itemDescription: "ATC to NF",
      unit: textAt(atcSheet, row, 9) ?? "KGS",
      quantity: 1,
      rate: basicValue,
      basicValue,
      gstPercent: 0,
      gstAmount: 0,
      invoiceValue: basicValue,
      notes: "Imported from ATC to NF sheet",
      enteredById: actor.id,
      isBackdated: true,
    });
  }

  const expenses: Prisma.PettyCashEntryCreateManyInput[] = [];
  for (let row = 4; row <= pettyCashSheet.rowCount; row += 1) {
    const date = dateAt(pettyCashSheet, row, 2);
    const amount = numberAt(pettyCashSheet, row, 3) ?? 0;
    const nature = textAt(pettyCashSheet, row, 4) ?? "Miscellaneous";
    const description = textAt(pettyCashSheet, row, 5);
    if (!date || amount === 0) continue;

    const person = textAt(pettyCashSheet, row, 6);
    const location = textAt(pettyCashSheet, row, 7);

    expenses.push({
      sourceKey: `${SOURCE_PREFIX}petty-cash:${row}`,
      plantId: plant.id,
      date,
      shift: ManpowerShift.DAY,
      entryType: PettyCashKind.PETTY_CASH,
      payMode: person ?? "Cash",
      expenseHead: mapCat6PettyNature(nature),
      nature,
      description,
      location,
      checkedBy: textAt(pettyCashSheet, row, 8),
      approvedBy: textAt(pettyCashSheet, row, 9),
      openingReading: null,
      closingReading: null,
      billNumber: null,
      amount,
      contractorSalary: 0,
      supervisorSalary: 0,
      enteredById: actor.id,
      isBackdated: true,
    });
  }

  for (let row = 3; row <= salarySheet.rowCount; row += 1) {
    const date = dateAt(salarySheet, row, 3);
    const amount = numberAt(salarySheet, row, 4);
    if (!date || amount == null || amount === 0) continue;

    expenses.push({
      sourceKey: `${SOURCE_PREFIX}salary:${row}`,
      plantId: plant.id,
      date,
      shift: ManpowerShift.DAY,
      entryType: PettyCashKind.EXPENSE,
      payMode: "Salary",
      expenseHead: "Miscellaneous",
      description: "Salary",
      openingReading: null,
      closingReading: null,
      billNumber: null,
      amount,
      contractorSalary: 0,
      supervisorSalary: 0,
      enteredById: actor.id,
      isBackdated: true,
    });
  }

  const stocks: Prisma.StockEntryCreateManyInput[] = [];
  const openingStockValue = numberAt(stockMarchSheet, 57, 15);
  if (openingStockValue != null) {
    stocks.push({
      plantId: plant.id,
      date: OPENING_STOCK_AS_OF,
      shift: ManpowerShift.DAY,
      itemName: "Opening Stock (CAT6)",
      category: StockCategory.RM,
      unit: "LOT",
      quantity: 1,
      rate: openingStockValue,
      closingValue: openingStockValue,
      notes: `${SOURCE_PREFIX}stock-opening:57`,
      enteredById: actor.id,
      isBackdated: true,
    });
  }
  for (let row = 3; row <= stockSheet.rowCount; row += 1) {
    const itemName = textAt(stockSheet, row, 2);
    const quantity = numberAt(stockSheet, row, 3);
    const rate = numberAt(stockSheet, row, 5);
    const closingValue = numberAt(stockSheet, row, 6);
    if (!itemName || quantity == null || rate == null || closingValue == null) {
      continue;
    }

    stocks.push({
      plantId: plant.id,
      date: STOCK_AS_OF,
      shift: ManpowerShift.DAY,
      itemName,
      category: StockCategory.FG,
      unit: textAt(stockSheet, row, 4) ?? "NOS",
      quantity,
      rate,
      closingValue,
      notes: `${SOURCE_PREFIX}stock-upuk:${row}`,
      enteredById: actor.id,
      isBackdated: true,
    });
  }
  const extraClosingStock = numberAt(stockSheet, 28, 14);
  if (extraClosingStock != null) {
    stocks.push({
      plantId: plant.id,
      date: STOCK_AS_OF,
      shift: ManpowerShift.DAY,
      itemName: "Additional Closing Stock (CAT6)",
      category: StockCategory.RM,
      unit: "LOT",
      quantity: 1,
      rate: extraClosingStock,
      closingValue: extraClosingStock,
      notes: `${SOURCE_PREFIX}stock-upuk-extra:28`,
      enteredById: actor.id,
      isBackdated: true,
    });
  }

  await prisma.$transaction(async (tx) => {
    await tx.sale.deleteMany({
      where: { plantId: plant.id, sourceKey: { startsWith: SOURCE_PREFIX } },
    });
    await tx.purchase.deleteMany({
      where: { plantId: plant.id, sourceKey: { startsWith: SOURCE_PREFIX } },
    });
    await tx.pettyCashEntry.deleteMany({
      where: { plantId: plant.id, sourceKey: { startsWith: SOURCE_PREFIX } },
    });
    await tx.stockEntry.deleteMany({
      where: { plantId: plant.id, notes: { startsWith: SOURCE_PREFIX } },
    });

    await tx.sale.createMany({ data: sales });
    await tx.purchase.createMany({ data: purchases });
    await tx.pettyCashEntry.createMany({ data: expenses });
    await tx.stockEntry.createMany({ data: stocks });
  }, { timeout: 120_000 });

  const [salesCheck, purchaseCheck, expenseCheck, stockCheck, salaryCheck] =
    await Promise.all([
      prisma.sale.aggregate({
        where: { plantId: plant.id, sourceKey: { startsWith: SOURCE_PREFIX } },
        _count: true,
        _sum: { salesValue: true },
      }),
      prisma.purchase.aggregate({
        where: { plantId: plant.id, sourceKey: { startsWith: SOURCE_PREFIX } },
        _count: true,
        _sum: { invoiceValue: true },
      }),
      prisma.pettyCashEntry.aggregate({
        where: {
          plantId: plant.id,
          sourceKey: { startsWith: SOURCE_PREFIX },
          entryType: PettyCashKind.PETTY_CASH,
        },
        _count: true,
        _sum: { amount: true },
      }),
      prisma.stockEntry.aggregate({
        where: { plantId: plant.id, notes: { startsWith: SOURCE_PREFIX } },
        _count: true,
        _sum: { closingValue: true },
      }),
      prisma.pettyCashEntry.aggregate({
        where: {
          plantId: plant.id,
          sourceKey: { startsWith: `${SOURCE_PREFIX}salary:` },
        },
        _count: true,
        _sum: { amount: true },
      }),
    ]);

  console.log(`Imported CAT-6 workbook into ${plant.name} as ${actor.email}`);
  console.log("Sales NF:", salesCheck);
  console.log("Purchases:", purchaseCheck);
  console.log("Petty cash:", expenseCheck);
  console.log("Salary as miscellaneous expense:", salaryCheck);
  console.log("Stock UP&UK:", stockCheck);
  console.log("Skipped: production, BOM rows, ATC to NF");
}

main()
  .catch((error) => {
    console.error("CAT-6 workbook import failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
