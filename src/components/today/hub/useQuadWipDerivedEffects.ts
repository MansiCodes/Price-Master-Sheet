import { useEffect } from "react";
import type { TodayHubStockState } from "@/components/today/hub/useTodayHubStockState";

export function useQuadCableUnitEffect(
  isQuad: boolean,
  stockKind: TodayHubStockState["stockKind"],
  setStockUnit: TodayHubStockState["setStockUnit"],
) {
  useEffect(() => {
    if (!isQuad) return;
    if (stockKind === "cable") {
      setStockUnit((u) => (u === "KGS" || !u ? "KM" : u));
    }
  }, [isQuad, stockKind, setStockUnit]);
}

export function useQuadCableSizeResetEffect(
  isQuad: boolean,
  stockKind: TodayHubStockState["stockKind"],
  stockCable: string,
  stockCableSize: string,
  quadCableSizeOptions: string[],
  stock: Pick<
    TodayHubStockState,
    | "setStockCableSize"
    | "setStockCableSizeOther"
    | "setStockProcessQtys"
    | "setStockInsulationExtras"
    | "setStockSingleQuadExtras"
    | "setStockWipOpening"
    | "setStockOpeningEditable"
  >,
) {
  useEffect(() => {
    if (!isQuad || stockKind !== "cable") return;
    if (!quadCableSizeOptions.includes(stockCableSize)) {
      stock.setStockCableSize(quadCableSizeOptions[0] ?? "Other");
      stock.setStockCableSizeOther("");
    }
    stock.setStockProcessQtys({});
    stock.setStockInsulationExtras([]);
    stock.setStockSingleQuadExtras([]);
    stock.setStockWipOpening({});
    stock.setStockOpeningEditable(false);
  }, [isQuad, stockKind, stockCable]); // eslint-disable-line react-hooks/exhaustive-deps
}
