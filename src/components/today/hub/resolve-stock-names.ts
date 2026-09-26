export function resolveQuadCableName(stockCable: string, stockCableOther: string) {
  return stockCable === "Other" ? stockCableOther.trim() : stockCable.trim();
}

export function resolveQuadSizeName(stockCableSize: string, stockCableSizeOther: string) {
  return stockCableSize === "Other" ? stockCableSizeOther.trim() : stockCableSize.trim();
}

export function resolveStockItemName(stockItem: string, stockItemOther: string) {
  return stockItem === "Others" || stockItem === "Other" || stockItem === "others"
    ? stockItemOther.trim()
    : stockItem.trim();
}
