import { Prisma } from "@prisma/client";
import type { PlantPnlStatement, PnlStatementLine } from "@/lib/pnl/types";
import { line, ratioOf, round2, toNumber } from "./helpers";

/** Build P&L statement from pre-computed override values. */
export function buildFromOverride(
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
