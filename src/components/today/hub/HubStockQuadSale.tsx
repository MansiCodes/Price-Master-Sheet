import type { TodayHubVm } from "@/components/today/hub/today-hub-view-model";
import { bindStockLocals } from "@/components/today/hub/bind-today-hub-locals";
import { EMPTY_STOCK_SALE_ITEM } from "@/components/today/hub/useTodayHubStockCallFields";
import { HubStockSaleRow } from "@/components/today/hub/HubStockSaleRow";

export function HubStockQuadSale({ vm }: { vm: TodayHubVm }) {
  const { stockSaleItems, setStockSaleItems, stockSaleHints } = bindStockLocals(vm);
  return (
    <div className="qs-wip__box">
      <div className="qs-wip__box-head">
        <h4 className="qs-wip__box-title">Sale</h4>
        <button
          type="button"
          className="qs-wip__ins-add"
          aria-label="Add sale row"
          onClick={() => setStockSaleItems((prev) => [...prev, { ...EMPTY_STOCK_SALE_ITEM }])}
        >
          +
        </button>
      </div>
      {stockSaleItems.map((item, idx) => (
        <HubStockSaleRow
          key={`sale-${idx}`}
          item={item}
          idx={idx}
          count={stockSaleItems.length}
          setItems={setStockSaleItems}
          hint={stockSaleHints[idx]}
          onRemove={(i) => setStockSaleItems((prev) => prev.filter((_, j) => j !== i))}
        />
      ))}
    </div>
  );
}
