export function syncStockValueFromRate(
  stockPurchaseRate: number | null,
  stockQty: string,
  stockRate: string,
  setStockRate: (rate: string) => void,
  setStockValue: (value: string) => void,
) {
  if (stockPurchaseRate == null || stockQty === "") return;
  const qty = Number(stockQty);
  if (!Number.isFinite(qty)) return;
  const manualRate = Number(stockRate);
  if (!Number.isFinite(manualRate) || manualRate <= 0) {
    setStockRate(String(stockPurchaseRate));
  }
  const rateForValue =
    Number.isFinite(manualRate) && manualRate > 0 ? manualRate : stockPurchaseRate;
  setStockValue((qty * rateForValue).toFixed(2));
}
