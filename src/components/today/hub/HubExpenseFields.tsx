import type { TodayHubVm } from "@/components/today/hub/today-hub-view-model";
import { HubExpenseHead } from "@/components/today/hub/HubExpenseHead";
import { HubExpenseBody } from "@/components/today/hub/HubExpenseBody";

export function HubExpenseFields({ vm, t }: { vm: TodayHubVm; t: (key: string) => string }) {
  return (
    <>
      <HubExpenseHead vm={vm} t={t} />
      <HubExpenseBody vm={vm} t={t} />
    </>
  );
}
