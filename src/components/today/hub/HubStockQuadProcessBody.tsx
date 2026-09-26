import type { TodayHubVm } from "@/components/today/hub/today-hub-view-model";
import { bindStockLocals } from "@/components/today/hub/bind-today-hub-locals";
import { HubStockQuadProcessRow } from "@/components/today/hub/HubStockQuadProcessRow";

export function HubStockQuadProcessBody({ vm, processes }: { vm: TodayHubVm; processes: string[] }) {
  const {
    stockWipCalc, stockOpeningEditable, stockWipOpening, setStockWipOpening,
    stockProcessQtys, setStockProcessQtys,
  } = bindStockLocals(vm);
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
