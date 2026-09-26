import type { TodayHubVm } from "@/components/today/hub/today-hub-view-model";
import { bindStockLocals } from "@/components/today/hub/bind-today-hub-locals";
import { HubStockQuadInsulation } from "@/components/today/hub/HubStockQuadInsulation";
import { HubStockQuadSignallingRest } from "@/components/today/hub/HubStockQuadSignallingRest";
import { HubStockQuadCableWip } from "@/components/today/hub/HubStockQuadCableWip";
import { HubStockQuadDefaultTable } from "@/components/today/hub/HubStockQuadDefaultTable";
import { HubStockQuadCallPutup } from "@/components/today/hub/HubStockQuadCallPutup";
import { HubStockQuadDispatch } from "@/components/today/hub/HubStockQuadDispatch";

export function HubStockQuadWip({ vm }: { vm: TodayHubVm }) {
  const { isSignallingStock, isQuadCableStock, stockWipCalc } = bindStockLocals(vm);

  return (
    <div className="field qs-wip">
      {isSignallingStock ? (
        <>
          <HubStockQuadInsulation vm={vm} />
          <HubStockQuadSignallingRest vm={vm} />
        </>
      ) : isQuadCableStock ? (
        <HubStockQuadCableWip vm={vm} />
      ) : (
        <HubStockQuadDefaultTable vm={vm} />
      )}
      <HubStockQuadCallPutup vm={vm} />
      <HubStockQuadDispatch vm={vm} />
      {stockWipCalc?.warnings?.length ? (
        <div className="alert alert--error">
          {stockWipCalc.warnings.join(" ")}
        </div>
      ) : null}
    </div>
  );
}
