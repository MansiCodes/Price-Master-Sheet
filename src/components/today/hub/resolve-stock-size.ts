export function resolveConductorStockSize(
  isConductor: boolean,
  stockSize: string,
  stockSizeOther: string,
) {
  if (!isConductor) return "";
  return stockSize === "others" ? stockSizeOther.trim() : stockSize.trim();
}
