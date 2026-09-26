import { PettyCashKind } from "@prisma/client";
import {
  isAtclPurchase,
  normalizeUpcastExpenseHead,
  UPCAST_MISC_NATURES,
} from "@/lib/plant-catalogs";
import { INCOME_TAX_RATE, round2, toNumber } from "./helpers";
import type { DynamicInputs } from "./dynamic-query";

export function computeDynamicTotals(
  data: DynamicInputs,
  plantCode?: string | null,
) {
  const {
    pvcFarMonths,
    salesAgg,
    purchaseRowsScoped,
    manpowerAgg,
    pettyEntries,
    electricityRows,
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
            r.expenseHead.trim().toLowerCase() === "fuel & power" ||
            r.payMode.trim().toLowerCase() === "electricity"),
      )
      .reduce((sum, row) => sum + toNumber(row.amount), 0),
  );

  const rentFromPettyCash = round2(
    pettyEntries
      .filter((r) => {
        const head = normalizeUpcastExpenseHead(
          r.expenseHead || r.nature || "",
        );
        return head === "Factory Rent" && toNumber(r.amount) > 0;
      })
      .reduce((sum, row) => sum + toNumber(row.amount), 0),
  );

  const electricity = electricityRentAmount > 0 ? electricityRentAmount : electricityFromPettyCash;
  const rent = rentFromElectricityRent > 0 ? rentFromElectricityRent : rentFromPettyCash;

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
  for (const head of UPCAST_MISC_NATURES) {
    upcastMiscDirectTotals[head] = 0;
  }
  let upcastUnmappedFactory = 0;

  if (isUpcast) {
    for (const row of pettyEntries) {
      const head = normalizeUpcastExpenseHead(row.expenseHead || row.nature || "");
      const amt = toNumber(row.amount);
      if (!(amt > 0)) continue;
      if (
        head === "Fuel & Power" ||
        head === "Electricity" ||
        head === "Unloading of MT" ||
        head === "Factory Rent" ||
        head === "Salary Expenses" ||
        head === "Contractor Wages" ||
        head === "FAR" ||
        head === "Depreciation (FAR)" ||
        head === "Financial Cost"
      ) {
        continue;
      }
      if ((UPCAST_MISC_NATURES as readonly string[]).includes(head)) {
        upcastMiscDirectTotals[head] = round2(
          (upcastMiscDirectTotals[head] ?? 0) + amt,
        );
      } else {
        upcastUnmappedFactory = round2(upcastUnmappedFactory + amt);
      }
    }
    if (upcastUnmappedFactory > 0) {
      upcastMiscDirectTotals["Other Charges"] = round2(
        (upcastMiscDirectTotals["Other Charges"] ?? 0) + upcastUnmappedFactory,
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
