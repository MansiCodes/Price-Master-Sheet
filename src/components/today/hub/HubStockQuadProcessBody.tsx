import type { TodayHubVm } from "@/components/today/hub/today-hub-view-model";
import { bindStockLocals } from "@/components/today/hub/bind-today-hub-locals";
import { HubStockQuadProcessRow } from "@/components/today/hub/HubStockQuadProcessRow";
import { sumCallPutupKm } from "@/components/today/hub/process-row-out-label";

export function HubStockQuadProcessBody({
  vm,
  processes,
  independentClosing = false,
}: {
  vm: TodayHubVm;
  processes: string[];
  independentClosing?: boolean;
}) {
  const {
    stockWipCalc, stockOpeningEditable, stockWipOpening, setStockWipOpening,
    stockProcessQtys, setStockProcessQtys, stockProcessHints, stockCallPutupItems,
    stockCallPutupLoadedKm,
  } = bindStockLocals(vm);
  const formPutupKm = Math.max(stockCallPutupLoadedKm, sumCallPutupKm(stockCallPutupItems));
  return (
    <tbody>
      {processes.map((proc) => (
        <HubStockQuadProcessRow
          key={proc}
          proc={proc}
          stockWipCalc={stockWipCalc}
          stockOpeningEditable={stockOpeningEditable}
          stockWipOpening={stockWipOpening}
          setStockWipOpening={setStockWipOpening}
          stockProcessQtys={stockProcessQtys}
          setStockProcessQtys={setStockProcessQtys}
          stockProcessHints={stockProcessHints}
          orderPutupKm={formPutupKm}
          independentClosing={independentClosing}
        />
      ))}
    </tbody>
  );
}

export function signallingOtherProcesses(
  isSignallingStock: boolean,
  quadCableProcessFields: string[],
) {
  return isSignallingStock
    ? quadCableProcessFields.filter((p) => p.toLowerCase() !== "insulation")
    : quadCableProcessFields;
}
