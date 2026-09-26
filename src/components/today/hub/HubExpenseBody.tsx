import type { TodayHubVm } from "@/components/today/hub/today-hub-view-model";
import { bindExpenseLocals } from "@/components/today/hub/bind-today-hub-locals";
import { HubExpenseRent } from "@/components/today/hub/HubExpenseRent";
import { HubExpensePower } from "@/components/today/hub/HubExpensePower";
import { HubExpenseFar } from "@/components/today/hub/HubExpenseFar";
import { HubExpenseUnload } from "@/components/today/hub/HubExpenseUnload";
import { HubExpenseUpcastMisc } from "@/components/today/hub/HubExpenseUpcastMisc";
import { HubExpensePetty } from "@/components/today/hub/HubExpensePetty";
import { HubExpenseDefault } from "@/components/today/hub/HubExpenseDefault";

export function HubExpenseBody({ vm, t }: { vm: TodayHubVm; t: (key: string) => string }) {
  const { expenseHead, isPvcStyleExpense, isUpcast } = bindExpenseLocals(vm);
  if (expenseHead === "Factory Rent") return <HubExpenseRent vm={vm} t={t} />;
  if (expenseHead === "Electricity" || expenseHead === "Fuel & Power") return <HubExpensePower vm={vm} t={t} />;
  if (expenseHead === "FAR" || expenseHead === "Depreciation (FAR)") return <HubExpenseFar vm={vm} t={t} />;
  if (isPvcStyleExpense && (expenseHead === "Unloading of MT" || expenseHead === "Unloading MT")) {
    return <HubExpenseUnload vm={vm} t={t} />;
  }
  if (isUpcast && expenseHead === "Miscellaneous") return <HubExpenseUpcastMisc vm={vm} t={t} />;
  if (expenseHead === "Petty Cash") return <HubExpensePetty vm={vm} t={t} />;
  return <HubExpenseDefault vm={vm} t={t} />;
}
