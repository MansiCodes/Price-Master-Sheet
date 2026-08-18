import { PurchaseType, Prisma } from "@prisma/client";
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
const CAT6_REFERENCE_FROM = new Date(Date.UTC(2025, 3, 1));
const CAT6_REFERENCE_TO = new Date(Date.UTC(2026, 4, 22));
const CAT6_REFERENCE_DAYS = daysInclusive(CAT6_REFERENCE_FROM, CAT6_REFERENCE_TO);
const CAT6_DEPRECIATION_DAILY = 4151829.07 / CAT6_REFERENCE_DAYS;
const CAT6_INTEREST_DAILY = 3762040 / CAT6_REFERENCE_DAYS;

function toNumber(value: Prisma.Decimal | number | null | undefined): number {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  return Number(value.toString());
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
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

  return buildDynamic(plantId, from, to, scoped, enteredById);
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

  const [salesAgg, purchaseAgg, pettyEntries, openingStockRow] =
    await Promise.all([
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
): Promise<PlantPnlStatement> {
  const byUser = enteredById ? { enteredById } : {};
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
            depreciationPercent: true,
          },
        }),
    scoped ? Promise.resolve(0) : stockValueAsOf(plantId, dayBeforeFrom),
    scoped ? Promise.resolve(0) : stockValueAsOf(plantId, to),
  ]);

  const salesRevenue = round2(toNumber(salesAgg._sum.salesValue));
  const purchases = round2(toNumber(purchaseAgg._sum.basicValue));
  const openingStock = round2(openingStockRaw);
  const closingStock = round2(closingStockRaw);
  const cogs = round2(openingStock + purchases - closingStock);
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

  const manpowerFromSalary = round2(
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

  const manpower = round2(toNumber(manpowerAgg._sum.totalCost)) + manpowerFromSalary;

  const electricity = round2(
    electricityRows.reduce((sum, row) => sum + toNumber(row.billAmount), 0),
  );
  const rent = round2(
    electricityRows.reduce((sum, row) => sum + toNumber(row.rentAmount), 0),
  );

  const depreciation = round2(
    fixedAssets.reduce((sum, asset) => {
      const annual =
        toNumber(asset.cost) * (toNumber(asset.depreciationPercent) / 100);
      return sum + (annual * periodDays) / 365;
    }, 0),
  );

  const grossProfit = round2(salesRevenue - cogs);
  const profitBeforeTax = round2(
    grossProfit - manpower - electricity - rent - pettyCash - depreciation,
  );
  const incomeTax =
    profitBeforeTax > 0 ? round2(profitBeforeTax * INCOME_TAX_RATE) : 0;
  const netProfit = round2(profitBeforeTax - incomeTax);

  const salesBase = salesRevenue;

  const tradingDebit: PnlStatementLine[] = [
    line("OPENING STOCK", openingStock || null, openingStock ? ratioOf(openingStock, salesBase) : null, "header"),
    line("PURCHASES", null, null, "header"),
    line("Purchase from Vendor", purchases || null, null, "item"),
    line("Total Purchases", purchases || null, purchases ? ratioOf(purchases, salesBase) : null, "subtotal"),
    line("DIRECT EXPENSES", null, null, "header"),
    line("FUEL & POWER EXP.", electricity || null, electricity ? ratioOf(electricity, salesBase) : null, "item"),
    line("LABOUR / MANPOWER", manpower || null, manpower ? ratioOf(manpower, salesBase) : null, "item"),
    line("GROSS PROFIT", grossProfit > 0 ? grossProfit : null, grossProfit > 0 ? ratioOf(grossProfit, salesBase) : null, "profit"),
  ];

  const tradingCredit: PnlStatementLine[] = [
    line("CLOSING STOCK", closingStock || null, closingStock ? ratioOf(closingStock, salesBase) : null, "header"),
    line("SALES ACCOUNT", null, null, "header"),
    line("Sales to Customer", salesRevenue || null, null, "item"),
    line("Total Sales", salesRevenue || null, salesRevenue ? 100 : null, "subtotal"),
    line("GROSS LOSS", grossProfit < 0 ? Math.abs(grossProfit) : null, grossProfit < 0 ? ratioOf(Math.abs(grossProfit), salesBase) : null, "profit"),
  ];

  const tradingTotal = round2(
    openingStock + purchases + electricity + manpower + (grossProfit > 0 ? grossProfit : 0),
  );

  const indirectDebit: PnlStatementLine[] = [
    line("INDIRECT EXPENSES", null, null, "header"),
    line("PETTY CASH EXP", pettyCash || null, pettyCash ? ratioOf(pettyCash, salesBase) : null, "item"),
    line("DEPRECIATION", depreciation || null, depreciation ? ratioOf(depreciation, salesBase) : null, "item"),
    line("FACTORY RENT", rent || null, rent ? ratioOf(rent, salesBase) : null, "item"),
    line(`INCOME TAX PAYABLE (${Math.round(profitBeforeTax)}×25%)`, incomeTax || null, incomeTax ? ratioOf(incomeTax, salesBase) : null, "tax"),
    line("NET PROFIT", netProfit > 0 ? netProfit : null, netProfit > 0 ? ratioOf(netProfit, salesBase) : null, "profit"),
    line("NET LOSS", netProfit < 0 ? Math.abs(netProfit) : null, netProfit < 0 ? ratioOf(Math.abs(netProfit), salesBase) : null, "profit"),
  ];

  const indirectCredit: PnlStatementLine[] = [
    line("GROSS PROFIT", grossProfit > 0 ? grossProfit : null, grossProfit > 0 ? ratioOf(grossProfit, salesBase) : null, "profit"),
    line("GROSS LOSS", grossProfit < 0 ? Math.abs(grossProfit) : null, null, "profit"),
    line("INDIRECT INCOME", null, null, "header"),
  ];

  const indirectTotal = round2(
    (grossProfit > 0 ? grossProfit : 0),
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
    trading: { debit: tradingDebit, credit: tradingCredit, total: tradingTotal },
    indirect: { debit: indirectDebit, credit: indirectCredit, total: Math.max(indirectTotal, Math.abs(grossProfit)) },
  };
}
