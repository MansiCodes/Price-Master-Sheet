import type { TodayHubVm } from "@/components/today/hub/today-hub-view-model";
import { bindStockLocals } from "@/components/today/hub/bind-today-hub-locals";
import { HubStockQuadItemField, HubStockQuadItemOther } from "@/components/today/hub/HubStockQuadItemField";
import {
  HubStockQuadDrumSelect,
  HubStockQuadSizeOther,
  HubStockQuadSizeSelect,
} from "@/components/today/hub/HubStockQuadSizeRow";

export function HubStockQuadHeader({ vm }: { vm: TodayHubVm }) {
  const { isSignallingStock } = bindStockLocals(vm);
  return (
    <>
      <HubStockQuadItemField vm={vm} />
      <HubStockQuadItemOther vm={vm} />
      {!isSignallingStock ? (
        <>
          <div className="form-grid two">
            <HubStockQuadSizeSelect vm={vm} />
            <HubStockQuadDrumSelect vm={vm} />
          </div>
          <HubStockQuadSizeOther vm={vm} />
        </>
      ) : null}
    </>
  );
}
