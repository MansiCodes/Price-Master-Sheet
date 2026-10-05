import type { Dispatch, ReactNode, SetStateAction } from "react";
import type { WipCalcResult } from "@/lib/quad-signal-wip";
import { processRowOpening, processRowOutLabel, isOuterProcessName, outerFormOutAndClose } from "@/components/today/hub/process-row-out-label";
import {
  HubStockQuadOpeningCell,
  HubStockQuadProductionCell,
} from "@/components/today/hub/HubStockQuadProcessCells";

type ProcessRowProps = {
  proc: string;
  hideProcessLabel?: boolean;
  processLabelExtra?: ReactNode;
  stockWipCalc: WipCalcResult | null;
  stockOpeningEditable: boolean;
  stockWipOpening: Record<string, string>;
  setStockWipOpening: Dispatch<SetStateAction<Record<string, string>>>;
  stockProcessQtys: Record<string, string>;
  setStockProcessQtys: Dispatch<SetStateAction<Record<string, string>>>;
  stockProcessHints?: Record<string, string>;
  orderPutupKm?: number;
};

export function HubStockQuadProcessRow(props: ProcessRowProps) {
  const stage = props.stockWipCalc?.stages.find((s) => s.process === props.proc);
  const openingVal = processRowOpening(stage, props.stockWipOpening, props.proc);
  const outerLive = isOuterProcessName(props.proc)
    ? outerFormOutAndClose(
        openingVal,
        props.stockProcessQtys[props.proc] ?? "",
        props.orderPutupKm ?? 0,
      )
    : null;
  return (
    <tr key={props.proc}>
      {props.hideProcessLabel ? null : props.processLabelExtra ? (
        <td>
          <div className="qs-wip__proc-cell">
            <span>{props.proc}</span>
            {props.processLabelExtra}
          </div>
        </td>
      ) : (
        <td>{props.proc}</td>
      )}
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
        hint={props.stockProcessHints?.[props.proc]}
      />
      <td className="qs-wip__num qs-wip__calc">
        {outerLive ? String(outerLive.out) : processRowOutLabel(stage)}
      </td>
      <td className="qs-wip__num qs-wip__calc">
        {outerLive
          ? String(outerLive.closing)
          : stage != null
            ? String(stage.closing)
            : "—"}
      </td>
    </tr>
  );
}
