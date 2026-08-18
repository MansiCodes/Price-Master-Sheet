import { PettyCashKind, PurchaseType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
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
  const byUser = enteredById ? { enteredById } : {};

  if (from.getTime() > to.getTime()) {
    throw new Error("fromDate must be on or before toDate");
  }

  const dayBeforeFrom = addUtcDays(from, -1);
  const periodDays = daysInclusive(from, to);
  const months = monthStartsInRange(from, to);

  const [
    salesAgg,
    purchaseAgg,
    purchaseQtyAgg,
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
  const cogs = round2(openingStock + purchases + directExpenses - closingStock);

  const grossProfit = round2(salesRevenue - cogs);
  const financialCost = 0; // Not present in DB currently; keep line for screenshot parity.

  const depreciation = round2(
    fixedAssets.reduce((sum, asset) => {
      const annual =
        toNumber(asset.cost) * (toNumber(asset.depreciationPercent) / 100);
      return sum + (annual * periodDays) / 365;
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
    line(
      "OPENING STOCK",
      openingStock || null,
      openingStock ? ratioOf(openingStock, salesBase) : null,
      "header",
    ),
    line("PURCHASES", null, null, "header"),
    line("Purchase from Vendor", purchases || null, null, "item"),
    line(
      "Total Purchases",
      purchases || null,
      purchases ? ratioOf(purchases, salesBase) : null,
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
    line(
      "CLOSING STOCK",
      closingStock || null,
      closingStock ? ratioOf(closingStock, salesBase) : null,
      "header",
    ),
    line("SALES ACCOUNT", null, null, "header"),
    line("Sales to Customer", salesRevenue || null, null, "item"),
    line(
      "Total Sales",
      salesRevenue || null,
      salesRevenue ? 100 : null,
      "subtotal",
    ),
    line(
      "GROSS LOSS",
      grossProfit < 0 ? Math.abs(grossProfit) : null,
      grossProfit < 0 ? ratioOf(Math.abs(grossProfit), salesBase) : null,
      "profit",
    ),
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
    line(
      "GROSS PROFIT",
      grossProfit > 0 ? grossProfit : null,
      grossProfit > 0 ? ratioOf(grossProfit, salesBase) : null,
      "profit",
    ),
    line(
      "GROSS LOSS",
      grossProfit < 0 ? Math.abs(grossProfit) : null,
      null,
      "profit",
    ),
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
    purchases,
    incomeTax,
    profitBeforeTax,
    trading: {
      debit: tradingDebit,
      credit: tradingCredit,
      total: tradingTotal,
    },
    indirect: {
      debit: indirectDebit,
      credit: indirectCredit,
      total: Math.max(indirectTotal, Math.abs(grossProfit)),
    },
  };
}
