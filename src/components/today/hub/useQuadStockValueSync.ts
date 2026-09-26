import { useEffect } from "react";
import type { TodayHubStockState } from "@/components/today/hub/useTodayHubStockState";
import { syncStockValueFromRate } from "@/components/today/hub/sync-stock-value-from-rate";

export function useQuadStockValueSync(stock: TodayHubStockState) {
  const { stockPurchaseRate, stockQty, stockRate, setStockRate, setStockValue } = stock;
  useEffect(() => {
    syncStockValueFromRate(stockPurchaseRate, stockQty, stockRate, setStockRate, setStockValue);
  }, [stockPurchaseRate, stockQty, stockRate, setStockRate, setStockValue]);
}
