import type { StockSingleQuadExtra } from "@/components/today/today-hub-model";
import { HubStockQuadSingleQuadExtraRow } from "@/components/today/hub/HubStockQuadSingleQuadExtraRow";

export function HubStockQuadSingleQuadExtras({
  extras,
  sizeOpts,
  onChange,
}: {
  extras: StockSingleQuadExtra[];
  sizeOpts: string[];
  onChange: (next: StockSingleQuadExtra[]) => void;
}) {
  return (
    <>
      {extras.map((extra) => (
        <HubStockQuadSingleQuadExtraRow
          key={extra.id}
          extra={extra}
          extras={extras}
          sizeOpts={sizeOpts}
          onChange={onChange}
        />
      ))}
    </>
  );
}
