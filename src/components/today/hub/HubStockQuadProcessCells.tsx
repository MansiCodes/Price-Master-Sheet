import type { Dispatch, SetStateAction } from "react";
import { DecimalInput } from "@/components/ui/DecimalInput";

export function HubStockQuadOpeningCell({
  proc,
  stockOpeningEditable,
  stockWipOpening,
  setStockWipOpening,
  openingVal,
}: {
  proc: string;
  stockOpeningEditable: boolean;
  stockWipOpening: Record<string, string>;
  setStockWipOpening: Dispatch<SetStateAction<Record<string, string>>>;
  openingVal: number;
}) {
  return (
    <td className="qs-wip__num">
      {stockOpeningEditable ? (
        <DecimalInput
          id={`st-open-${proc}`}
          value={stockWipOpening[proc] ?? ""}
          onChange={(next) => setStockWipOpening((prev) => ({ ...prev, [proc]: next }))}
          placeholder="0"
        />
      ) : (
        openingVal
      )}
    </td>
  );
}

export function HubStockQuadProductionCell({
  proc,
  stockProcessQtys,
  setStockProcessQtys,
}: {
  proc: string;
  stockProcessQtys: Record<string, string>;
  setStockProcessQtys: Dispatch<SetStateAction<Record<string, string>>>;
}) {
  return (
    <td>
      <DecimalInput
        id={`st-proc-${proc}`}
        value={stockProcessQtys[proc] ?? ""}
        onChange={(next) => setStockProcessQtys((prev) => ({ ...prev, [proc]: next }))}
        placeholder="0"
      />
    </td>
  );
}
