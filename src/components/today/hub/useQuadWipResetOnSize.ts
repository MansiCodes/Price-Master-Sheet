import { useEffect } from "react";
import type { TodayHubStockState } from "@/components/today/hub/useTodayHubStockState";

export function useQuadWipResetOnSize(
  isQuad: boolean,
  stockKind: TodayHubStockState["stockKind"],
  resolvedQuadCableName: string,
  resolvedQuadSizeName: string,
  stock: Pick<
    TodayHubStockState,
    | "setStockProcessQtys"
    | "setStockWipOpening"
    | "setStockOpeningEditable"
    | "setStockWipSalesKm"
    | "setStockWipSalesLines"
  >,
) {
  useEffect(() => {
    if (!isQuad || stockKind !== "cable") return;
    stock.setStockProcessQtys({});
    stock.setStockWipOpening({});
    stock.setStockOpeningEditable(false);
    stock.setStockWipSalesKm(0);
    stock.setStockWipSalesLines([]);
  }, [isQuad, stockKind, resolvedQuadCableName, resolvedQuadSizeName]);
}
