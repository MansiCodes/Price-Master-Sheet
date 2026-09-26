import type { TodayHubVm } from "@/components/today/hub/today-hub-view-model";
import { bindStockLocals } from "@/components/today/hub/bind-today-hub-locals";
import { HubStockRawItem, HubStockRawLedger } from "@/components/today/hub/HubStockRawLedger";
import { HubStockRawItemOther, HubStockRawSize, HubStockRawSizeOther } from "@/components/today/hub/HubStockRawOther";

export function HubStockRaw({ vm }: { vm: TodayHubVm }) {
  const { usesStockLedger } = bindStockLocals(vm);
  return (
    <>
      {usesStockLedger ? <HubStockRawLedger vm={vm} /> : <HubStockRawItem vm={vm} />}
      <HubStockRawItemOther vm={vm} />
      <HubStockRawSizeOther vm={vm} />
      <HubStockRawSize vm={vm} />
    </>
  );
}
