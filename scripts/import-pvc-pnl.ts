import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(__dirname, "../.env"), override: true });

import {
  ManpowerShift,
  PettyCashKind,
  Prisma,
} from "@prisma/client";
import ExcelJS, { type CellValue, type Worksheet } from "exceljs";
import { prisma } from "../src/lib/db";

const WORKBOOK_PATH =
  process.env.PVC_PNL_WORKBOOK_PATH ??
  "C:/Users/Admin/Downloads/ATCL_PVC Plant P&L-V1.xlsx";
const SOURCE_PREFIX = "xlsx:pvc-pnl-v1:";

const DEPRECIATION_ASSET_DESC = "PVC Plant Assets (Dep - Company Act)";

type ElectricityRentSeed = {
  month: string; // YYYY-MM
  billAmount: number;
  rentAmount: number;
  openingReading?: number | null;
  closingReading?: number | null;
  consumedUnits?: number | null;
  notes?: string | null;
};

const ELECTRICITY_RENT_SEED: ElectricityRentSeed[] = [
  { month: "2026-01", billAmount: 0, rentAmount: 0, notes: "0 SQFT @ 12.00" },
  {
    month: "2026-02",
    billAmount: 0,
    rentAmount: 24_000,
    notes: "Electricity meter for the PVC plant was installed late on 11 Mar",
  },
  {
    month: "2026-03",
    billAmount: 309_825.37,
    rentAmount: 24_000,
    notes:
      "Power supply is presently functioning on a provisional basis. 11 Mar–31 Mar meter 14,028 units on 59,463 kg = 0.236 kWh/kg. Total production till 31-03-26 148,733 kg → provisional 35,087.81 units × 8.83 = 309,825.37",
  },
  {
    month: "2026-04",
    billAmount: 172_430.38,
    rentAmount: 24_000,
    openingReading: 22_375,
    closingReading: 39_180,
    consumedUnits: 16_805,
    notes: null,
  },
  {
    month: "2026-05",
    billAmount: 192_225,
    rentAmount: 24_000,
    openingReading: 39_180,
    closingReading: 56_655,
    consumedUnits: 17_475,
    notes: "Provisional Rate",
  },
  {
    month: "2026-06",
    billAmount: 219_285,
    rentAmount: 24_000,
    openingReading: 56_655,
    closingReading: 76_590,
    consumedUnits: 19_935,
    notes: null,
  },
  {
    month: "2026-07",
    billAmount: 265_023,
    rentAmount: 24_000,
    openingReading: 76_590,
    closingReading: 100_683,
    consumedUnits: 24_093,
    notes: null,
  },
  {
    month: "2026-08",
    billAmount: 32_494,
    rentAmount: 24_000,
    openingReading: 100_683,
    closingReading: 103_637,
    consumedUnits: 2_954,
    notes: "Till 05-08-26",
  },
];

function parseMonthToUtcDate(month: string): Date {
  // YYYY-MM -> first day of month (UTC)
  const m = /^(\d{4})-(\d{2})$/.exec(month.trim());
  if (!m) throw new Error(`Invalid month seed: ${month}`);
  const year = Number(m[1]);
  const mm = Number(m[2]);
  return new Date(Date.UTC(year, mm - 1, 1));
}

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

  const pettyCashSheet = requiredSheet(workbook, "Petty Cash");

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

  // Sales/purchases are seeded from the plant registers:
  // scripts/seed-pvc-sales.ts and scripts/seed-pvc-purchases.ts

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

  await prisma.$transaction(async (tx) => {
    await tx.pettyCashEntry.deleteMany({
      where: { plantId: plant.id, sourceKey: { startsWith: SOURCE_PREFIX } },
    });

    await tx.pettyCashEntry.createMany({ data: expenses });
  });

  // Seed: Electricity/Rent (electricityRent table)
  await prisma.$transaction(async (tx) => {
    await tx.electricityRent.deleteMany({
      where: {
        plantId: plant.id,
        month: { in: ELECTRICITY_RENT_SEED.map((r) => parseMonthToUtcDate(r.month)) },
      },
    });

    await tx.electricityRent.createMany({
      data: ELECTRICITY_RENT_SEED.map((r) => {
        const monthDate = parseMonthToUtcDate(r.month);
        return {
          plantId: plant.id,
          month: monthDate,
          openingReading: r.openingReading ?? null,
          closingReading: r.closingReading ?? null,
          consumedUnits: r.consumedUnits ?? null,
          billAmount: r.billAmount,
          rentAmount: r.rentAmount,
          notes: r.notes ?? null,
        };
      }),
    });
  });

  // Stock is seeded from the inward + closing registers via scripts/seed-pvc-stock-rent.ts.

  // Seed: Depreciation (fixed assets)
  await prisma.$transaction(async (tx) => {
    await tx.fixedAsset.deleteMany({
      where: { plantId: plant.id, assetDescription: DEPRECIATION_ASSET_DESC },
    });

    await tx.fixedAsset.create({
      data: {
        plantId: plant.id,
        assetDescription: DEPRECIATION_ASSET_DESC,
        vendor: null,
        billNumber: null,
        billDate: null,
        cost: 1_918_113.0,
        gst: 0,
        depreciationPercent: 18.10,
      },
    });
  });

  const [expenseCheck] = await Promise.all([
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
  console.log("Expenses:", expenseCheck);
  console.log("Petty cash only:", pettyCashCheck);

  const checks: Array<[string, number, number, number]> = [
    ["expense rows", expenseCheck._count, expenses.length, 0],
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
      "petty cash amount",
      Number(expenseCheck._sum.amount),
      expenses.reduce((sum, e) => sum + Number(e.amount ?? 0), 0),
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
