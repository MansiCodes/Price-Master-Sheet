import {
  UPCAST_MISC_NATURES,
  upcastExpensePnlLine,
} from "@/lib/plant-catalogs";
import type { PlantPnlStatement, PnlStatementLine } from "@/lib/pnl/types";
import { line, ratioOf, round2 } from "./helpers";
import type { DynamicTotals } from "./dynamic-compute";

export function assembleDynamicStatement(
  totals: DynamicTotals,
  isPvc: boolean,
): PlantPnlStatement {
  const {
    salesRevenue,
    purchases,
    stockFromAtcl,
    totalPurchases,
    openingStock,
    closingStock,
    electricity,
    rent,
    unloadingExpense,
    isUpcast,
    upcastMiscDirectTotals,
    upcastMiscDirectTotal,
    pettyCashExp,
    manpower,
    cogs,
    grossProfit,
    financialCost,
    depreciation,
    supervisorSalary,
    profitBeforeTax,
    incomeTax,
    netProfit,
  } = totals;

  const salesBase = salesRevenue;

  const upcastDirectLines: PnlStatementLine[] = isUpcast
    ? [
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
          "CONTRACTOR WAGES",
          manpower || null,
          manpower ? ratioOf(manpower, salesBase) : null,
          "item",
        ),
        ...UPCAST_MISC_NATURES.map((head) => {
          const amt = upcastMiscDirectTotals[head] ?? 0;
          return line(
            upcastExpensePnlLine(head),
            amt || null,
            amt ? ratioOf(amt, salesBase) : null,
            "item",
          );
        }),
      ]
    : [
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
      ];

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
    ...upcastDirectLines,
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
    ...(isUpcast
      ? []
      : [
          line(
            "PETTY CASH EXP",
            pettyCashExp || null,
            pettyCashExp ? ratioOf(pettyCashExp, salesBase) : null,
            "item",
          ),
        ]),
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
    pettyCash: isUpcast ? upcastMiscDirectTotal : pettyCashExp,
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
