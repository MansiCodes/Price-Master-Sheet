import { getQuadSignalCableSizes } from "@/lib/plant-catalogs";

export function buildQuadCableSizeOptions(stockCable: string, customStockItems: string[]) {
  const cableKey = stockCable === "Other" ? "Other" : stockCable;
  const defaultSizes = getQuadSignalCableSizes(cableKey);
  const customSizes: string[] = [];
  const prefix = `${cableKey} · `;
  for (const item of customStockItems) {
    if (item.startsWith(prefix)) {
      const customSize = item.slice(prefix.length).trim();
      if (
        customSize &&
        !defaultSizes.includes(customSize as (typeof defaultSizes)[number]) &&
        !customSizes.includes(customSize)
      ) {
        customSizes.push(customSize);
      }
    }
  }
  const withoutOther = defaultSizes.filter((s) => s !== "Other");
  return [...withoutOther, ...customSizes, "Other"];
}
