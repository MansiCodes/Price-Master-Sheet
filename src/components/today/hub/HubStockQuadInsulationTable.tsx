import type { TodayHubVm } from "@/components/today/hub/today-hub-view-model";
import { bindStockLocals } from "@/components/today/hub/bind-today-hub-locals";
import { HubStockQuadProcessRow } from "@/components/today/hub/HubStockQuadProcessRow";

function HubStockQuadInsulationHeadRow() {
  return (
    <thead>
      <tr>
        <th>Opening</th>
        <th>Production</th>
        <th>Out</th>
        <th>Closing</th>
      </tr>
    </thead>
  );
}

export function HubStockQuadInsulationTable({ vm }: { vm: TodayHubVm }) {
  const {
    stockWipCalc, stockOpeningEditable, stockWipOpening, setStockWipOpening,
    stockProcessQtys, setStockProcessQtys,
  } = bindStockLocals(vm);
  return (
    <div className="qs-wip__table-wrap">
      <table className="qs-wip__table">
        <HubStockQuadInsulationHeadRow />
        <tbody>
          <HubStockQuadProcessRow
            proc="Insulation"
            hideProcessLabel
            stockWipCalc={stockWipCalc}
            stockOpeningEditable={stockOpeningEditable}
            stockWipOpening={stockWipOpening}
            setStockWipOpening={setStockWipOpening}
            stockProcessQtys={stockProcessQtys}
            setStockProcessQtys={setStockProcessQtys}
          />
        </tbody>
      </table>
    </div>
  );
}
