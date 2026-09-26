import type { TodayHubVm } from "@/components/today/hub/today-hub-view-model";
import {
  HubExpensePowerConsumed,
  HubExpensePowerMeters,
  HubExpensePowerMonth,
} from "@/components/today/hub/HubExpensePowerReadings";
import { HubExpensePowerBillRow, HubExpensePowerNotes } from "@/components/today/hub/HubExpensePowerBill";

export function HubExpensePower({ vm, t }: { vm: TodayHubVm; t: (key: string) => string }) {
  return (
    <>
      <HubExpensePowerMonth vm={vm} />
      <HubExpensePowerMeters vm={vm} t={t} />
      <HubExpensePowerConsumed vm={vm} />
      <HubExpensePowerBillRow vm={vm} />
      <HubExpensePowerNotes vm={vm} t={t} />
    </>
  );
}
