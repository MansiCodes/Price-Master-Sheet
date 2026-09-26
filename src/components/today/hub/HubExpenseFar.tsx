import type { TodayHubVm } from "@/components/today/hub/today-hub-view-model";
import { HubExpenseFarVendor } from "@/components/today/hub/HubExpenseFarVendor";
import {
  HubExpenseFarBillRow,
  HubExpenseFarDesc,
  HubExpenseFarGstRow,
} from "@/components/today/hub/HubExpenseFarCost";

export function HubExpenseFar({ vm }: { vm: TodayHubVm; t: (key: string) => string }) {
  return (
    <>
      <HubExpenseFarVendor vm={vm} />
      <HubExpenseFarDesc vm={vm} />
      <HubExpenseFarBillRow vm={vm} />
      <HubExpenseFarGstRow vm={vm} />
    </>
  );
}
