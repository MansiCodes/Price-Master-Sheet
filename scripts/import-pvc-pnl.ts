import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(__dirname, "../.env"), override: true });

import {
  ManpowerShift,
  PettyCashKind,
  Prisma,
  PurchaseType,
  SaleType,
} from "@prisma/client";
import ExcelJS, { type CellValue, type Worksheet } from "exceljs";
import { prisma } from "../src/lib/db";

const WORKBOOK_PATH =
  process.env.PVC_PNL_WORKBOOK_PATH ??
  "C:/Users/Admin/Downloads/ATCL_PVC Plant P&L-V1.xlsx";
const SOURCE_PREFIX = "xlsx:pvc-pnl-v1:";

function resultValue(value: CellValue): unknown {
  if (
    value &&
    typeof value === "object" &&
    "result" in value
  ) {
    return value.result;
  }
  return value;
}

function valueAt(sheet: Worksheet, address: string): unknown {
  return resultValue(sheet.getCell(address).value);
}

function textAt(sheet: Worksheet, address: string): string | null {
  const value = valueAt(sheet, address);
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

function numberAt(sheet: Worksheet, address: string): number | null {
  const value = valueAt(sheet, address);
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function dateAt(sheet: Worksheet, address: string): Date | null {
  const value = valueAt(sheet, address);
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(
      Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
    );
  }
  return null;
}

function requiredSheet(
  workbook: ExcelJS.Workbook,
  name: string,
): Worksheet {
  const sheet = workbook.getWorksheet(name);
  if (!sheet) throw new Error(`Workbook sheet not found: ${name}`);
  return sheet;
}

async function main() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(WORKBOOK_PATH);

  const salesSheet = requiredSheet(workbook, "Sales");
  const purchaseSheet = requiredSheet(workbook, "Purchase");
  const pettyCashSheet = requiredSheet(workbook, "Petty Cash");
  const electricitySheet = requiredSheet(workbook, "Electricity");

  const plant = await prisma.plant.findUnique({
    where: { code: "PVC" },
    select: { id: true, name: true },
  });
  if (!plant) throw new Error("PVC plant does not exist");

  const actor = await prisma.user.findFirst({
    where: { globalRole: "SUPER_ADMIN", isActive: true },
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true },
  });
  if (!actor) throw new Error("Active Super Admin does not exist");

  const sales: Prisma.SaleCreateManyInput[] = [];
  for (let row = 4; row <= 188; row += 1) {
    const date = dateAt(salesSheet, `E${row}`);
    const quantity = numberAt(salesSheet, `H${row}`);
    const rate = numberAt(salesSheet, `I${row}`);
    const salesValue = numberAt(salesSheet, `J${row}`);
    const itemDescription = textAt(salesSheet, `F${row}`);
    if (
      !date ||
      quantity == null ||
      rate == null ||
      salesValue == null ||
      !itemDescription ||
      salesValue === 0
    ) {
      continue;
    }

    sales.push({
      sourceKey: `${SOURCE_PREFIX}sales:${row}`,
      plantId: plant.id,
      date,
      shift: ManpowerShift.DAY,
      type: SaleType.FINISHED_GOOD,
      typeOther: null,
      customerName: "ATCL",
      billNumber: textAt(salesSheet, `D${row}`),
      billDate: date,
      itemDescription,
      unit: textAt(salesSheet, `G${row}`) ?? "KGS",
      quantity,
      rate,
      salesValue,
      notes: textAt(salesSheet, `C${row}`),
      enteredById: actor.id,
      isBackdated: true,
    });
  }

  const purchases: Prisma.PurchaseCreateManyInput[] = [];
  for (let row = 4; row <= 132; row += 1) {
    const date = dateAt(purchaseSheet, `F${row}`);
    const vendorName = textAt(purchaseSheet, `C${row}`);
    const itemDescription = textAt(purchaseSheet, `D${row}`);
    const quantity = numberAt(purchaseSheet, `H${row}`);
    const rate = numberAt(purchaseSheet, `I${row}`);
    const basicValue = numberAt(purchaseSheet, `J${row}`);
    const gstAmount = numberAt(purchaseSheet, `K${row}`);
    const invoiceValue = numberAt(purchaseSheet, `L${row}`);
    if (
      !date ||
      !vendorName ||
      !itemDescription ||
      quantity == null ||
      rate == null ||
      basicValue == null ||
      gstAmount == null ||
      invoiceValue == null
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
      billNumber: textAt(purchaseSheet, `E${row}`),
      billDate: date,
      itemDescription,
      unit: textAt(purchaseSheet, `G${row}`) ?? "KGS",
      quantity,
      rate,
      basicValue,
      gstPercent: 18,
      gstAmount,
      invoiceValue,
      notes: textAt(purchaseSheet, `M${row}`),
      enteredById: actor.id,
      isBackdated: true,
    });
  }

  const expenses: Prisma.PettyCashEntryCreateManyInput[] = [];
  for (let row = 4; row <= 93; row += 1) {
    const date = dateAt(pettyCashSheet, `F${row}`);
    const amount = numberAt(pettyCashSheet, `G${row}`) ?? 0;
    const contractorSalary = numberAt(pettyCashSheet, `H${row}`) ?? 0;
    const supervisorSalary = numberAt(pettyCashSheet, `I${row}`) ?? 0;
    if (!date || amount + contractorSalary + supervisorSalary === 0) {
      continue;
    }

    expenses.push({
      sourceKey: `${SOURCE_PREFIX}expense:${row}`,
      plantId: plant.id,
      date,
      shift: ManpowerShift.DAY,
      entryType: PettyCashKind.PETTY_CASH,
      payMode: textAt(pettyCashSheet, `C${row}`) ?? "Unspecified",
      expenseHead: "Petty Cash",
      description: textAt(pettyCashSheet, `D${row}`),
      openingReading: null,
      closingReading: null,
      billNumber: textAt(pettyCashSheet, `E${row}`),
      amount,
      contractorSalary,
      supervisorSalary,
      enteredById: actor.id,
      isBackdated: true,
    });
  }

  for (let row = 4; row <= 8; row += 1) {
    const date = dateAt(electricitySheet, `C${row}`);
    const amount = numberAt(electricitySheet, `H${row}`);
    if (!date || amount == null || amount === 0) continue;

    const openingReading = numberAt(electricitySheet, `D${row}`);
    const closingReading = numberAt(electricitySheet, `E${row}`);
    const readingNote =
      textAt(electricitySheet, `I${row}`) ??
      (openingReading == null ? textAt(electricitySheet, `D${row}`) : null);

    expenses.push({
      sourceKey: `${SOURCE_PREFIX}electricity:${row}`,
      plantId: plant.id,
      date,
      shift: ManpowerShift.DAY,
      entryType: PettyCashKind.EXPENSE,
      payMode: "Electricity",
      expenseHead: "Electricity",
      description: readingNote,
      openingReading,
      closingReading,
      billNumber: null,
      amount,
      contractorSalary: 0,
      supervisorSalary: 0,
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

    await tx.sale.createMany({ data: sales });
    await tx.purchase.createMany({ data: purchases });
    await tx.pettyCashEntry.createMany({ data: expenses });
  });

  const [salesCheck, purchaseCheck, expenseCheck] = await Promise.all([
    prisma.sale.aggregate({
      where: { plantId: plant.id, sourceKey: { startsWith: SOURCE_PREFIX } },
      _count: true,
      _sum: { salesValue: true },
    }),
    prisma.purchase.aggregate({
      where: { plantId: plant.id, sourceKey: { startsWith: SOURCE_PREFIX } },
      _count: true,
      _sum: { basicValue: true, gstAmount: true, invoiceValue: true },
    }),
    prisma.pettyCashEntry.aggregate({
      where: { plantId: plant.id, sourceKey: { startsWith: SOURCE_PREFIX } },
      _count: true,
      _sum: {
        amount: true,
        contractorSalary: true,
        supervisorSalary: true,
      },
    }),
  ]);

  const pettyCashCheck = await prisma.pettyCashEntry.aggregate({
    where: {
      plantId: plant.id,
      sourceKey: { startsWith: SOURCE_PREFIX },
      entryType: PettyCashKind.PETTY_CASH,
    },
    _count: true,
    _sum: {
      amount: true,
      contractorSalary: true,
      supervisorSalary: true,
    },
  });

  console.log(`Imported workbook into ${plant.name} as ${actor.email}`);
  console.log("Sales:", salesCheck);
  console.log("Purchases:", purchaseCheck);
  console.log("Expenses:", expenseCheck);
  console.log("Petty cash only:", pettyCashCheck);

  const checks: Array<[string, number, number, number]> = [
    ["sales rows", salesCheck._count, 184, 0],
    [
      "sales value",
      Number(salesCheck._sum.salesValue),
      22_683_087,
      0.001,
    ],
    ["purchase rows", purchaseCheck._count, 129, 0],
    [
      "purchase basic value",
      Number(purchaseCheck._sum.basicValue),
      17_590_855.09,
      0.001,
    ],
    [
      "purchase GST",
      Number(purchaseCheck._sum.gstAmount),
      3_166_353.94,
      0.001,
    ],
    [
      "purchase invoice value",
      Number(purchaseCheck._sum.invoiceValue),
      20_757_208,
      0.001,
    ],
    ["expense rows", expenseCheck._count, 95, 0],
    [
      "petty cash rows",
      pettyCashCheck._count,
      expenses.filter((e) => e.entryType === PettyCashKind.PETTY_CASH).length,
      0,
    ],
    [
      "petty cash contractor salary",
      Number(pettyCashCheck._sum.contractorSalary),
      1_195_285,
      0.001,
    ],
    [
      "petty cash supervisor salary",
      Number(pettyCashCheck._sum.supervisorSalary),
      120_581,
      0.001,
    ],
    [
      "expense and electricity amount",
      Number(expenseCheck._sum.amount),
      1_166_038.7557,
      0.0001,
    ],
    [
      "contractor salary",
      Number(expenseCheck._sum.contractorSalary),
      1_195_285,
      0.001,
    ],
    [
      "supervisor salary",
      Number(expenseCheck._sum.supervisorSalary),
      120_581,
      0.001,
    ],
  ];

  for (const [label, actual, expected, tolerance] of checks) {
    if (Math.abs(actual - expected) > tolerance) {
      throw new Error(
        `${label} mismatch: expected ${expected}, imported ${actual}`,
      );
    }
  }
  console.log("All imported row counts and workbook totals match.");
}

main()
  .catch((error) => {
    console.error("PVC workbook import failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
