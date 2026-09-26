import { getQuadSignalCableSizes } from "@/lib/plant-catalogs";
import type { TodayHubVm } from "@/components/today/hub/today-hub-view-model";
import { bindStockLocals } from "@/components/today/hub/bind-today-hub-locals";
import { HubStockInsulationExtraRow } from "@/components/today/hub/HubStockInsulationExtraRow";

function insulationExtraSizeOpts(vm: TodayHubVm) {
  const { isSignallingStock, isQuadCableStock, stockCable } = bindStockLocals(vm);
  const insCableType = isSignallingStock
    ? "Signalling Cable"
    : isQuadCableStock
      ? "Quad Cable"
      : stockCable;
  return [...getQuadSignalCableSizes(insCableType)];
}

export function HubStockQuadInsulationExtras({ vm }: { vm: TodayHubVm }) {
  const { stockInsulationExtras, setStockInsulationExtras } = bindStockLocals(vm);
  const insSizeOpts = insulationExtraSizeOpts(vm);
  return (
    <>
      {stockInsulationExtras.length > 0 ? (
        <div className="qs-wip__ins-extras">
          {stockInsulationExtras.map((extra) => (
            <HubStockInsulationExtraRow
              key={extra.id}
              extra={extra}
              insSizeOpts={insSizeOpts}
              setExtras={setStockInsulationExtras}
            />
          ))}
        </div>
      ) : null}
    </>
  );
}
