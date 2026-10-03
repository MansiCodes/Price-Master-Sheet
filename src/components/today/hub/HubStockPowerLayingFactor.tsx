import type { TodayHubVm } from "@/components/today/hub/today-hub-view-model";
import { bindStockLocals } from "@/components/today/hub/bind-today-hub-locals";

export function HubStockPowerLayingFactor({ vm }: { vm: TodayHubVm }) {
  const { isPowerCableStock, stockPowerLayingFactor, setStockPowerLayingFactor } =
    bindStockLocals(vm);
  if (!isPowerCableStock) return null;
  return (
    <div className="qs-wip__factor field" style={{ margin: "0 0 0.5rem", maxWidth: "6.5rem" }}>
      <label htmlFor="power-laying-factor">Factor</label>
      <input
        id="power-laying-factor"
        inputMode="numeric"
        maxLength={2}
        placeholder="00"
        value={stockPowerLayingFactor}
        onChange={(e) => {
          const next = e.target.value.replace(/\D/g, "").slice(0, 2);
          setStockPowerLayingFactor(next);
        }}
      />
    </div>
  );
}
