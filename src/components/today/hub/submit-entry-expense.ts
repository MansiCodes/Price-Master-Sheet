import {
  submitExpenseElectricity,
  submitExpenseFactoryRent,
  submitExpenseFar,
  submitExpenseUnloading,
} from "@/components/today/hub/submit-expense-special";
import {
  submitExpenseGeneric,
  submitExpenseLabour,
  submitExpensePetty,
  submitExpenseSalary,
  submitExpenseUpcastMisc,
} from "@/components/today/hub/submit-expense-default";
import type { FailFn, SubmitOutcome } from "@/components/today/hub/submit-types";
import type { TodayHubVm } from "@/components/today/hub/today-hub-view-model";

function submitPvcStyleExpense(vm: TodayHubVm, fail: FailFn): SubmitOutcome | Promise<SubmitOutcome> | null {
  const { plantId, flags, expense, session } = vm;
  const shared = { plantId, entryDate: session.entryDate, shift: session.shift, fail };
  if (expense.expenseHead === "Unloading of MT" || expense.expenseHead === "Unloading MT") {
    return submitExpenseUnloading({ ...shared, ...expense });
  }
  if (expense.expenseHead === "Labour Contractor" || expense.expenseHead === "Contractor Wages") {
    return submitExpenseLabour({ ...shared, ...expense, isUpcast: flags.isUpcast });
  }
  if (expense.expenseHead === "Salary Expenses") return submitExpenseSalary({ ...shared, ...expense });
  return null;
}

export async function submitExpenseKind(
  vm: TodayHubVm,
  fail: FailFn,
  t: (key: string) => string,
): Promise<SubmitOutcome> {
  const { plantId, flags, expense, misc, session } = vm;
  const shared = { plantId, entryDate: session.entryDate, shift: session.shift, fail };
  if (expense.expenseHead === "Factory Rent") return submitExpenseFactoryRent({ ...shared, ...expense });
  if (expense.expenseHead === "Electricity" || expense.expenseHead === "Fuel & Power") {
    return submitExpenseElectricity({ ...shared, ...expense });
  }
  if (expense.expenseHead === "FAR" || expense.expenseHead === "Depreciation (FAR)") {
    return submitExpenseFar({ ...shared, ...expense });
  }
  if (flags.isPvcStyleExpense) {
    const pvc = submitPvcStyleExpense(vm, fail);
    if (pvc) return pvc;
  }
  if (flags.isUpcast && expense.expenseHead === "Miscellaneous") {
    return submitExpenseUpcastMisc({ ...shared, ...expense });
  }
  if (expense.expenseHead === "Petty Cash") {
    return submitExpensePetty({ ...shared, isCat6: flags.isCat6, ...misc, enterPettyCashMsg: t("enterPettyCash") });
  }
  return submitExpenseGeneric({
    ...shared, ...expense, isCat6: flags.isCat6, isPvcStyleExpense: flags.isPvcStyleExpense,
    enterCategoryAmountMsg: t("enterCategoryAmount"),
  });
}
