import type { TodayHubVm } from "@/components/today/hub/today-hub-view-model";
import { HubStockQuadWipTableHead } from "@/components/today/hub/HubStockQuadWipTableHead";
import { HubStockQuadProcessBody } from "@/components/today/hub/HubStockQuadProcessBody";

export function HubStockQuadCableSheath({
  vm,
  quadOtherProcesses,
}: {
  vm: TodayHubVm;
  quadOtherProcesses: string[];
}) {
  return (
    <div className="qs-wip__box">
      <div className="qs-wip__box-head">
        <h4 className="qs-wip__box-title">Laying → Outer Sheath</h4>
      </div>
      <div className="qs-wip__table-wrap">
        <table className="qs-wip__table">
          <HubStockQuadWipTableHead />
          <HubStockQuadProcessBody vm={vm} processes={quadOtherProcesses} />
        </table>
      </div>
    </div>
  );
}
