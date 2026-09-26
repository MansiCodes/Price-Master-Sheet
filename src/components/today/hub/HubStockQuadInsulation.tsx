import type { TodayHubVm } from "@/components/today/hub/today-hub-view-model";
import { bindStockLocals } from "@/components/today/hub/bind-today-hub-locals";
import { HubStockQuadInsulationExtras } from "@/components/today/hub/HubStockQuadInsulationExtras";
import { nextInsulationExtra } from "@/components/today/hub/add-insulation-extra";
import { HubStockQuadInsulationTable } from "@/components/today/hub/HubStockQuadInsulationTable";

export function HubStockQuadInsulationHead({ vm }: { vm: TodayHubVm }) {
  const { setStockInsulationExtras, resolvedQuadSizeName, stockWipContextLoading } = bindStockLocals(vm);
  return (
    <>
      <div className="qs-wip__box-head">
        <h4 className="qs-wip__box-title">Insulation</h4>
        <button
          type="button"
          className="qs-wip__ins-add"
          aria-label="Add size for Insulation"
          title="Add size"
          onClick={() =>
            setStockInsulationExtras((prev) => nextInsulationExtra("Signalling Cable", resolvedQuadSizeName, prev))
          }
        >
          +
        </button>
      </div>
      <p className="qs-wip__box-note">
        {stockWipContextLoading
          ? "Loading opening from stock…"
          : "Shared for all Signalling sizes. Use + to add another size."}
      </p>
    </>
  );
}

export function HubStockQuadInsulation({ vm }: { vm: TodayHubVm }) {
  return (
    <div className="qs-wip__box">
      <HubStockQuadInsulationHead vm={vm} />
      <HubStockQuadInsulationTable vm={vm} />
      <HubStockQuadInsulationExtras vm={vm} />
    </div>
  );
}
