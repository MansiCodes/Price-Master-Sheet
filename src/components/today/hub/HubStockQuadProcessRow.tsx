import type { Dispatch, SetStateAction } from "react";
import type { WipCalcResult } from "@/lib/quad-signal-wip";
import { processRowOpening, processRowOutLabel } from "@/components/today/hub/process-row-out-label";
import {
  HubStockQuadOpeningCell,
  HubStockQuadProductionCell,
} from "@/components/today/hub/HubStockQuadProcessCells";

type ProcessRowProps = {
  proc: string;
  hideProcessLabel?: boolean;
  stockWipCalc: WipCalcResult | null;
  stockOpeningEditable: boolean;
  stockWipOpening: Record<string, string>;
  setStockWipOpening: Dispatch<SetStateAction<Record<string, string>>>;
  stockProcessQtys: Record<string, string>;
  setStockProcessQtys: Dispatch<SetStateAction<Record<string, string>>>;
};

export function HubStockQuadProcessRow(props: ProcessRowProps) {
  const stage = props.stockWipCalc?.stages.find((s) => s.process === props.proc);
  const openingVal = processRowOpening(stage, props.stockWipOpening, props.proc);
  return (
    <tr key={props.proc}>
      {props.hideProcessLabel ? null : <td>{props.proc}</td>}
      <HubStockQuadOpeningCell
        proc={props.proc}
        stockOpeningEditable={props.stockOpeningEditable}
        stockWipOpening={props.stockWipOpening}
        setStockWipOpening={props.setStockWipOpening}
        openingVal={openingVal}
      />
      <HubStockQuadProductionCell
        proc={props.proc}
        stockProcessQtys={props.stockProcessQtys}
        setStockProcessQtys={props.setStockProcessQtys}
      />
      <td className="qs-wip__num qs-wip__calc">{processRowOutLabel(stage)}</td>
      <td className="qs-wip__num qs-wip__calc">{stage != null ? String(stage.closing) : "—"}</td>
    </tr>
  );
}
