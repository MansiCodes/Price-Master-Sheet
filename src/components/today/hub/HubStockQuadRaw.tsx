import { SelectMenu } from "@/components/ui/SelectMenu";
import type { TodayHubVm } from "@/components/today/hub/today-hub-view-model";
import { bindStockLocals } from "@/components/today/hub/bind-today-hub-locals";

export function HubStockQuadRawItem({ vm }: { vm: TodayHubVm }) {
  const { stockItem, stockParticulars, setStockItem, setStockItemOther } = bindStockLocals(vm);
  return (
    <div className="field field--wide">
      <label htmlFor="st-item">Item</label>
      <SelectMenu
        id="st-item"
        value={stockItem || stockParticulars[0]}
        options={stockParticulars}
        required
        onChange={(next) => {
          setStockItem(next);
          if (next !== "Others" && next !== "Other" && next !== "others") setStockItemOther("");
        }}
      />
    </div>
  );
}

export function HubStockQuadRawOther({ vm }: { vm: TodayHubVm }) {
  const { stockItem, stockItemOther, setStockItemOther } = bindStockLocals(vm);
  if (stockItem !== "Others" && stockItem !== "Other" && stockItem !== "others") return null;
  return (
    <div className="field field--wide">
      <label htmlFor="st-item-other">
        Other raw material <span style={{ color: "red" }}>*</span>
      </label>
      <input
        id="st-item-other"
        required
        placeholder="Enter raw material"
        value={stockItemOther}
        onChange={(e) => setStockItemOther(e.target.value)}
      />
    </div>
  );
}

export function HubStockQuadRaw({ vm }: { vm: TodayHubVm }) {
  return (
    <>
      <HubStockQuadRawItem vm={vm} />
      <HubStockQuadRawOther vm={vm} />
    </>
  );
}
