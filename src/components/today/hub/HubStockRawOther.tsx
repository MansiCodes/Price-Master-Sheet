import { SelectMenu } from "@/components/ui/SelectMenu";
import type { TodayHubVm } from "@/components/today/hub/today-hub-view-model";
import { bindStockLocals } from "@/components/today/hub/bind-today-hub-locals";

export function HubStockRawItemOther({ vm }: { vm: TodayHubVm }) {
  const { stockItem, usesStockLedger, stockItemOther, setStockItemOther } = bindStockLocals(vm);
  if (stockItem !== "Others" && stockItem !== "Other" && stockItem !== "others") return null;
  return (
    <div className="field">
      <label htmlFor="st-item-other">
        {usesStockLedger ? "Other particulars" : "Other item"} <span style={{ color: "red" }}>*</span>
      </label>
      <input
        id="st-item-other"
        required
        placeholder={usesStockLedger ? "Enter particulars" : "Enter item name"}
        value={stockItemOther}
        onChange={(e) => setStockItemOther(e.target.value)}
      />
    </div>
  );
}

export function HubStockRawSizeOther({ vm }: { vm: TodayHubVm }) {
  const { isConductor, stockSize, stockSizeOther, setStockSizeOther } = bindStockLocals(vm);
  if (!isConductor || stockSize !== "others") return null;
  return (
    <div className="field">
      <label htmlFor="st-size-other">
        Other size <span style={{ color: "red" }}>*</span>
      </label>
      <input
        id="st-size-other"
        required
        placeholder="Enter size"
        value={stockSizeOther}
        onChange={(e) => setStockSizeOther(e.target.value)}
      />
    </div>
  );
}

export function HubStockRawSize({ vm }: { vm: TodayHubVm }) {
  const { isQuad, isConductor, stockCatalog, stockSize, setStockSize, setStockSizeOther } = bindStockLocals(vm);
  if (isQuad || !isConductor || !stockCatalog.sizes?.length) return null;
  return (
    <div className="field">
      <label htmlFor="st-size">Size</label>
      <SelectMenu
        id="st-size"
        value={stockSize || stockCatalog.sizes[0]}
        options={[...stockCatalog.sizes]}
        required
        onChange={(next) => {
          setStockSize(next);
          if (next !== "others") setStockSizeOther("");
        }}
      />
    </div>
  );
}
