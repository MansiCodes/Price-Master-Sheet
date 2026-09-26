import { formatINR } from "@/lib/format/inr";
import type { TodayHubVm } from "@/components/today/hub/today-hub-view-model";
import { bindStockLocals } from "@/components/today/hub/bind-today-hub-locals";

export function HubStockTotalValue({ vm }: { vm: TodayHubVm }) {
  const { stockTotalValue } = bindStockLocals(vm);
  if (stockTotalValue == null) return null;
  return (
    <div
      style={{
        gridColumn: "1 / -1",
        display: "flex",
        justifyContent: "flex-end",
        alignItems: "center",
        paddingRight: "0.75rem",
        marginTop: "0.35rem",
      }}
    >
      <p className="cost-hint stock-total-value" style={{ margin: 0, fontWeight: 700, fontSize: "0.92rem", whiteSpace: "nowrap" }}>
        Total value{" "}
        <span className="cost-hint__amount" style={{ fontSize: "1rem" }}>
          {formatINR(stockTotalValue)}
        </span>
      </p>
    </div>
  );
}

export function stockQtyGridClass(isQuad: boolean, stockKind: string, processCount: number) {
  return isQuad && stockKind === "cable" && processCount % 2 === 1 ? "prod-fields__row" : "form-grid three";
}
