import { SelectMenu } from "@/components/ui/SelectMenu";
import { STOCK_CATEGORIES } from "@/lib/plant-catalogs";
import { STOCK_CATEGORIES_OPTIONS } from "@/components/today/today-hub-model";
import type { TodayHubVm } from "@/components/today/hub/today-hub-view-model";
import { bindStockLocals } from "@/components/today/hub/bind-today-hub-locals";

export function HubStockRawCategory({ vm }: { vm: TodayHubVm }) {
  const { stockCategory, setStockCategory } = bindStockLocals(vm);
  return (
    <div className="field">
      <label htmlFor="st-category">Stock</label>
      <SelectMenu
        id="st-category"
        value={stockCategory}
        options={STOCK_CATEGORIES_OPTIONS}
        required
        onChange={(next) => setStockCategory(next as (typeof STOCK_CATEGORIES)[number])}
      />
    </div>
  );
}

export function HubStockRawLedger({ vm }: { vm: TodayHubVm }) {
  return (
    <div className="form-grid two">
      <HubStockRawCategory vm={vm} />
      <HubStockRawParticulars vm={vm} />
    </div>
  );
}

function HubStockRawParticulars({ vm }: { vm: TodayHubVm }) {
  const { stockItem, setStockItem, stockParticulars, setStockItemOther } = bindStockLocals(vm);
  return (
    <div className="field">
      <label htmlFor="st-item">Particulars</label>
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

export function HubStockRawItem({ vm }: { vm: TodayHubVm }) {
  const { stockItem, setStockItem, stockParticulars, setStockItemOther } = bindStockLocals(vm);
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
