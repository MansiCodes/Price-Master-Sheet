import { prisma } from "@/lib/db";
import { CAT6_PNL_ONLY_STOCK_ITEMS } from "@/lib/plant-layout";
import type { PlantPnlStatement, PnlStatementLine } from "@/lib/pnl/types";
import { plantIdFilter } from "@/lib/plant-merge";
import {
  CAT6_EXCEL_PURCHASES_TO,
  CAT6_EXCEL_SALES_TO,
  COGS_PURCHASE_TYPES,
  getApprovedFilter,
  line,
  monthStartsInRange,
  ratioOf,
  round2,
  toNumber,
} from "./helpers";
import { openingStockFromLastSnapshot, stockValueAsOf } from "./stock";

export async function buildCat6Dynamic(
  plantIds: string[],
  from: Date,
  to: Date,
  scoped: boolean,
  enteredById?: string,
  approvedOnly?: boolean,
): Promise<PlantPnlStatement> {
  const byUser = enteredById ? { enteredById } : {};
  const farMonths = Math.max(1, monthStartsInRange(from, to).length);

  const isExcelCat6Period =
    to.getUTCFullYear() === 2026 && to.getUTCMonth() === 4 && to.getUTCDate() === 22;
  const salesTo = isExcelCat6Period ? CAT6_EXCEL_SALES_TO : to;
  const purchasesTo = isExcelCat6Period ? CAT6_EXCEL_PURCHASES_TO : to;

  const approvedFilter = await getApprovedFilter(plantIds, approvedOnly, from, to);
  const salesApprovedFilter = await getApprovedFilter(plantIds, approvedOnly, from, salesTo);
  const purchasesApprovedFilter = await getApprovedFilter(
    plantIds,
    approvedOnly,
    from,
    purchasesTo,
  );
  const globalApprovedFilter = await getApprovedFilter(plantIds, approvedOnly);

  const [
    salesAgg,
    purchaseAgg,
    pettyEntries,
    openingStockRow,
    openingStockEntered,
    fixedAssets,
  ] = await Promise.all([
      prisma.sale.aggregate({
        where: {
          ...plantIdFilter(plantIds),
          ...byUser,
          date: { gte: from, lte: salesTo },
          ...salesApprovedFilter,
        },
        _sum: { salesValue: true },
      }),
      prisma.purchase.aggregate({
        where: {
          ...plantIdFilter(plantIds),
          ...byUser,
          date: { gte: from, lte: purchasesTo },
          type: { in: COGS_PURCHASE_TYPES },
          ...purchasesApprovedFilter,
        },
        _sum: { basicValue: true },
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
        },
      }),
      scoped
        ? Promise.resolve(null)
        : prisma.stockEntry.findFirst({
            where: {
              ...plantIdFilter(plantIds),
              itemName: CAT6_PNL_ONLY_STOCK_ITEMS[0],
              date: { lte: to },
              ...globalApprovedFilter,
            },
            orderBy: [{ date: "desc" }, { createdAt: "desc" }],
            select: { closingValue: true },
          }),
      scoped
        ? Promise.resolve(0)
        : openingStockFromLastSnapshot(plantIds, from, approvedOnly, globalApprovedFilter),
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
    ]);

  const salesRevenue = round2(toNumber(salesAgg._sum.salesValue));
  const purchases = round2(toNumber(purchaseAgg._sum.basicValue));
  const openingStockFromEntry = round2(toNumber(openingStockRow?.closingValue));
  const openingStockSnap = round2(openingStockEntered);
  // Opening stock = last closing snapshot before period (or legacy entry)
  const openingStock = openingStockSnap > 0 ? openingStockSnap : openingStockFromEntry;
  const latestClosingDateRow = (scoped || openingStockSnap > 0)
    ? null
    : await prisma.stockEntry.findFirst({
        where: {
          ...plantIdFilter(plantIds),
          date: { lte: to },
          itemName: { not: CAT6_PNL_ONLY_STOCK_ITEMS[0] },
          ...globalApprovedFilter,
        },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        select: { date: true },
      });
  const closingStockAgg =
    (scoped || openingStockSnap > 0 || !latestClosingDateRow)
      ? { _sum: { closingValue: 0 } }
      : await prisma.stockEntry.aggregate({
          where: {
            ...plantIdFilter(plantIds),
            date: latestClosingDateRow.date,
            itemName: { not: CAT6_PNL_ONLY_STOCK_ITEMS[0] },
            ...globalApprovedFilter,
          },
          _sum: { closingValue: true },
        });
  const closingStockFallback = round2(toNumber(closingStockAgg._sum.closingValue));
  const closingStockLogged = await stockValueAsOf(plantIds, to, approvedOnly, globalApprovedFilter);
  const closingStock = closingStockLogged > 0
    ? round2(closingStockLogged)
    : openingStockSnap > 0
      ? Math.max(0, round2(openingStock + purchases - salesRevenue))
      : closingStockFallback;
  const pettyCash = round2(
    pettyEntries.reduce((sum, row) => {
      if (row.entryType !== "PETTY_CASH") return sum;
      return (
        sum +
        toNumber(row.amount) +
        toNumber(row.contractorSalary) +
        toNumber(row.supervisorSalary)
      );
    }, 0),
  );
  const salaryBase = round2(
    pettyEntries.reduce((sum, row) => {
      if (row.entryType !== "EXPENSE") return sum;
      return (
        sum +
        toNumber(row.amount) +
        toNumber(row.contractorSalary) +
        toNumber(row.supervisorSalary)
      );
    }, 0),
  );
  const manpower = round2(salaryBase * 0.7);
  // Depreciation = Σ (asset cost × dep% × months / 12) — same formula as PVC FAR
  const depreciation = round2(
    fixedAssets.reduce((sum, asset) => {
      const annual =
        toNumber(asset.cost) * (toNumber(asset.depreciationPercent) / 100);
      return sum + (annual * farMonths) / 12;
    }, 0),
  );
  // Interest on TL from FAR invoice basis × 12% × months/12 (confirm rate if different)
  const maxInvoiceBasis = fixedAssets.reduce((maxBasis, asset) => {
    const invoiceBasis =
      toNumber(asset.invoiceValue) > 0
        ? toNumber(asset.invoiceValue)
        : toNumber(asset.cost) + toNumber(asset.gst);
    return Math.max(maxBasis, invoiceBasis);
  }, 0);
  const interestOnTl = round2(maxInvoiceBasis * 0.12 * (farMonths / 12));
  const variableCost = round2(salesRevenue * 0.01);
  const electricity = 0;
  const rent = 0;
  const cogs = round2(openingStock + purchases - closingStock);
  const grossProfit = round2(salesRevenue - cogs - pettyCash);
  const profitBeforeTax = round2(
    grossProfit - manpower - depreciation - interestOnTl - variableCost,
  );
  const incomeTax = 0;
  const netProfit = round2(profitBeforeTax);
  const salesBase = salesRevenue;

  const tradingDebit: PnlStatementLine[] = [
    line("OPENING STOCK", openingStock || null, openingStock ? ratioOf(openingStock, salesBase) : null, "header"),
    line("PURCHASES ACCOUNT", purchases || null, purchases ? ratioOf(purchases, salesBase) : null, "header"),
    line("DIRECT EXPENSES", null, null, "header"),
    line("PETTY CASH EXP", pettyCash || null, pettyCash ? ratioOf(pettyCash, salesBase) : null, "item"),
    line("GROSS PROFIT", grossProfit > 0 ? grossProfit : null, grossProfit > 0 ? ratioOf(grossProfit, salesBase) : null, "profit"),
  ];
  const tradingCredit: PnlStatementLine[] = [
    line("CLOSING STOCK", closingStock || null, closingStock ? ratioOf(closingStock, salesBase) : null, "header"),
    line("SALES ACCOUNT", salesRevenue || null, salesRevenue ? 100 : null, "header"),
    line("(Inc.Online Sale & ATCL)", null, null, "item"),
  ];
  const indirectDebit: PnlStatementLine[] = [
    line("INDIRECT EXPENSES", null, null, "header"),
    line("WAGES & SALARY EXP", manpower || null, manpower ? ratioOf(manpower, salesBase) : null, "item"),
    line("DEPRECIATION", depreciation || null, depreciation ? ratioOf(depreciation, salesBase) : null, "item"),
    line("INTEREST ON TL", interestOnTl || null, interestOnTl ? ratioOf(interestOnTl, salesBase) : null, "item"),
    line("VARIABLE COST@1%", variableCost || null, variableCost ? ratioOf(variableCost, salesBase) : null, "item"),
    line("NET PROFIT", netProfit !== 0 ? netProfit : null, netProfit !== 0 ? ratioOf(Math.abs(netProfit), salesBase) : null, "profit"),
  ];
  const indirectCredit: PnlStatementLine[] = [
    line("GROSS PROFIT", grossProfit > 0 ? grossProfit : null, grossProfit > 0 ? ratioOf(grossProfit, salesBase) : null, "profit"),
  ];

  return {
    salesRevenue,
    cogs,
    manpower,
    electricity,
    rent,
    pettyCash,
    depreciation,
    grossProfit,
    netProfit,
    openingStock,
    closingStock,
    purchases,
    incomeTax,
    profitBeforeTax,
    trading: { debit: tradingDebit, credit: tradingCredit, total: round2(closingStock + salesRevenue) },
    indirect: {
      debit: indirectDebit,
      credit: indirectCredit,
      total: round2(grossProfit > 0 ? grossProfit : Math.abs(netProfit) + manpower + depreciation + interestOnTl + variableCost),
    },
  };
}
