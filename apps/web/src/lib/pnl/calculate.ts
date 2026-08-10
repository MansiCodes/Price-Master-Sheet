import { PurchaseType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export type PlantPnlResult = {
  salesRevenue: number;
  cogs: number;
  manpower: number;
  electricity: number;
  rent: number;
  pettyCash: number;
  depreciation: number;
  grossProfit: number;
  netProfit: number;
};

const COGS_PURCHASE_TYPES: PurchaseType[] = [
  PurchaseType.RAW_MATERIAL,
  PurchaseType.PACKING,
  PurchaseType.CONSUMABLE,
];

function toNumber(value: Prisma.Decimal | number | null | undefined): number {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  return Number(value.toString());
}

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function daysInclusive(from: Date, to: Date): number {
  const ms = startOfUtcDay(to).getTime() - startOfUtcDay(from).getTime();
  return Math.max(1, Math.floor(ms / 86_400_000) + 1);
}

function monthStartsInRange(from: Date, to: Date): Date[] {
  const months: Date[] = [];
  let cursor = new Date(
    Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1),
  );
  const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), 1));

  while (cursor.getTime() <= end.getTime()) {
    months.push(new Date(cursor));
    cursor = new Date(
      Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1),
    );
  }
  return months;
}

/** Latest closing stock value per item as of a given date (inclusive). */
async function stockValueAsOf(plantId: string, asOf: Date): Promise<number> {
  const entries = await prisma.stockEntry.findMany({
    where: {
      plantId,
      date: { lte: asOf },
    },
    orderBy: [{ itemName: "asc" }, { date: "desc" }, { createdAt: "desc" }],
    select: {
      itemName: true,
      closingValue: true,
    },
  });

  const latestByItem = new Map<string, number>();
  for (const entry of entries) {
    if (!latestByItem.has(entry.itemName)) {
      latestByItem.set(entry.itemName, toNumber(entry.closingValue));
    }
  }

  let total = 0;
  for (const value of latestByItem.values()) {
    total += value;
  }
  return total;
}

export async function calculatePlantPnl(
  plantId: string,
  fromDate: Date,
  toDate: Date,
): Promise<PlantPnlResult> {
  const from = startOfUtcDay(fromDate);
  const to = startOfUtcDay(toDate);

  if (from.getTime() > to.getTime()) {
    throw new Error("fromDate must be on or before toDate");
  }

  const dayBeforeFrom = addUtcDays(from, -1);
  const periodDays = daysInclusive(from, to);
  const months = monthStartsInRange(from, to);

  const [
    salesAgg,
    purchaseAgg,
    manpowerAgg,
    pettyEntries,
    electricityRows,
    fixedAssets,
    openingStock,
    closingStock,
  ] = await Promise.all([
    prisma.sale.aggregate({
      where: { plantId, date: { gte: from, lte: to } },
      _sum: { salesValue: true },
    }),
    prisma.purchase.aggregate({
      where: {
        plantId,
        date: { gte: from, lte: to },
        type: { in: COGS_PURCHASE_TYPES },
      },
      _sum: { basicValue: true },
    }),
    prisma.manpowerEntry.aggregate({
      where: { plantId, date: { gte: from, lte: to } },
      _sum: { totalCost: true },
    }),
    prisma.pettyCashEntry.findMany({
      where: { plantId, date: { gte: from, lte: to } },
      select: {
        amount: true,
        contractorSalary: true,
        supervisorSalary: true,
      },
    }),
    prisma.electricityRent.findMany({
      where: {
        plantId,
        month: { in: months },
      },
      select: {
        billAmount: true,
        rentAmount: true,
      },
    }),
    prisma.fixedAsset.findMany({
      where: { plantId },
      select: {
        cost: true,
        depreciationPercent: true,
      },
    }),
    stockValueAsOf(plantId, dayBeforeFrom),
    stockValueAsOf(plantId, to),
  ]);

  const salesRevenue = toNumber(salesAgg._sum.salesValue);
  const purchasesCogs = toNumber(purchaseAgg._sum.basicValue);
  const cogs = openingStock + purchasesCogs - closingStock;
  const manpower = toNumber(manpowerAgg._sum.totalCost);

  const pettyCash = pettyEntries.reduce((sum, row) => {
    return (
      sum +
      toNumber(row.amount) +
      toNumber(row.contractorSalary) +
      toNumber(row.supervisorSalary)
    );
  }, 0);

  const electricity = electricityRows.reduce(
    (sum, row) => sum + toNumber(row.billAmount),
    0,
  );
  const rent = electricityRows.reduce(
    (sum, row) => sum + toNumber(row.rentAmount),
    0,
  );

  const depreciation = fixedAssets.reduce((sum, asset) => {
    const annual =
      toNumber(asset.cost) * (toNumber(asset.depreciationPercent) / 100);
    return sum + (annual * periodDays) / 365;
  }, 0);

  const grossProfit = salesRevenue - cogs;
  const netProfit =
    grossProfit - manpower - electricity - rent - pettyCash - depreciation;

  const round2 = (n: number) => Math.round(n * 100) / 100;

  return {
    salesRevenue: round2(salesRevenue),
    cogs: round2(cogs),
    manpower: round2(manpower),
    electricity: round2(electricity),
    rent: round2(rent),
    pettyCash: round2(pettyCash),
    depreciation: round2(depreciation),
    grossProfit: round2(grossProfit),
    netProfit: round2(netProfit),
  };
}
