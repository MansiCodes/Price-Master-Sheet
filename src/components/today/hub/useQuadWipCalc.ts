import { useEffect, useMemo } from "react";
import type { WipCalcResult } from "@/lib/quad-signal-wip";
import type { TodayHubStockState } from "@/components/today/hub/useTodayHubStockState";
import { computeStockWipCalc } from "@/components/today/hub/compute-quad-wip-calc";

export function useQuadWipCalc(
  isQuad: boolean,
  stock: TodayHubStockState,
  quadCableProcessFields: string[],
) {
  const {
    stockKind, stockCable, stockProcessQtys, stockWipOpening, stockWipSalesKm, stockLengthFactor,
    stockInsulationExtras, stockSingleQuadExtras, stockOpeningEditable,
    stockWipContextLoading, resolvedQuadCableName, resolvedQuadSizeName, setStockQty,
  } = stock;
  const stockWipCalc: WipCalcResult | null = useMemo(
    () =>
      computeStockWipCalc(
        isQuad,
        {
          ...stock,
          stockCable,
          stockInsulationExtras,
          stockProcessQtys,
          stockWipOpening,
          stockLengthFactor,
          resolvedQuadCableName: resolvedQuadCableName || stockCable,
          resolvedQuadSizeName,
          stockWipContextLoading,
        },
        quadCableProcessFields,
      ),
    [
      isQuad, stockKind, stockCable, quadCableProcessFields, stockProcessQtys,
      stockSingleQuadExtras, stockWipOpening, stockWipSalesKm, resolvedQuadCableName,
      resolvedQuadSizeName, stockLengthFactor, stockInsulationExtras, stockOpeningEditable,
      stockWipContextLoading,
    ],
  );
  useEffect(() => {
    if (!stockWipCalc?.finishedProcess) return;
    const fin = stockWipCalc.byProcess[stockWipCalc.finishedProcess];
    if (fin == null || !Number.isFinite(fin)) return;
    setStockQty(String(fin));
  }, [stockWipCalc, setStockQty]);
  return stockWipCalc;
}
