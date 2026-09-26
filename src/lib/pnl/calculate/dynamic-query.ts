import { prisma } from "@/lib/db";
import { atclStockEntryFilter } from "@/lib/plant-catalogs";
import { plantIdFilter } from "@/lib/plant-merge";
import {
  COGS_PURCHASE_TYPES,
  addUtcDays,
  daysInclusive,
  getApprovedFilter,
  monthStartsInRange,
} from "./helpers";
import { openingStockFromLastSnapshot, stockValueAsOf } from "./stock";

export async function fetchDynamicInputs(
  plantIds: string[],
  from: Date,
  to: Date,
  scoped: boolean,
  enteredById?: string,
  plantCode?: string | null,
  approvedOnly?: boolean,
) {
  const isPvc = plantCode?.toUpperCase() === "PVC";
  const byUser = enteredById ? { enteredById } : {};
  const dayBeforeFrom = addUtcDays(from, -1);
  const periodDays = daysInclusive(from, to);
  const months = monthStartsInRange(from, to);
  const pvcFarMonths = isPvc
    ? Math.max(
        1,
        months.filter(
          (m) =>
            m.getUTCFullYear() === 2026 && m.getUTCMonth() >= 1,
        ).length,
      )
    : Math.max(1, months.length);

  const approvedFilter = await getApprovedFilter(plantIds, approvedOnly, from, to);
  const globalApprovedFilter = await getApprovedFilter(plantIds, approvedOnly);

  const [
    salesAgg,
    purchaseRowsScoped,
    purchaseQtyAgg,
    stockInwardAgg,
    manpowerAgg,
    pettyEntries,
    electricityRows,
    fixedAssets,
    openingStockRaw,
    closingStockRaw,
    openingStockManualRaw,
  ] = await Promise.all([
    prisma.sale.aggregate({
      where: {
        ...plantIdFilter(plantIds),
        ...byUser,
        date: { gte: from, lte: to },
        ...approvedFilter,
      },
      _sum: { salesValue: true },
    }),
    prisma.purchase.findMany({
      where: {
        ...plantIdFilter(plantIds),
        ...byUser,
        date: { gte: from, lte: to },
        type: { in: COGS_PURCHASE_TYPES },
        ...approvedFilter,
      },
      select: { basicValue: true, vendorName: true, notes: true },
    }),
    prisma.purchase.aggregate({
      where: {
        ...plantIdFilter(plantIds),
        ...byUser,
        date: { gte: from, lte: to },
        ...approvedFilter,
      },
      _sum: { quantity: true },
    }),
    scoped
      ? Promise.resolve({ _sum: { closingValue: null } })
      : prisma.stockEntry.aggregate({
          where: {
            ...plantIdFilter(plantIds),
            date: { gte: from, lte: to },
            ...atclStockEntryFilter(),
            ...approvedFilter,
          },
          _sum: { closingValue: true },
        }),
    prisma.manpowerEntry.aggregate({
      where: {
        ...plantIdFilter(plantIds),
        ...byUser,
        date: { gte: from, lte: to },
      },
      _sum: { totalCost: true },
    }),
    prisma.pettyCashEntry.findMany({
      where: {
        ...plantIdFilter(plantIds),
        ...byUser,
        date: { gte: from, lte: to },
        ...approvedFilter,
      },
      select: {
        entryType: true,
        amount: true,
        contractorSalary: true,
        supervisorSalary: true,
        expenseHead: true,
        nature: true,
        payMode: true,
        description: true,
      },
    }),
    scoped
      ? Promise.resolve([])
      : prisma.electricityRent.findMany({
          where: {
            ...plantIdFilter(plantIds),
            month: { in: months },
          },
          select: {
            billAmount: true,
            rentAmount: true,
          },
        }),
    scoped
      ? Promise.resolve([])
      : prisma.fixedAsset.findMany({
          where: { ...plantIdFilter(plantIds) },
          select: {
            cost: true,
            gst: true,
            invoiceValue: true,
            depreciationPercent: true,
          },
        }),
    scoped
      ? Promise.resolve(0)
      : stockValueAsOf(plantIds, dayBeforeFrom, approvedOnly, globalApprovedFilter),
    scoped
      ? Promise.resolve(0)
      : stockValueAsOf(plantIds, to, approvedOnly, globalApprovedFilter),
    scoped
      ? Promise.resolve(0)
      : openingStockFromLastSnapshot(plantIds, from, approvedOnly, globalApprovedFilter),
  ]);

  return {
    isPvc,
    periodDays,
    pvcFarMonths,
    salesAgg,
    purchaseRowsScoped,
    purchaseQtyAgg,
    stockInwardAgg,
    manpowerAgg,
    pettyEntries,
    electricityRows,
    fixedAssets,
    openingStockRaw,
    closingStockRaw,
    openingStockManualRaw,
  };
}

export type DynamicInputs = Awaited<ReturnType<typeof fetchDynamicInputs>>;
