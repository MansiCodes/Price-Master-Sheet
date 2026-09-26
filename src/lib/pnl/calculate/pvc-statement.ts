import type { PlantPnlStatement, PnlStatementLine } from "@/lib/pnl/types";
import { line, ratioOf, round2 } from "./helpers";

export function assemblePvcStatement(input: {
  salesRevenue: number;
  cogs: number;
  manpower: number;
  electricity: number;
  rent: number;
  pettyCashExp: number;
  depreciation: number;
  grossProfit: number;
  netProfit: number;
  openingStock: number;
  closingStock: number;
  purchases: number;
  stockFromAtcl: number;
  totalPurchases: number;
  unloadingExpense: number;
  incomeTax: number;
  profitBeforeTax: number;
  financialCost: number;
  supervisorSalary: number;
}): PlantPnlStatement {
  const {
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
  } = input;
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
