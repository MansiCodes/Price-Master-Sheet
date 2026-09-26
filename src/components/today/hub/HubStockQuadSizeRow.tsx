import { SelectMenu } from "@/components/ui/SelectMenu";
import type { TodayHubVm } from "@/components/today/hub/today-hub-view-model";
import { bindStockLocals } from "@/components/today/hub/bind-today-hub-locals";

export function HubStockQuadSizeSelect({ vm }: { vm: TodayHubVm }) {
  const { stockCableSize, setStockCableSize, setStockCableSizeOther, quadCableSizeOptions } = bindStockLocals(vm);
  return (
    <div className="field">
      <label htmlFor="st-cable-size">Size</label>
      <SelectMenu
        id="st-cable-size"
        value={stockCableSize}
        options={quadCableSizeOptions}
        required
        onChange={(next) => {
          setStockCableSize(next);
          if (next !== "Other") setStockCableSizeOther("");
        }}
      />
    </div>
  );
}

export function HubStockQuadDrumSelect({ vm }: { vm: TodayHubVm }) {
  const { stockLengthOptions, stockLengthFactor, setStockLengthFactor } = bindStockLocals(vm);
  if (stockLengthOptions.length === 0) return <div className="field" aria-hidden />;
  return (
    <div className="field qs-wip__drum">
      <label htmlFor="st-drum-len">Drum / coil length</label>
      <SelectMenu
        id="st-drum-len"
        value={
          stockLengthOptions.find((o) => o.lengthFactor === stockLengthFactor)?.label ??
          stockLengthOptions[0]?.label ??
          ""
        }
        options={stockLengthOptions.map((o) => o.label)}
        required
        onChange={(next) => {
          const opt = stockLengthOptions.find((o) => o.label === next);
          if (opt) setStockLengthFactor(opt.lengthFactor);
        }}
      />
    </div>
  );
}

export function HubStockQuadSizeOther({ vm }: { vm: TodayHubVm }) {
  const { stockCableSize, stockCableSizeOther, setStockCableSizeOther } = bindStockLocals(vm);
  if (stockCableSize !== "Other") return null;
  return (
    <div className="field">
      <label htmlFor="st-cable-size-other">
        Other size <span style={{ color: "red" }}>*</span>
      </label>
      <input
        id="st-cable-size-other"
        required
        placeholder="Enter size"
        value={stockCableSizeOther}
        onChange={(e) => setStockCableSizeOther(e.target.value)}
      />
    </div>
  );
}
