import { PettyCashKind } from "@prisma/client";
import { prisma } from "@/lib/db";
import { isAtclPurchase, atclStockEntryFilter } from "@/lib/plant-catalogs";
import type { PlantPnlStatement } from "@/lib/pnl/types";
import { plantIdFilter } from "@/lib/plant-merge";
import {
  COGS_PURCHASE_TYPES,
  INCOME_TAX_RATE,
  PVC_INCOME_TAX_BASE,
  getApprovedFilter,
  monthStartsInRange,
  round2,
  round4,
  toNumber,
} from "./helpers";
import { assemblePvcStatement } from "./pvc-statement";
import { openingStockFromLastSnapshot, pvcClosingStockSnapshot } from "./stock";

export async function buildPvcDynamic(
  plantIds: string[],
  from: Date,
  to: Date,
  scoped: boolean,
  enteredById?: string,
  approvedOnly?: boolean,
): Promise<PlantPnlStatement> {
  const byUser = enteredById ? { enteredById } : {};
  const months = monthStartsInRange(from, to);
  const pvcFarMonths = Math.max(
    1,
    months.filter(
      (m) => m.getUTCFullYear() === 2026 && m.getUTCMonth() >= 1,
    ).length,
  );

  const approvedFilter = await getApprovedFilter(plantIds, approvedOnly, from, to);
  const globalApprovedFilter = await getApprovedFilter(plantIds, approvedOnly);

  const [
    salesAgg,
    purchaseRows,
    stockInwardAgg,
    pettyEntries,
    electricityRows,
    fixedAssets,
    closingStockRaw,
    openingStockRaw,
  ] = await Promise.all([
    // Excel P&L: Sales!J223 — entire outward register, not date-filtered.
    prisma.sale.aggregate({
      where: { ...plantIdFilter(plantIds), ...byUser, ...globalApprovedFilter },
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
      select: { quantity: true, basicValue: true, vendorName: true, notes: true },
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
        payMode: true,
        description: true,
      },
    }),
    scoped
      ? Promise.resolve([])
      : prisma.electricityRent.findMany({
          where: { ...plantIdFilter(plantIds), month: { in: months } },
          select: { billAmount: true, rentAmount: true },
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
      : pvcClosingStockSnapshot(plantIds, to, approvedOnly, globalApprovedFilter),
    scoped
      ? Promise.resolve(0)
      : openingStockFromLastSnapshot(plantIds, from, approvedOnly, globalApprovedFilter),
  ]);

  void stockInwardAgg;

  const salesRevenue = round2(toNumber(salesAgg._sum.salesValue));
  const vendorPurchaseRows = purchaseRows.filter((row) => !isAtclPurchase(row));
  const atclPurchaseRows = purchaseRows.filter((row) => isAtclPurchase(row));
  const purchasesRaw = vendorPurchaseRows.reduce(
    (sum, row) => sum + toNumber(row.basicValue),
    0,
  );
  const purchases = Math.round(purchasesRaw * 100) / 100;
  const stockFromAtclPurchases = round2(
    atclPurchaseRows.reduce((sum, row) => sum + toNumber(row.basicValue), 0),
  );
  const stockFromAtcl = stockFromAtclPurchases;
  const totalPurchases = round2(purchasesRaw + stockFromAtcl);
  const openingStock = round2(openingStockRaw);
  const closingStockSnapshot = round2(closingStockRaw);
  const closingStock = closingStockSnapshot > 0
    ? closingStockSnapshot
    : (openingStock > 0 || totalPurchases > 0 || salesRevenue > 0)
      ? Math.max(0, round2(openingStock + totalPurchases - salesRevenue))
      : (stockFromAtclPurchases > 0 ? closingStockSnapshot : 0);

  const electricityRentAmount = round2(
    electricityRows.reduce((sum, row) => sum + toNumber(row.billAmount), 0),
  );
  const rentFromElectricityRent = round2(
    electricityRows.reduce((sum, row) => sum + toNumber(row.rentAmount), 0),
  );
  const electricityFromPettyCash = round2(
    pettyEntries
      .filter(
        (r) =>
          r.entryType === PettyCashKind.EXPENSE &&
          (r.expenseHead.trim().toLowerCase() === "electricity" ||
            r.expenseHead.trim().toLowerCase() === "fuel & power" ||
            r.payMode.trim().toLowerCase() === "electricity"),
      )
      .reduce((sum, row) => sum + toNumber(row.amount), 0),
  );
  const rentFromPettyCash = round2(
    pettyEntries
      .filter(
        (r) =>
          r.entryType === PettyCashKind.EXPENSE &&
          /rent/i.test(String(r.description ?? "")) &&
          toNumber(r.amount) > 0,
      )
      .reduce((sum, row) => sum + toNumber(row.amount), 0),
  );
  const electricity =
    electricityRentAmount > 0 ? electricityRentAmount : electricityFromPettyCash;
  const rent =
    rentFromElectricityRent > 0 ? rentFromElectricityRent : rentFromPettyCash;

  // Unloading expense: only use actual logged unloading expense entries (no auto-calculated rate estimate when unentered)
  const unloadingExpense = round2(
    pettyEntries
      .filter(
        (r) =>
          r.entryType === PettyCashKind.EXPENSE &&
          /unloading/i.test(r.expenseHead.trim()),
      )
      .reduce((sum, row) => sum + toNumber(row.amount), 0),
  );

  const pettyCashRows = pettyEntries.filter(
    (r) => r.entryType === PettyCashKind.PETTY_CASH,
  );
  const pettyCashExp = round2(
    pettyCashRows.reduce((sum, row) => sum + toNumber(row.amount), 0),
  );
  const contractorSalary = round2(
    pettyCashRows.reduce((sum, row) => sum + toNumber(row.contractorSalary), 0),
  );
  const supervisorSalary = round2(
    pettyCashRows.reduce((sum, row) => sum + toNumber(row.supervisorSalary), 0),
  );
  const manpower = contractorSalary;

  const directExpenses = round2(electricity + unloadingExpense + manpower);
  const cogs = round2(openingStock + totalPurchases + directExpenses - closingStock);
  const grossProfit = round2(
    salesRevenue + closingStock - openingStock - purchasesRaw - stockFromAtcl - directExpenses,
  );

  const maxInvoiceBasis = fixedAssets.reduce((maxBasis, asset) => {
    const invoiceBasis =
      toNumber(asset.invoiceValue) > 0
        ? toNumber(asset.invoiceValue)
        : toNumber(asset.cost) + toNumber(asset.gst);
    return Math.max(maxBasis, invoiceBasis);
  }, 0);
  const financialCost = round4(maxInvoiceBasis * 0.12 * (pvcFarMonths / 12));
  const depreciation = round4(
    fixedAssets.reduce((sum, asset) => {
      const annual =
        toNumber(asset.cost) * (toNumber(asset.depreciationPercent) / 100);
      return sum + (annual * pvcFarMonths) / 12;
    }, 0),
  );

  const profitBeforeTax = round2(
    grossProfit - rent - pettyCashExp - supervisorSalary - depreciation - financialCost,
  );
  const incomeTax = profitBeforeTax > 0 ? round2(PVC_INCOME_TAX_BASE * INCOME_TAX_RATE) : 0;
  const netProfit = round2(profitBeforeTax - incomeTax);

  return assemblePvcStatement({
    salesRevenue,
    cogs,
    manpower,
    electricity,
    rent,
    pettyCashExp,
    depreciation,
    grossProfit,
    netProfit,
    openingStock,
    closingStock,
    purchases,
    stockFromAtcl,
    totalPurchases,
    unloadingExpense,
    incomeTax,
    profitBeforeTax,
    financialCost,
    supervisorSalary,
  });
}
