import { useEffect } from "react";
import type { EntryKind } from "@/components/today/today-hub-model";
import type { TodayHubStockState } from "@/components/today/hub/useTodayHubStockState";
import { startStockPurchaseRateLoad } from "@/components/today/hub/load-stock-purchase-rate";

export function useQuadPurchaseRate(
  kind: EntryKind,
  plantId: string,
  entryDate: string,
  stock: TodayHubStockState,
) {
  const {
    resolvedStockItemName,
    setStockPurchaseRate,
    setStockPurchaseRateLoading,
    setStockRate,
  } = stock;
  useEffect(() => {
    return startStockPurchaseRateLoad({
      kind,
      resolvedStockItemName,
      entryDate,
      plantId,
      setStockPurchaseRate,
      setStockPurchaseRateLoading,
      setStockRate,
    });
  }, [kind, resolvedStockItemName, entryDate, plantId]);
}
