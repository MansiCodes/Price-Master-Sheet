import type { TodayHubVm } from "@/components/today/hub/today-hub-view-model";
import { bindStockLocals } from "@/components/today/hub/bind-today-hub-locals";
import { HubStockQuadProcessRow } from "@/components/today/hub/HubStockQuadProcessRow";
import { HubStockQuadWipTableHead } from "@/components/today/hub/HubStockQuadWipTableHead";

export function HubStockQuadDefaultBody({ vm }: { vm: TodayHubVm }) {
  const {
    quadCableProcessFields, stockWipCalc, stockOpeningEditable, stockWipOpening,
    setStockWipOpening, stockProcessQtys, setStockProcessQtys,
  } = bindStockLocals(vm);
  return (
    <tbody>
      {quadCableProcessFields.map((proc) => (
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

export function HubStockQuadDefaultTable({ vm }: { vm: TodayHubVm }) {
  return (
    <div className="qs-wip__table-wrap">
      <table className="qs-wip__table">
        <HubStockQuadWipTableHead />
        <HubStockQuadDefaultBody vm={vm} />
      </table>
    </div>
  );
}
