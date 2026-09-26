import { SelectMenu } from "@/components/ui/SelectMenu";
import { QUAD_SIGNAL_STOCK_CABLES } from "@/lib/plant-catalogs";
import type { TodayHubVm } from "@/components/today/hub/today-hub-view-model";
import { bindStockLocals } from "@/components/today/hub/bind-today-hub-locals";

export function HubStockQuadItemField({ vm }: { vm: TodayHubVm }) {
  const { stockCable, setStockCable, setStockCableOther } = bindStockLocals(vm);
  return (
    <div className="field field--wide">
      <label htmlFor="st-cable">Item</label>
      <SelectMenu
        id="st-cable"
        value={stockCable}
        options={[...QUAD_SIGNAL_STOCK_CABLES]}
        required
        onChange={(next) => {
          setStockCable(next);
          if (next !== "Other") setStockCableOther("");
        }}
      />
    </div>
  );
}

export function HubStockQuadItemOther({ vm }: { vm: TodayHubVm }) {
  const { stockCable, stockCableOther, setStockCableOther } = bindStockLocals(vm);
  if (stockCable !== "Other") return null;
  return (
    <div className="field field--wide">
      <label htmlFor="st-cable-other">
        Other item <span style={{ color: "red" }}>*</span>
      </label>
      <input
        id="st-cable-other"
        required
        placeholder="Enter cable type"
        value={stockCableOther}
        onChange={(e) => setStockCableOther(e.target.value)}
      />
    </div>
  );
}
