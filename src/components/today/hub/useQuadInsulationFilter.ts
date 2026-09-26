import { useEffect } from "react";
import type { TodayHubStockState } from "@/components/today/hub/useTodayHubStockState";

export function useQuadInsulationFilter(
  isSignallingStock: boolean,
  resolvedQuadSizeName: string,
  setStockInsulationExtras: TodayHubStockState["setStockInsulationExtras"],
) {
  useEffect(() => {
    if (!isSignallingStock) return;
    setStockInsulationExtras((prev) =>
      prev.filter((row) => {
        const name = row.size === "Other" ? row.sizeOther.trim() : row.size.trim();
        return name !== resolvedQuadSizeName;
      }),
    );
  }, [isSignallingStock, resolvedQuadSizeName, setStockInsulationExtras]);
}
