import { PettyCashKind } from "@prisma/client";
import {
  isAtclPurchase,
  normalizeUpcastExpenseHead,
  upcastEntryHead,
} from "@/lib/plant-catalogs";
import { INCOME_TAX_RATE, round2, toNumber } from "./helpers";
import type { DynamicInputs } from "./dynamic-query";

export function computeDynamicTotals(
  data: DynamicInputs,
  plantCode?: string | null,
) {
  const {
    periodDays,
    salesAgg,
    purchaseRowsScoped,
    manpowerAgg,
    pettyEntries,
    fixedAssets,
    openingStockRaw,
    closingStockRaw,
    openingStockManualRaw,
  } = data;

  const salesRevenue = round2(toNumber(salesAgg._sum.salesValue));
  const vendorPurchaseRowsScoped = purchaseRowsScoped.filter(
    (row) => !isAtclPurchase(row),
  );
  const atclPurchaseRowsScoped = purchaseRowsScoped.filter((row) =>
    isAtclPurchase(row),
  );
  const purchases = round2(
    vendorPurchaseRowsScoped.reduce(
      (sum, row) => sum + toNumber(row.basicValue),
      0,
    ),
  );
  const stockFromAtclPurchases = round2(
    atclPurchaseRowsScoped.reduce(
      (sum, row) => sum + toNumber(row.basicValue),
      0,
    ),
  );
  const stockFromAtcl = stockFromAtclPurchases;
  const totalPurchases = round2(purchases + stockFromAtcl);
  const openingStockSnap = round2(openingStockManualRaw);
  // Opening stock = last closing snapshot before period; fallback to legacy stockValueAsOf
  const openingStock = openingStockSnap > 0 ? openingStockSnap : (totalPurchases > 0 || salesRevenue > 0 ? round2(openingStockRaw) : 0);
  const closingStockSnap = round2(closingStockRaw);
  const closingStock = closingStockSnap > 0
    ? closingStockSnap
    : (openingStock > 0 || totalPurchases > 0 || salesRevenue > 0)
      ? Math.max(0, round2(openingStock + totalPurchases - salesRevenue))
      : (stockFromAtclPurchases > 0 ? closingStockSnap : 0);
  const electricity = round2(
    pettyEntries.reduce((sum, row) => {
      const head = normalizeUpcastExpenseHead(
        row.expenseHead || row.nature || "",
      );
      const pay = row.payMode.trim().toLowerCase();
      if (head !== "Electricity" && pay !== "electricity") return sum;
      const amt = toNumber(row.amount);
      return amt > 0 ? sum + amt : sum;
    }, 0),
  );

  const rent = round2(
    pettyEntries.reduce((sum, row) => {
      const head = normalizeUpcastExpenseHead(
        row.expenseHead || row.nature || "",
      );
      if (head !== "Factory Rent") return sum;
      const amt = toNumber(row.amount);
      return amt > 0 ? sum + amt : sum;
    }, 0),
  );

  // Unloading: only use actual logged unloading expense entries (no auto-calculated rate estimate when unentered)
  const unloadingExpense = round2(
    pettyEntries
      .filter(
        (r) =>
          /unloading/i.test(r.expenseHead.trim()) &&
          toNumber(r.amount) > 0,
      )
      .reduce((sum, row) => sum + toNumber(row.amount), 0),
  );

  const isUpcast = plantCode?.toUpperCase() === "UPCAST";

  const pettyCashRows = pettyEntries.filter(
    (r) => r.entryType === PettyCashKind.PETTY_CASH,
  );

  const upcastMiscDirectTotals: Record<string, number> = {};
  let depreciation = 0;

  if (isUpcast) {
    for (const row of pettyEntries) {
      const head = upcastEntryHead(row.expenseHead || "", row.nature);
      const amt = toNumber(row.amount);
      if (!(amt > 0) || !head) continue;
      if (
        head === "Fuel & Power" ||
        head === "Electricity" ||
        head === "Unloading of MT" ||
        head === "Factory Rent" ||
        head === "Salary Expenses" ||
        head === "Contractor Wages" ||
        head === "FAR" ||
        head === "Financial Cost"
      ) {
        continue;
      }
      if (head === "Depreciation") {
        depreciation = round2(depreciation + amt);
        continue;
      }
      upcastMiscDirectTotals[head] = round2(
        (upcastMiscDirectTotals[head] ?? 0) + amt,
      );
    }
  }

  const upcastMiscDirectTotal = round2(
    Object.values(upcastMiscDirectTotals).reduce((s, n) => s + n, 0),
  );

  const pettyCashExp = isUpcast
    ? 0
    : round2(
        pettyCashRows.reduce((sum, row) => sum + toNumber(row.amount), 0),
      );

  // Direct: contractor wages; Indirect: salary expenses
  const contractorSalary = round2(
    pettyEntries.reduce((sum, row) => {
      const head = normalizeUpcastExpenseHead(row.expenseHead || "");
      const fromField = toNumber(row.contractorSalary);
      if (fromField > 0) return sum + fromField;
      if (
        isUpcast &&
        head === "Contractor Wages" &&
        toNumber(row.amount) > 0
      ) {
        return sum + toNumber(row.amount);
      }
      return sum;
    }, 0),
  );
  const supervisorSalary = round2(
    pettyEntries.reduce((sum, row) => {
      const head = normalizeUpcastExpenseHead(row.expenseHead || "");
      const fromField = toNumber(row.supervisorSalary);
      if (fromField > 0) return sum + fromField;
      if (
        isUpcast &&
        head === "Salary Expenses" &&
        toNumber(row.amount) > 0
      ) {
        return sum + toNumber(row.amount);
      }
      return sum;
    }, 0),
  );

  const manpowerFromEntries = round2(toNumber(manpowerAgg._sum.totalCost));
  const manpower = manpowerFromEntries + contractorSalary;

  const directExpenses = round2(
    electricity +
      unloadingExpense +
      manpower +
      (isUpcast ? upcastMiscDirectTotal : 0),
  );
  const cogs = round2(openingStock + totalPurchases + directExpenses - closingStock);

  const grossProfit = round2(salesRevenue - cogs);
  const financialCost = round2(
    pettyEntries.reduce((sum, row) => {
      const head = upcastEntryHead(row.expenseHead || "", row.nature);
      if (head !== "Financial Cost") return sum;
      const amt = toNumber(row.amount);
      return amt > 0 ? sum + amt : sum;
    }, 0),
  );

  if (!isUpcast) {
    depreciation = round2(
      fixedAssets.reduce((sum, asset) => {
        const annual =
          toNumber(asset.cost) * (toNumber(asset.depreciationPercent) / 100);
        return sum + (annual * periodDays) / 365;
      }, 0),
    );
  }

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

  return {
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
  };
}

export type DynamicTotals = ReturnType<typeof computeDynamicTotals>;
