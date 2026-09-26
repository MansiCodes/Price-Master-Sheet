import type { TodayHubVm } from "@/components/today/hub/today-hub-view-model";
import { HubExpenseUnloadHint, HubExpenseUnloadQtyRow } from "@/components/today/hub/HubExpenseUnloadQty";
import { HubExpenseUnloadNotes, HubExpenseUnloadPaid } from "@/components/today/hub/HubExpenseUnloadPay";

export function HubExpenseUnload({ vm, t }: { vm: TodayHubVm; t: (key: string) => string }) {
  return (
    <>
      <HubExpenseUnloadQtyRow vm={vm} />
      <HubExpenseUnloadHint vm={vm} />
      <HubExpenseUnloadPaid vm={vm} t={t} />
      <HubExpenseUnloadNotes vm={vm} t={t} />
    </>
  );
}
