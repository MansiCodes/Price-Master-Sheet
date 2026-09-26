import { DecimalInput } from "@/components/ui/DecimalInput";
import { formatINR } from "@/lib/format/inr";
import { PVC_UNLOADING_RATE_PER_MT } from "@/lib/plant-catalogs";
import type { TodayHubVm } from "@/components/today/hub/today-hub-view-model";
import { bindExpenseLocals } from "@/components/today/hub/bind-today-hub-locals";

export function HubExpenseUnloadQtyRow({ vm }: { vm: TodayHubVm }) {
  const { unloadQtyMt, setUnloadQtyMt, unloadRatePerMt, setUnloadRatePerMt, calculatedUnloadMt } =
    bindExpenseLocals(vm);
  return (
    <div className="prod-fields__row">
      <div className="field">
        <label htmlFor="e-unload-mt">Quantity (MT)</label>
        <DecimalInput
          id="e-unload-mt"
          value={unloadQtyMt || (Number(calculatedUnloadMt) > 0 ? calculatedUnloadMt : "")}
          onChange={setUnloadQtyMt}
        />
      </div>
      <div className="field">
        <label htmlFor="e-unload-rate">Rate (₹/MT)</label>
        <DecimalInput id="e-unload-rate" value={unloadRatePerMt} onChange={setUnloadRatePerMt} />
      </div>
    </div>
  );
}

export function HubExpenseUnloadHint({ vm }: { vm: TodayHubVm }) {
  const { unloadQtyMt, unloadRatePerMt, calculatedUnloadMt } = bindExpenseLocals(vm);
  return (
    <p className="cost-hint">
      Unloading amount{" "}
      <span className="cost-hint__amount">
        {formatINR(
          (Number(unloadQtyMt) > 0 ? Number(unloadQtyMt) : Number(calculatedUnloadMt) || 0) *
            (Number(unloadRatePerMt) > 0 ? Number(unloadRatePerMt) : PVC_UNLOADING_RATE_PER_MT),
        )}
      </span>
      {Number(calculatedUnloadMt) > 0 && !unloadQtyMt ? <> · from purchase qty today</> : null}
    </p>
  );
}
