import { useMemo } from "react";

export function useStockTotalValue(stockQty: string, stockRate: string) {
  return useMemo(() => {
    const qty = Number(stockQty);
    const rate = Number(stockRate);
    if (!Number.isFinite(qty) || !Number.isFinite(rate)) return null;
    return qty * rate;
  }, [stockQty, stockRate]);
}
