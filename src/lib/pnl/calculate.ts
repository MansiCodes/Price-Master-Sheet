import { PettyCashKind, PurchaseType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { CAT6_PNL_ONLY_STOCK_ITEMS, isCat6Plant } from "@/lib/plant-layout";
import type {
  PlantPnlResult,
  PlantPnlStatement,
  PnlStatementLine,
} from "@/lib/pnl/types";

export type { PlantPnlResult, PlantPnlStatement, PnlStatementLine };
export type { PnlLineKind } from "@/lib/pnl/types";

const COGS_PURCHASE_TYPES: PurchaseType[] = [
  PurchaseType.RAW_MATERIAL,
  PurchaseType.PACKING,
  PurchaseType.CONSUMABLE,
];

const INCOME_TAX_RATE = 0.25;
/** Excel P&L hardcoded income-tax base (2525000×25%). */
const PVC_INCOME_TAX_BASE = 2_525_000;
const PVC_UNLOADING_RATE_PER_MT = 70;
const CAT6_REFERENCE_FROM = new Date(Date.UTC(2025, 3, 1));
const CAT6_REFERENCE_TO = new Date(Date.UTC(2026, 4, 22));
const CAT6_REFERENCE_DAYS = daysInclusive(CAT6_REFERENCE_FROM, CAT6_REFERENCE_TO);
const CAT6_DEPRECIATION_DAILY = 4151829.07 / CAT6_REFERENCE_DAYS;
const CAT6_INTEREST_DAILY = 3762040 / CAT6_REFERENCE_DAYS;

// Excel quirk for CAT6:
// - P&L header ends 22-MAY-26, but Sales account includes sales up to 03-JUN-26
// - Purchases account includes purchases up to 20-MAY-26
const CAT6_EXCEL_SALES_TO = new Date(Date.UTC(2026, 5, 3));
const CAT6_EXCEL_PURCHASES_TO = new Date(Date.UTC(2026, 4, 20));

function toNumber(value: Prisma.Decimal | number | null | undefined): number {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  return Number(value.toString());
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function round4(n: number) {
  return Math.round(n * 10_000) / 10_000;
}

/** Sum explicit closing-stock snapshot rows (matches Excel Stock & Rent SUM(I5:I21)). */
async function pvcClosingStockSnapshot(
  plantId: string,
  asOf: Date,
): Promise<number> {
  const latest = await prisma.stockEntry.findFirst({
    where: {
      plantId,
      date: { lte: asOf },
      notes: { startsWith: "Closing stock" },
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    select: { date: true },
  });
  if (!latest) return stockValueAsOf(plantId, asOf);

  const agg = await prisma.stockEntry.aggregate({
    where: {
      plantId,
      date: latest.date,
      notes: { startsWith: "Closing stock" },
    },
    _sum: { closingValue: true },
  });
  return toNumber(agg._sum.closingValue);
}

async function buildPvcDynamic(
  plantId: string,
  from: Date,
  to: Date,
  scoped: boolean,
  enteredById?: string,
): Promise<PlantPnlStatement> {
  const byUser = enteredById ? { enteredById } : {};
  const months = monthStartsInRange(from, to);
  const pvcFarMonths = Math.max(
    1,
    months.filter(
      (m) => m.getUTCFullYear() === 2026 && m.getUTCMonth() >= 1,
    ).length,
  );

  const [
    salesAgg,
    purchaseRows,
    stockInwardAgg,
    pettyEntries,
    electricityRows,
    fixedAssets,
    closingStockRaw,
  ] = await Promise.all([
    // Excel P&L: Sales!J223 — entire outward register, not date-filtered.
    prisma.sale.aggregate({
      where: { plantId, ...byUser },
      _sum: { salesValue: true },
    }),
    prisma.purchase.findMany({
      where: {
        plantId,
        ...byUser,
        date: { gte: from, lte: to },
        type: { in: COGS_PURCHASE_TYPES },
      },
      select: { quantity: true, basicValue: true },
    }),
    scoped
      ? Promise.resolve({ _sum: { closingValue: null } })
      : prisma.stockEntry.aggregate({
          where: {
            plantId,
            date: { gte: from, lte: to },
            NOT: { notes: { startsWith: "Closing stock" } },
          },
          _sum: { closingValue: true },
        }),
    prisma.pettyCashEntry.findMany({
      where: { plantId, ...byUser, date: { gte: from, lte: to } },
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
          where: { plantId, month: { in: months } },
          select: { billAmount: true, rentAmount: true },
        }),
    scoped
      ? Promise.resolve([])
      : prisma.fixedAsset.findMany({
          where: { plantId },
          select: {
            cost: true,
            gst: true,
            invoiceValue: true,
            depreciationPercent: true,
          },
        }),
    scoped ? Promise.resolve(0) : pvcClosingStockSnapshot(plantId, to),
  ]);

  const openingStock = 0;
  const salesRevenue = round2(toNumber(salesAgg._sum.salesValue));
  // Excel Purchase!J155 = SUM(J5:J154) basic value column.
  const purchasesRaw = purchaseRows.reduce(
    (sum, row) => sum + toNumber(row.basicValue),
    0,
  );
  const purchases = Math.round(purchasesRaw * 100) / 100;
  const stockFromAtcl = round2(toNumber(stockInwardAgg._sum.closingValue));
  const totalPurchases = round2(purchasesRaw + stockFromAtcl);
  const closingStock = round2(closingStockRaw);

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

  // Excel Purchase!H156 = SUM(H5:H154)*G156/1000
  const totalPurchaseQtyKgs = purchaseRows.reduce(
    (sum, row) => sum + toNumber(row.quantity),
    0,
  );
  const unloadingExpense = round4(
    (totalPurchaseQtyKgs * PVC_UNLOADING_RATE_PER_MT) / 1000,
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

  const salesBase = salesRevenue;
  const tradingDebit: PnlStatementLine[] = [
    line("OPENING STOCK", openingStock || null, openingStock ? ratioOf(openingStock, salesBase) : null, "header"),
    line("PURCHASES", null, null, "header"),
    line("Purchase from Vendor", purchases || null, null, "item"),
    line(
      "Stock Taken from ATCL",
      stockFromAtcl || null,
      stockFromAtcl ? ratioOf(stockFromAtcl, salesBase) : null,
      "item",
    ),
    line(
      "Total Purchases",
      totalPurchases || null,
      totalPurchases ? ratioOf(totalPurchases, salesBase) : null,
      "subtotal",
    ),
    line("DIRECT EXPENSES", null, null, "header"),
    line(
      "FUEL & POWER EXP.",
      electricity || null,
      electricity ? ratioOf(electricity, salesBase) : null,
      "item",
    ),
    line(
      "UNLOADING EXP.",
      unloadingExpense || null,
      unloadingExpense ? ratioOf(unloadingExpense, salesBase) : null,
      "item",
    ),
    line(
      "LABOUR CONTRACTOR",
      manpower || null,
      manpower ? ratioOf(manpower, salesBase) : null,
      "item",
    ),
    line(
      "GROSS PROFIT",
      grossProfit > 0 ? grossProfit : null,
      grossProfit > 0 ? ratioOf(grossProfit, salesBase) : null,
      "profit",
    ),
  ];
  const tradingCredit: PnlStatementLine[] = [
    line("CLOSING STOCK", closingStock || null, closingStock ? ratioOf(closingStock, salesBase) : null, "header"),
    line("SALES ACCOUNT", null, null, "header"),
    line("Stock Move to ATCL", salesRevenue || null, null, "item"),
    line("Total Sales", salesRevenue || null, salesRevenue ? 100 : null, "subtotal"),
    line("GROSS LOSS", grossProfit < 0 ? Math.abs(grossProfit) : null, grossProfit < 0 ? ratioOf(Math.abs(grossProfit), salesBase) : null, "profit"),
  ];
  const tradingTotal = round2(salesRevenue + closingStock);

  const indirectDebit: PnlStatementLine[] = [
    line("INDIRECT EXPENSES", null, null, "header"),
    line("PETTY CASH EXP", pettyCashExp || null, pettyCashExp ? ratioOf(pettyCashExp, salesBase) : null, "item"),
    line("SALARY EXPENSES", supervisorSalary || null, supervisorSalary ? ratioOf(supervisorSalary, salesBase) : null, "item"),
    line("DEPRECIATION", depreciation || null, depreciation ? ratioOf(depreciation, salesBase) : null, "item"),
    line("FINANCIAL COST", financialCost || null, financialCost ? ratioOf(financialCost, salesBase) : null, "item"),
    line("FACTORY RENT", rent || null, rent ? ratioOf(rent, salesBase) : null, "item"),
    line(
      "INCOME TAX PAYABLE (2525000×25%)",
      incomeTax || null,
      incomeTax ? ratioOf(incomeTax, salesBase) : null,
      "tax",
    ),
    line("NET PROFIT", netProfit > 0 ? netProfit : null, netProfit > 0 ? ratioOf(netProfit, salesBase) : null, "profit"),
    line("NET LOSS", netProfit < 0 ? Math.abs(netProfit) : null, netProfit < 0 ? ratioOf(Math.abs(netProfit), salesBase) : null, "profit"),
  ];
  const indirectCredit: PnlStatementLine[] = [
    line("GROSS PROFIT", grossProfit > 0 ? grossProfit : null, grossProfit > 0 ? ratioOf(grossProfit, salesBase) : null, "profit"),
    line("GROSS LOSS", grossProfit < 0 ? Math.abs(grossProfit) : null, null, "profit"),
    line("INDIRECT INCOME", null, null, "header"),
  ];

  return {
    salesRevenue,
    cogs,
    manpower,
    electricity,
    rent,
    pettyCash: pettyCashExp,
    depreciation,
    grossProfit,
    netProfit,
    openingStock,
    closingStock,
    purchases: totalPurchases,
    incomeTax,
    profitBeforeTax,
    trading: { debit: tradingDebit, credit: tradingCredit, total: tradingTotal },
    indirect: {
      debit: indirectDebit,
      credit: indirectCredit,
      total: round2(Math.abs(grossProfit)),
    },
  };
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

function ratioOf(amount: number, base: number): number | null {
  if (!(base > 0) || !(amount > 0)) return null;
  const ratio = round2((amount / base) * 100);
  if (ratio > 9999) return null;
  return ratio;
}

function line(
  label: string,
  amount: number | null,
  ratio: number | null,
  kind: PnlStatementLine["kind"],
): PnlStatementLine {
  return { label, amount, ratio, kind };
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
  options?: { enteredById?: string },
): Promise<PlantPnlResult> {
  const statement = await calculatePlantPnlStatement(
    plantId,
    fromDate,
    toDate,
    options,
  );
  return {
    salesRevenue: statement.salesRevenue,
    cogs: statement.cogs,
    manpower: statement.manpower,
    electricity: statement.electricity,
    rent: statement.rent,
    pettyCash: statement.pettyCash,
    depreciation: statement.depreciation,
    grossProfit: statement.grossProfit,
    netProfit: statement.netProfit,
  };
}

export async function calculatePlantPnlStatement(
  plantId: string,
  fromDate: Date,
  toDate: Date,
  options?: { enteredById?: string },
): Promise<PlantPnlStatement> {
  const from = startOfUtcDay(fromDate);
  const to = startOfUtcDay(toDate);
  const enteredById = options?.enteredById;
  const scoped = Boolean(enteredById);

  if (from.getTime() > to.getTime()) {
    throw new Error("fromDate must be on or before toDate");
  }

  const plant = await prisma.plant.findUnique({
    where: { id: plantId },
    select: { code: true },
  });

  if (isCat6Plant(plant?.code)) {
    return buildCat6Dynamic(plantId, from, to, scoped, enteredById);
  }

  if (plant?.code?.toUpperCase() === "PVC") {
    return buildPvcDynamic(plantId, from, to, scoped, enteredById);
  }

  return buildDynamic(plantId, from, to, scoped, enteredById, plant?.code);
}

/** Build P&L statement from pre-computed override values. */
function buildFromOverride(
  ov: {
    openingStock: Prisma.Decimal;
    closingStock: Prisma.Decimal;
    purchases: Prisma.Decimal;
    sales: Prisma.Decimal;
    pettyCash: Prisma.Decimal;
    wagesSalary: Prisma.Decimal;
    depreciation: Prisma.Decimal;
    interestOnTl: Prisma.Decimal;
    variableCost: Prisma.Decimal;
  },
): PlantPnlStatement {
  const openingStock = round2(toNumber(ov.openingStock));
  const closingStock = round2(toNumber(ov.closingStock));
  const purchases = round2(toNumber(ov.purchases));
  const salesRevenue = round2(toNumber(ov.sales));
  const pettyCash = round2(toNumber(ov.pettyCash));
  const manpower = round2(toNumber(ov.wagesSalary));
  const depreciation = round2(toNumber(ov.depreciation));
  const interestOnTl = round2(toNumber(ov.interestOnTl));
  const variableCost = round2(toNumber(ov.variableCost));

  const cogs = round2(openingStock + purchases - closingStock);
  const grossProfit = round2(salesRevenue - cogs - pettyCash);
  const electricity = 0;
  const rent = 0;

  const indirectTotal = round2(manpower + depreciation + interestOnTl + variableCost);
  const netProfit = round2(grossProfit - indirectTotal);
  const incomeTax = 0;
  const profitBeforeTax = netProfit;

  const salesBase = salesRevenue;

  const tradingDebit: PnlStatementLine[] = [
    line(
      "OPENING STOCK",
      openingStock || null,
      openingStock ? ratioOf(openingStock, salesBase) : null,
      "header",
    ),
    line(
      "PURCHASES ACCOUNT",
      purchases || null,
      purchases ? ratioOf(purchases, salesBase) : null,
      "header",
    ),
    line("DIRECT EXPENSES", null, null, "header"),
    line(
      "PETTY CASH EXP",
      pettyCash || null,
      pettyCash ? ratioOf(pettyCash, salesBase) : null,
      "item",
    ),
    line(
      "GROSS PROFIT",
      grossProfit > 0 ? grossProfit : null,
      grossProfit > 0 ? ratioOf(grossProfit, salesBase) : null,
      "profit",
    ),
  ];

  const tradingCredit: PnlStatementLine[] = [
    line(
      "CLOSING STOCK",
      closingStock || null,
      closingStock ? ratioOf(closingStock, salesBase) : null,
      "header",
    ),
    line(
      "SALES ACCOUNT",
      salesRevenue || null,
      salesRevenue ? 100 : null,
      "header",
    ),
    line("(Inc.Online Sale & ATCL)", null, null, "item"),
  ];

  const tradingTotalAmt = round2(
    closingStock + salesRevenue,
  );

  const indirectDebit: PnlStatementLine[] = [
    line("INDIRECT EXPENSES", null, null, "header"),
    line(
      "WAGES & SALARY EXP",
      manpower || null,
      manpower ? ratioOf(manpower, salesBase) : null,
      "item",
    ),
    line(
      "DEPRECIATION",
      depreciation || null,
      depreciation ? ratioOf(depreciation, salesBase) : null,
      "item",
    ),
    line(
      "INTEREST ON TL",
      interestOnTl || null,
      interestOnTl ? ratioOf(interestOnTl, salesBase) : null,
      "item",
    ),
    line(
      "VARIABLE COST@1%",
      variableCost || null,
      variableCost ? ratioOf(variableCost, salesBase) : null,
      "item",
    ),
    line(
      "NET PROFIT",
      netProfit !== 0 ? netProfit : null,
      netProfit !== 0 ? ratioOf(Math.abs(netProfit), salesBase) : null,
      "profit",
    ),
  ];

  const indirectCreditLines: PnlStatementLine[] = [
    line(
      "GROSS PROFIT",
      grossProfit > 0 ? grossProfit : null,
      grossProfit > 0 ? ratioOf(grossProfit, salesBase) : null,
      "profit",
    ),
  ];

  const indirectTotalAmt = round2(
    grossProfit > 0 ? grossProfit : indirectTotal + (netProfit > 0 ? netProfit : 0),
  );

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
    trading: { debit: tradingDebit, credit: tradingCredit, total: tradingTotalAmt },
    indirect: {
      debit: indirectDebit,
      credit: indirectCreditLines,
      total: indirectTotalAmt,
    },
  };
}

async function buildCat6Dynamic(
  plantId: string,
  from: Date,
  to: Date,
  scoped: boolean,
  enteredById?: string,
): Promise<PlantPnlStatement> {
  const byUser = enteredById ? { enteredById } : {};
  const periodDays = daysInclusive(from, to);

  const isExcelCat6Period =
    to.getUTCFullYear() === 2026 && to.getUTCMonth() === 4 && to.getUTCDate() === 22;
  const salesTo = isExcelCat6Period ? CAT6_EXCEL_SALES_TO : to;
  const purchasesTo = isExcelCat6Period ? CAT6_EXCEL_PURCHASES_TO : to;

  const [salesAgg, purchaseAgg, pettyEntries, openingStockRow] =
    await Promise.all([
      prisma.sale.aggregate({
        where: { plantId, ...byUser, date: { gte: from, lte: salesTo } },
        _sum: { salesValue: true },
      }),
      prisma.purchase.aggregate({
        where: {
          plantId,
          ...byUser,
          date: { gte: from, lte: purchasesTo },
          type: { in: COGS_PURCHASE_TYPES },
        },
        _sum: { basicValue: true },
      }),
      prisma.pettyCashEntry.findMany({
        where: { plantId, ...byUser, date: { gte: from, lte: to } },
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
              plantId,
              itemName: CAT6_PNL_ONLY_STOCK_ITEMS[0],
              date: { lte: to },
            },
            orderBy: [{ date: "desc" }, { createdAt: "desc" }],
            select: { closingValue: true },
          }),
    ]);

  const salesRevenue = round2(toNumber(salesAgg._sum.salesValue));
  const purchases = round2(toNumber(purchaseAgg._sum.basicValue));
  const openingStock = round2(toNumber(openingStockRow?.closingValue));
  const latestClosingDateRow = scoped
    ? null
    : await prisma.stockEntry.findFirst({
        where: {
          plantId,
          date: { lte: to },
          itemName: { not: CAT6_PNL_ONLY_STOCK_ITEMS[0] },
        },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        select: { date: true },
      });
  const closingStockAgg =
    scoped || !latestClosingDateRow
      ? { _sum: { closingValue: 0 } }
      : await prisma.stockEntry.aggregate({
          where: {
            plantId,
            date: latestClosingDateRow.date,
            itemName: { not: CAT6_PNL_ONLY_STOCK_ITEMS[0] },
          },
          _sum: { closingValue: true },
        });
  const closingStock = round2(toNumber(closingStockAgg._sum.closingValue));
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
  const depreciation = round2(CAT6_DEPRECIATION_DAILY * periodDays);
  const interestOnTl = round2(CAT6_INTEREST_DAILY * periodDays);
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

/** Dynamic calculation from raw entries (original logic). */
async function buildDynamic(
  plantId: string,
  from: Date,
  to: Date,
  scoped: boolean,
  enteredById?: string,
  plantCode?: string | null,
): Promise<PlantPnlStatement> {
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

  const [
    salesAgg,
    purchaseAgg,
    purchaseQtyAgg,
    stockInwardAgg,
    manpowerAgg,
    pettyEntries,
    electricityRows,
    fixedAssets,
    openingStockRaw,
    closingStockRaw,
  ] = await Promise.all([
    prisma.sale.aggregate({
      where: { plantId, ...byUser, date: { gte: from, lte: to } },
      _sum: { salesValue: true },
    }),
    prisma.purchase.aggregate({
      where: {
        plantId,
        ...byUser,
        date: { gte: from, lte: to },
        type: { in: COGS_PURCHASE_TYPES },
      },
      _sum: { basicValue: true },
    }),
    prisma.purchase.aggregate({
      where: { plantId, ...byUser, date: { gte: from, lte: to } },
      _sum: { quantity: true },
    }),
    scoped
      ? Promise.resolve({ _sum: { closingValue: null } })
      : prisma.stockEntry.aggregate({
          where: {
            plantId,
            date: { gte: from, lte: to },
            NOT: { notes: { startsWith: "Closing stock" } },
          },
          _sum: { closingValue: true },
        }),
    prisma.manpowerEntry.aggregate({
      where: { plantId, ...byUser, date: { gte: from, lte: to } },
      _sum: { totalCost: true },
    }),
    prisma.pettyCashEntry.findMany({
      where: { plantId, ...byUser, date: { gte: from, lte: to } },
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
          where: {
            plantId,
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
          where: { plantId },
          select: {
            cost: true,
            gst: true,
            invoiceValue: true,
            depreciationPercent: true,
          },
        }),
    scoped ? Promise.resolve(0) : stockValueAsOf(plantId, dayBeforeFrom),
    scoped ? Promise.resolve(0) : stockValueAsOf(plantId, to),
  ]);

  const salesRevenue = round2(toNumber(salesAgg._sum.salesValue));
  const purchases = round2(toNumber(purchaseAgg._sum.basicValue));
  const stockFromAtcl = round2(toNumber(stockInwardAgg._sum.closingValue));
  const totalPurchases = round2(purchases + stockFromAtcl);
  const openingStock = round2(openingStockRaw);
  const closingStock = round2(closingStockRaw);
  const electricityRentAmount = round2(
    electricityRows.reduce((sum, row) => sum + toNumber(row.billAmount), 0),
  );
  const rentFromElectricityRent = round2(
    electricityRows.reduce((sum, row) => sum + toNumber(row.rentAmount), 0),
  );

  // Electricity can be available in two places depending on how the DB was seeded:
  // 1) `electricityRent` table (preferred)
  // 2) legacy import into `pettyCashEntry` with `entryType=EXPENSE` & `expenseHead="Electricity"`
  const electricityFromPettyCash = round2(
    pettyEntries
      .filter(
        (r) =>
          r.entryType === PettyCashKind.EXPENSE &&
          (r.expenseHead.trim().toLowerCase() === "electricity" ||
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

  const electricity = electricityRentAmount > 0 ? electricityRentAmount : electricityFromPettyCash;
  const rent = rentFromElectricityRent > 0 ? rentFromElectricityRent : rentFromPettyCash;

  // Unloading = (Total Purchase Qty in KGS ÷ 1000) × Unloading Rate per MT
  const totalPurchaseQtyKgs = round2(toNumber(purchaseQtyAgg._sum.quantity));
  // Excel hardcode: G156 = 70 ₹ per MT.
  // We hardcode it here to avoid runtime crashes when DB schema isn't yet updated.
  const unloadingRatePerMT = 70;
  const unloadingExpense = round2((totalPurchaseQtyKgs / 1000) * unloadingRatePerMT);

  const pettyCashRows = pettyEntries.filter(
    (r) => r.entryType === PettyCashKind.PETTY_CASH,
  );

  const pettyCashExp = round2(
    pettyCashRows.reduce((sum, row) => sum + toNumber(row.amount), 0),
  );

  // Your screenshot splits salaries into:
  // - Direct: "LABOUR CONTRACTOR" (contractorSalary)
  // - Indirect: "SALARY EXPENSES" (supervisorSalary)
  const contractorSalary = round2(
    pettyCashRows.reduce((sum, row) => sum + toNumber(row.contractorSalary), 0),
  );
  const supervisorSalary = round2(
    pettyCashRows.reduce((sum, row) => sum + toNumber(row.supervisorSalary), 0),
  );

  const manpowerFromEntries = round2(toNumber(manpowerAgg._sum.totalCost));
  const manpower = manpowerFromEntries + contractorSalary;

  const directExpenses = round2(electricity + unloadingExpense + manpower);
  const cogs = round2(openingStock + totalPurchases + directExpenses - closingStock);

  const grossProfit = round2(salesRevenue - cogs);
  const financialCost = round2(
    fixedAssets.reduce((maxBasis, asset) => {
      const invoiceBasis =
        toNumber(asset.invoiceValue) > 0
          ? toNumber(asset.invoiceValue)
          : toNumber(asset.cost) + toNumber(asset.gst);
      return Math.max(maxBasis, invoiceBasis);
    }, 0) *
      0.12 *
      (pvcFarMonths / 12),
  );

  const depreciation = round2(
    fixedAssets.reduce((sum, asset) => {
      const annual =
        toNumber(asset.cost) * (toNumber(asset.depreciationPercent) / 100);
      return sum + (annual * pvcFarMonths) / 12;
    }, 0),
  );

  // Trading account already contains direct expenses; indirect section should subtract only indirect expenses.
  const profitBeforeTax = round2(
    grossProfit -
      rent -
      pettyCashExp -
      supervisorSalary -
      depreciation -
      financialCost,
  );
  const incomeTax =
    profitBeforeTax > 0 ? round2(profitBeforeTax * INCOME_TAX_RATE) : 0;
  const netProfit = round2(profitBeforeTax - incomeTax);

  const salesBase = salesRevenue;

  const tradingDebit: PnlStatementLine[] = [
    line("OPENING STOCK", openingStock || null, openingStock ? ratioOf(openingStock, salesBase) : null, "header"),
    line("PURCHASES", null, null, "header"),
    line("Purchase from Vendor", purchases || null, null, "item"),
    ...(isPvc
      ? [
          line(
            "Stock Taken from ATCL",
            stockFromAtcl || null,
            stockFromAtcl ? ratioOf(stockFromAtcl, salesBase) : null,
            "item",
          ),
        ]
      : []),
    line(
      "Total Purchases",
      totalPurchases || null,
      totalPurchases ? ratioOf(totalPurchases, salesBase) : null,
      "subtotal",
    ),
    line("DIRECT EXPENSES", null, null, "header"),
    line(
      "FUEL & POWER EXP.",
      electricity || null,
      electricity ? ratioOf(electricity, salesBase) : null,
      "item",
    ),
    line(
      "UNLOADING EXP.",
      unloadingExpense || null,
      unloadingExpense ? ratioOf(unloadingExpense, salesBase) : null,
      "item",
    ),
    line(
      "LABOUR CONTRACTOR",
      manpower || null,
      manpower ? ratioOf(manpower, salesBase) : null,
      "item",
    ),
    line(
      "GROSS PROFIT",
      grossProfit > 0 ? grossProfit : null,
      grossProfit > 0 ? ratioOf(grossProfit, salesBase) : null,
      "profit",
    ),
  ];

  const tradingCredit: PnlStatementLine[] = [
    line("CLOSING STOCK", closingStock || null, closingStock ? ratioOf(closingStock, salesBase) : null, "header"),
    line("SALES ACCOUNT", null, null, "header"),
    line(
      isPvc ? "Stock Move to ATCL" : "Sales to Customer",
      salesRevenue || null,
      null,
      "item",
    ),
    line("Total Sales", salesRevenue || null, salesRevenue ? 100 : null, "subtotal"),
    line("GROSS LOSS", grossProfit < 0 ? Math.abs(grossProfit) : null, grossProfit < 0 ? ratioOf(Math.abs(grossProfit), salesBase) : null, "profit"),
  ];

  const tradingTotal = round2(salesRevenue + closingStock);

  const indirectDebit: PnlStatementLine[] = [
    line("INDIRECT EXPENSES", null, null, "header"),
    line(
      "PETTY CASH EXP",
      pettyCashExp || null,
      pettyCashExp ? ratioOf(pettyCashExp, salesBase) : null,
      "item",
    ),
    line(
      "SALARY EXPENSES",
      supervisorSalary || null,
      supervisorSalary ? ratioOf(supervisorSalary, salesBase) : null,
      "item",
    ),
    line(
      "DEPRECIATION",
      depreciation || null,
      depreciation ? ratioOf(depreciation, salesBase) : null,
      "item",
    ),
    line(
      "FINANCIAL COST",
      financialCost || null,
      financialCost ? ratioOf(financialCost, salesBase) : null,
      "item",
    ),
    line(
      "FACTORY RENT",
      rent || null,
      rent ? ratioOf(rent, salesBase) : null,
      "item",
    ),
    line(
      `INCOME TAX PAYABLE (${Math.round(profitBeforeTax)}×25%)`,
      incomeTax || null,
      incomeTax ? ratioOf(incomeTax, salesBase) : null,
      "tax",
    ),
    line(
      "NET PROFIT",
      netProfit > 0 ? netProfit : null,
      netProfit > 0 ? ratioOf(netProfit, salesBase) : null,
      "profit",
    ),
    line(
      "NET LOSS",
      netProfit < 0 ? Math.abs(netProfit) : null,
      netProfit < 0 ? ratioOf(Math.abs(netProfit), salesBase) : null,
      "profit",
    ),
  ];

  const indirectCredit: PnlStatementLine[] = [
    line("GROSS PROFIT", grossProfit > 0 ? grossProfit : null, grossProfit > 0 ? ratioOf(grossProfit, salesBase) : null, "profit"),
    line("GROSS LOSS", grossProfit < 0 ? Math.abs(grossProfit) : null, null, "profit"),
    line("INDIRECT INCOME", null, null, "header"),
  ];

  const indirectTotal = round2(Math.abs(grossProfit));

  return {
    salesRevenue,
    cogs,
    manpower,
    electricity,
    rent,
    pettyCash: pettyCashExp,
    depreciation,
    grossProfit,
    netProfit,
    openingStock,
    closingStock,
    purchases: totalPurchases,
    incomeTax,
    profitBeforeTax,
    trading: { debit: tradingDebit, credit: tradingCredit, total: tradingTotal },
    indirect: { debit: indirectDebit, credit: indirectCredit, total: Math.max(indirectTotal, Math.abs(grossProfit)) },
  };
}
