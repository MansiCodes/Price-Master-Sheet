import type { TodayHubVm } from "@/components/today/hub/today-hub-view-model";
import { bindExpenseLocals } from "@/components/today/hub/bind-today-hub-locals";
import {
  HubExpensePettyCat6Amount,
  HubExpensePettyCat6Approvals,
  HubExpensePettyCat6Desc,
  HubExpensePettyCat6People,
  HubExpensePettyCat6Upload,
} from "@/components/today/hub/HubExpensePettyCat6Fields";
import {
  HubExpensePettyCashAmounts,
  HubExpensePettyCashBill,
  HubExpensePettyCashDesc,
  HubExpensePettyCashPay,
  HubExpensePettyCashSupervisor,
} from "@/components/today/hub/HubExpensePettyCashFields";

export function HubExpensePetty({ vm, t }: { vm: TodayHubVm; t: (key: string) => string }) {
  const { isCat6 } = bindExpenseLocals(vm);
  if (isCat6) {
    return (
      <>
        <HubExpensePettyCat6Amount vm={vm} />
        <HubExpensePettyCat6Desc vm={vm} />
        <HubExpensePettyCat6People vm={vm} />
        <HubExpensePettyCat6Approvals vm={vm} />
        <HubExpensePettyCat6Upload vm={vm} t={t} />
      </>
    );
  }
  return (
    <>
      <HubExpensePettyCashPay vm={vm} t={t} />
      <HubExpensePettyCashBill vm={vm} t={t} />
      <HubExpensePettyCashDesc vm={vm} t={t} />
      <HubExpensePettyCashAmounts vm={vm} t={t} />
      <HubExpensePettyCashSupervisor vm={vm} t={t} />
    </>
  );
}
