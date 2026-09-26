import type { TodayHubVm } from "@/components/today/hub/today-hub-view-model";
import { bindStockLocals } from "@/components/today/hub/bind-today-hub-locals";
import {
  HubStockQuadDrumSelect,
  HubStockQuadSizeOther,
  HubStockQuadSizeSelect,
} from "@/components/today/hub/HubStockQuadSizeRow";
import { HubStockQuadWipTableHead } from "@/components/today/hub/HubStockQuadWipTableHead";
import {
  HubStockQuadProcessBody,
  signallingOtherProcesses,
} from "@/components/today/hub/HubStockQuadProcessBody";

export function HubStockQuadSignallingSize({ vm }: { vm: TodayHubVm }) {
  return (
    <div className="qs-wip__size-for-chain">
      <div className="form-grid two">
        <HubStockQuadSizeSelect vm={vm} />
        <HubStockQuadDrumSelect vm={vm} />
      </div>
      <HubStockQuadSizeOther vm={vm} />
    </div>
  );
}

export function HubStockQuadSignallingTable({ vm }: { vm: TodayHubVm }) {
  const { isSignallingStock, quadCableProcessFields } = bindStockLocals(vm);
  const otherProcesses = signallingOtherProcesses(isSignallingStock, quadCableProcessFields);
  return (
    <div className="qs-wip__box">
      <div className="qs-wip__box-head">
        <h4 className="qs-wip__box-title">Laying → Outer Sheath</h4>
      </div>
      <div className="qs-wip__table-wrap">
        <table className="qs-wip__table">
          <HubStockQuadWipTableHead />
          <HubStockQuadProcessBody vm={vm} processes={otherProcesses} />
        </table>
      </div>
    </div>
  );
}

export function HubStockQuadSignallingRest({ vm }: { vm: TodayHubVm }) {
  return (
    <>
      <HubStockQuadSignallingSize vm={vm} />
      <HubStockQuadSignallingTable vm={vm} />
    </>
  );
}
