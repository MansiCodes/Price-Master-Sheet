import { getQuadSignalCableSizes } from "@/lib/plant-catalogs";
import { resolveQuadSignalVariant } from "@/lib/quad-signal-wip";
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
  const {
    stockInsulationExtras, setStockInsulationExtras, stockLengthFactor, resolvedQuadSizeName,
    stockInsulationExtrasOpen,
  } = bindStockLocals(vm);
  const insSizeOpts = insulationExtraSizeOpts(vm);
  const variant = resolveQuadSignalVariant(resolvedQuadSizeName);
  const drumFallback =
    stockLengthFactor != null && Number.isFinite(stockLengthFactor) && stockLengthFactor > 0
      ? stockLengthFactor
      : variant?.lengthFactor ?? 1;
  if (!stockInsulationExtrasOpen) return null;
  return (
    <div className="qs-wip__ins-extras">
      {stockInsulationExtras.map((extra) => (
        <HubStockInsulationExtraRow
          key={extra.id}
          extra={extra}
          insSizeOpts={insSizeOpts}
          setExtras={setStockInsulationExtras}
          drumFallback={drumFallback}
        />
      ))}
    </div>
  );
}
