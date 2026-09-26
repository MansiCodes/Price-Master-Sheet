export function applyUpcastClosing(
  opening: string,
  incoming: string,
  outward: string,
  stockRate: string,
  setStockQty: (qty: string) => void,
  setStockValue: (value: string) => void,
) {
  const o = Number(opening) || 0;
  const i = Number(incoming) || 0;
  const w = Number(outward) || 0;
  const c = Math.max(0, o + i - w);
  setStockQty(String(c));
  const rate = Number(stockRate);
  if (Number.isFinite(rate)) {
    setStockValue((c * rate).toFixed(2));
  }
}
