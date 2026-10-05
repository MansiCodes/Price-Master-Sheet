import type { TodayHubVm } from "@/components/today/hub/today-hub-view-model";
import { bindStockLocals } from "@/components/today/hub/bind-today-hub-locals";

export function HubStockPowerLayingFactor({ vm }: { vm: TodayHubVm }) {
  const { isPowerCableStock, stockPowerLayingFactor, setStockPowerLayingFactor } =
    bindStockLocals(vm);
  if (!isPowerCableStock) return null;
  return (
    <label className="qs-wip__factor" htmlFor="power-laying-factor" title="Factor">
      <span className="qs-wip__factor-letter">F</span>
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
    </label>
  );
}
