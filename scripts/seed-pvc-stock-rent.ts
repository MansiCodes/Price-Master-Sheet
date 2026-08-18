import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(__dirname, "../.env"), override: true });

import { ManpowerShift, Prisma, StockCategory } from "@prisma/client";
import { prisma } from "../src/lib/db";

const CLOSING_DATE = new Date("2026-08-05T00:00:00Z");
const EXPECTED_INWARD_QTY = 39_415.53;
const EXPECTED_INWARD_VALUE = 1_261_296.96;
const EXPECTED_CLOSING_VALUE = 1_921_136.19;

const MONTHS: Record<string, number> = {
  Jan: 1,
  Feb: 2,
  Mar: 3,
  Apr: 4,
  May: 5,
  Jun: 6,
  Jul: 7,
  Aug: 8,
  Sep: 9,
  Oct: 10,
  Nov: 11,
  Dec: 12,
};

/** item|challan|date|unit|qty|rate|value */
const INWARD_ROWS = `
Lump+Cable|001|30-Jan-26|KGS|900.25|32|28808
Lump+Cable|002|31-Jan-26|KGS|416.85|32|13339.20
Lump+Cable|003|1-Feb-26|KGS|192.60|32|6163.20
Lump+Cable|001|9-Feb-26|KGS|267.30|32|8553.60
Lump+Cable|002|11-Feb-26|KGS|462.90|32|14812.80
Lump+Cable|003|13-Feb-26|KGS|1255.00|32|40160
Lump+Cable|004|18-Feb-26|KGS|740.00|32|23680
Lump+Cable|005|19-Feb-26|KGS|150.00|32|4800
Lump+Cable|006|23-Feb-26|KGS|135.00|32|4320
Lump+Cable|007|24-Feb-26|KGS|772.00|32|24704
Lump+Cable|009|26-Feb-26|KGS|506.00|32|16192
Lump+Cable|010|28-Feb-26|KGS|565.00|32|18080
Lump+Cable|011|5-Mar-26|KGS|220.00|32|7040
Lump+Cable|012|9-Mar-26|KGS|317.00|32|10144
Lump+Cable|013|10-Mar-26|KGS|336.00|32|10752
Lump+Cable|015|11-Mar-26|KGS|295.00|32|9440
Lump+Cable|016|12-Mar-26|KGS|268.00|32|8576
Lump+Cable|017|14-Mar-26|KGS|6400.00|32|204800
Lump+Cable|018|14-Mar-26|KGS|55.00|32|1760
Lump+Cable|019|3-Apr-26|KGS|3048.00|32|97536
Lump+Cable|020|23-Apr-26|KGS|258.40|32|8268.80
Lump+Cable|021|24-Apr-26|KGS|232.70|32|7446.40
Lump+Cable|022|30-Apr-26|KGS|1320.00|32|42240
Lump+Cable|023|9-May-26|KGS|785.00|32|25120
Lump+Cable|024|12-May-26|KGS|1131.00|32|36192
Lump+Cable|025|22-May-26|KGS|601.30|32|19241.60
Lump+Cable|026|28-May-26|KGS|700.00|32|22400
Lump+Cable|027|30-May-26|KGS|1134.91|32|36317.12
Lump+Cable|028|3-Jun-26|KGS|819.05|32|26209.60
Lump+Cable|029|8-Jun-26|KGS|1877.16|32|60069.12
Lump+Cable|030|10-Jun-26|KGS|345.00|32|11040
Lump+Cable|031|18-Jun-26|KGS|801.60|32|25651.20
Lump+Cable|032|26-Jun-26|KGS|2303.61|32|73715.52
Lump+Cable|033|25-Jun-26|KGS|615.70|32|19702.40
Lump+Cable|034|29-Jun-26|KGS|918.30|32|29385.60
Lump+Cable|035|30-Jun-26|KGS|340.00|32|10880
Lump+Cable|036|6-Jul-26|KGS|2567.00|32|82144
Lump+Cable|037|15-Jul-26|KGS|1725.40|32|55212.80
Lump+Cable|038|22-Jul-26|KGS|1699.00|32|54368
Lump+Cable|039|3-Aug-26|KGS|98.50|32|3152
Lump+Cable|040|4-Aug-26|KGS|1840.00|32|58880
`.trim();

const CLOSING_STOCK: {
  category: StockCategory;
  itemName: string;
  quantity: number;
  rate: number;
  closingValue: number;
}[] = [
  { category: StockCategory.RM, itemName: "CPW", quantity: 10_500, rate: 70, closingValue: 735_000 },
  { category: StockCategory.RM, itemName: "Thermal", quantity: 6_812, rate: 18.6, closingValue: 126_703.2 },
  { category: StockCategory.RM, itemName: "Calcium", quantity: 205, rate: 7.75, closingValue: 1_588.75 },
  { category: StockCategory.RM, itemName: "Titanium Di Oxide", quantity: 198.5, rate: 280, closingValue: 55_580 },
  { category: StockCategory.RM, itemName: "WAX/MOM", quantity: 33.9, rate: 115, closingValue: 3_898.5 },
  { category: StockCategory.RM, itemName: "Carbon", quantity: 278.3, rate: 120, closingValue: 33_396 },
  { category: StockCategory.RM, itemName: "Other Colors (Red)", quantity: 21.3, rate: 550, closingValue: 11_715 },
  { category: StockCategory.RM, itemName: "Other Colors (Blue)", quantity: 19.3, rate: 780, closingValue: 15_054 },
  { category: StockCategory.RM, itemName: "Pani Pipe", quantity: 14_810, rate: 35, closingValue: 518_350 },
  { category: StockCategory.RM, itemName: "Green Pipe", quantity: 1_988, rate: 35.48, closingValue: 70_534.24 },
  { category: StockCategory.RM, itemName: "S. Cilies", quantity: 3_455, rate: 39.5, closingValue: 136_472.5 },
  { category: StockCategory.RM, itemName: "Lump+Cable", quantity: 4_594.5, rate: 32, closingValue: 147_024 },
  { category: StockCategory.RM, itemName: "H. Cilies", quantity: 750, rate: 33, closingValue: 24_750 },
  { category: StockCategory.RM, itemName: "JHAL Plastic Scrap", quantity: 1_110, rate: 37, closingValue: 41_070 },
];

const RENT_SEED: {
  month: string;
  coveredAreaSqft: number | null;
  rentRatePerSqft: number;
  rentAmount: number;
  notes: string | null;
}[] = [
  { month: "2026-01", coveredAreaSqft: 0, rentRatePerSqft: 12, rentAmount: 0, notes: "0 SQFT @ 12.00" },
  { month: "2026-02", coveredAreaSqft: 2_000, rentRatePerSqft: 12, rentAmount: 24_000, notes: "2000 SQFT @ 12.00" },
  { month: "2026-03", coveredAreaSqft: 2_000, rentRatePerSqft: 12, rentAmount: 24_000, notes: "2000 SQFT @ 12.00" },
  { month: "2026-04", coveredAreaSqft: 2_000, rentRatePerSqft: 12, rentAmount: 24_000, notes: "2000 SQFT @ 12.00" },
  { month: "2026-05", coveredAreaSqft: 2_000, rentRatePerSqft: 12, rentAmount: 24_000, notes: "2000 SQFT @ 12.00" },
  { month: "2026-06", coveredAreaSqft: 2_000, rentRatePerSqft: 12, rentAmount: 24_000, notes: "2000 SQFT @ 12.00" },
  { month: "2026-07", coveredAreaSqft: 2_000, rentRatePerSqft: 12, rentAmount: 24_000, notes: "2000 SQFT @ 12.00" },
  { month: "2026-08", coveredAreaSqft: 2_000, rentRatePerSqft: 12, rentAmount: 24_000, notes: "2000 SQFT @ 12.00; Till 05-08-26" },
  { month: "2026-09", coveredAreaSqft: null, rentRatePerSqft: 12, rentAmount: 0, notes: null },
  { month: "2026-10", coveredAreaSqft: null, rentRatePerSqft: 12, rentAmount: 0, notes: null },
  { month: "2026-11", coveredAreaSqft: null, rentRatePerSqft: 12, rentAmount: 0, notes: null },
  { month: "2026-12", coveredAreaSqft: null, rentRatePerSqft: 12, rentAmount: 0, notes: null },
  { month: "2027-01", coveredAreaSqft: null, rentRatePerSqft: 12, rentAmount: 0, notes: null },
  { month: "2027-02", coveredAreaSqft: null, rentRatePerSqft: 12, rentAmount: 0, notes: null },
  { month: "2027-03", coveredAreaSqft: null, rentRatePerSqft: 12, rentAmount: 0, notes: null },
];

function parseBillDate(text: string): Date {
  const match = /^(\d{1,2})-([A-Za-z]{3})-(\d{2})$/.exec(text.trim());
  if (!match) throw new Error(`Invalid bill date: ${text}`);
  const day = Number(match[1]);
  const month = MONTHS[match[2]];
  const year = 2000 + Number(match[3]);
  if (!month) throw new Error(`Invalid month: ${text}`);
  return new Date(Date.UTC(year, month - 1, day));
}

function parseMonth(month: string): Date {
  const m = /^(\d{4})-(\d{2})$/.exec(month.trim());
  if (!m) throw new Error(`Invalid month: ${month}`);
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1));
}

async function main() {
  const inward: Prisma.StockEntryCreateManyInput[] = [];
  for (const [index, line] of INWARD_ROWS.split("\n").entries()) {
    const parts = line.split("|");
    if (parts.length !== 7) {
      throw new Error(`Inward row ${index + 1} has ${parts.length} columns`);
    }
    const [itemName, challan, dateText, unit, qtyText, rateText, valueText] = parts;
    const quantity = Number(qtyText);
    const rate = Number(rateText);
    const closingValue = Number(valueText);
    const computed = Math.round(quantity * rate * 100) / 100;
    if (Math.abs(computed - closingValue) > 0.011) {
      throw new Error(
        `Inward row ${index + 1} qty*rate mismatch: ${quantity}*${rate}=${computed} vs ${closingValue}`,
      );
    }
    inward.push({
      plantId: "",
      date: parseBillDate(dateText),
      shift: ManpowerShift.DAY,
      itemName,
      category: StockCategory.RM,
      unit,
      quantity,
      rate,
      closingValue,
      notes: challan,
      enteredById: "",
      isBackdated: true,
      createdAt: new Date(Date.UTC(2026, 0, 1, 8, 0, 0) + index * 1000),
    });
  }

  const inwardQty = inward.reduce((sum, r) => sum + Number(r.quantity), 0);
  const inwardValue = inward.reduce((sum, r) => sum + Number(r.closingValue), 0);
  if (Math.abs(inwardQty - EXPECTED_INWARD_QTY) > 0.001) {
    throw new Error(`Inward qty ${inwardQty} != ${EXPECTED_INWARD_QTY}`);
  }
  if (Math.abs(inwardValue - EXPECTED_INWARD_VALUE) > 0.001) {
    throw new Error(`Inward value ${inwardValue} != ${EXPECTED_INWARD_VALUE}`);
  }

  const closingValueTotal = CLOSING_STOCK.reduce((sum, r) => sum + r.closingValue, 0);
  if (Math.abs(closingValueTotal - EXPECTED_CLOSING_VALUE) > 0.001) {
    throw new Error(`Closing value ${closingValueTotal} != ${EXPECTED_CLOSING_VALUE}`);
  }

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

  await prisma.$executeRawUnsafe(
    `ALTER TABLE "ElectricityRent" ADD COLUMN IF NOT EXISTS "coveredAreaSqft" DECIMAL(18,2)`,
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "ElectricityRent" ADD COLUMN IF NOT EXISTS "rentRatePerSqft" DECIMAL(18,4)`,
  );

  const closing: Prisma.StockEntryCreateManyInput[] = CLOSING_STOCK.map((row, index) => ({
    plantId: plant.id,
    date: CLOSING_DATE,
    shift: ManpowerShift.DAY,
    itemName: row.itemName,
    category: row.category,
    unit: "KGS",
    quantity: row.quantity,
    rate: row.rate,
    closingValue: row.closingValue,
    notes: "Closing stock as on 05-Aug-26",
    enteredById: actor.id,
    isBackdated: true,
    createdAt: new Date(Date.UTC(2026, 7, 5, 18, 0, 0) + index * 1000),
  }));

  for (const row of inward) {
    row.plantId = plant.id;
    row.enteredById = actor.id;
  }

  const deletedStock = await prisma.$transaction(async (tx) => {
    const removed = await tx.stockEntry.deleteMany({ where: { plantId: plant.id } });
    await tx.stockEntry.createMany({ data: [...inward, ...closing] });
    return removed.count;
  });

  for (const row of RENT_SEED) {
    const month = parseMonth(row.month);
    const existing = await prisma.electricityRent.findUnique({
      where: { plantId_month: { plantId: plant.id, month } },
    });
    if (existing) {
      await prisma.electricityRent.update({
        where: { id: existing.id },
        data: {
          rentAmount: row.rentAmount,
          coveredAreaSqft: row.coveredAreaSqft,
          rentRatePerSqft: row.rentRatePerSqft,
        },
      });
    } else {
      await prisma.electricityRent.create({
        data: {
          plantId: plant.id,
          month,
          rentAmount: row.rentAmount,
          coveredAreaSqft: row.coveredAreaSqft,
          rentRatePerSqft: row.rentRatePerSqft,
          billAmount: 0,
          notes: row.notes,
        },
      });
    }
  }

  const stockCheck = await prisma.stockEntry.aggregate({
    where: { plantId: plant.id },
    _count: true,
    _sum: { quantity: true, closingValue: true },
  });
  const inwardCheck = await prisma.stockEntry.aggregate({
    where: { plantId: plant.id, notes: { not: { startsWith: "Closing stock" } } },
    _count: true,
    _sum: { quantity: true, closingValue: true },
  });
  const closingCheck = await prisma.stockEntry.aggregate({
    where: { plantId: plant.id, date: CLOSING_DATE, notes: { startsWith: "Closing stock" } },
    _count: true,
    _sum: { closingValue: true },
  });
  const rentCheck = await prisma.electricityRent.aggregate({
    where: {
      plantId: plant.id,
      month: { in: RENT_SEED.map((r) => parseMonth(r.month)) },
    },
    _sum: { rentAmount: true },
  });

  if (inwardCheck._count !== inward.length) {
    throw new Error(`Inward DB count ${inwardCheck._count} != ${inward.length}`);
  }
  if (closingCheck._count !== CLOSING_STOCK.length) {
    throw new Error(`Closing DB count ${closingCheck._count} != ${CLOSING_STOCK.length}`);
  }
  if (Math.abs(Number(inwardCheck._sum.quantity) - EXPECTED_INWARD_QTY) > 0.001) {
    throw new Error(`DB inward qty mismatch`);
  }
  if (Math.abs(Number(inwardCheck._sum.closingValue) - EXPECTED_INWARD_VALUE) > 0.001) {
    throw new Error(`DB inward value mismatch`);
  }
  if (Math.abs(Number(closingCheck._sum.closingValue) - EXPECTED_CLOSING_VALUE) > 0.001) {
    throw new Error(`DB closing value mismatch`);
  }

  console.log(`PVC stock + rent replaced in ${plant.name} as ${actor.email}`);
  console.log(`  Deleted old stock rows: ${deletedStock}`);
  console.log(`  Inward rows: ${inwardCheck._count}  qty ${Number(inwardCheck._sum.quantity).toLocaleString("en-IN")}  value ${Number(inwardCheck._sum.closingValue).toLocaleString("en-IN")}`);
  console.log(`  Closing rows (05-Aug-26): ${closingCheck._count}  value ${Number(closingCheck._sum.closingValue).toLocaleString("en-IN")}`);
  console.log(`  Stock total rows: ${stockCheck._count}`);
  console.log(`  Rent Feb–Aug: ${Number(rentCheck._sum.rentAmount).toLocaleString("en-IN")}`);
}

main()
  .catch((error) => {
    console.error("PVC stock/rent seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
