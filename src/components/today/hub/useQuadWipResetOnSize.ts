import type { TodayHubStockState } from "@/components/today/hub/useTodayHubStockState";

/** Size changes load opening/production via quad-wip-context. Do not wipe production here. */
export function useQuadWipResetOnSize(
  _isQuad: boolean,
  _stockKind: TodayHubStockState["stockKind"],
  _resolvedQuadCableName: string,
  _resolvedQuadSizeName: string,
  _stock: Pick<
    TodayHubStockState,
    | "setStockProcessQtys"
    | "setStockWipOpening"
    | "setStockOpeningEditable"
    | "setStockWipSalesKm"
    | "setStockWipSalesLines"
  >,
) {}
