import type { TodayHubVm } from "@/components/today/hub/today-hub-view-model";
import { bindStockLocals } from "@/components/today/hub/bind-today-hub-locals";
import { HubStockQuadCableInsulation } from "@/components/today/hub/HubStockQuadCableInsulation";
import { HubStockQuadCableSingleQuad } from "@/components/today/hub/HubStockQuadCableSingleQuad";
import { HubStockQuadCableSheath } from "@/components/today/hub/HubStockQuadCableSheath";
import { computeQuadCableWipDerived } from "@/components/today/hub/compute-quad-cable-wip";

export function HubStockQuadCableWip({ vm }: { vm: TodayHubVm }) {
  const { stockWipCalc, quadCableProcessFields, stockProcessQtys, stockSingleQuadExtras, resolvedQuadSizeName } =
    bindStockLocals(vm);
  const d = computeQuadCableWipDerived(
    stockWipCalc, quadCableProcessFields, stockProcessQtys, stockSingleQuadExtras, resolvedQuadSizeName,
  );
  return (
    <>
      <HubStockQuadCableInsulation vm={vm} insStage={d.insStage} />
      <HubStockQuadCableSingleQuad
        vm={vm}
        singleQuadStage={d.singleQuadStage}
        primaryQuadFactor={d.primaryQuadFactor}
        primaryLaying={d.primaryLaying}
        primaryRowOutbound={d.primaryRowOutbound}
        totalSingleQuadProd={d.totalSingleQuadProd}
        totalLayingProduced={d.totalLayingProduced}
      />
      <HubStockQuadCableSheath vm={vm} quadOtherProcesses={d.quadOtherProcesses} />
    </>
  );
}
