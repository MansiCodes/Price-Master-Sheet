export type SaleCategoryKey = "GOODS" | "FREIGHT" | "INSPECTION" | "INTEREST";

export function getSaleCategory(sale: {
  type?: string | null;
  typeOther?: string | null;
  itemDescription?: string | null;
}): SaleCategoryKey {
  const t = (sale.type ?? "").toUpperCase();
  const other = (sale.typeOther ?? "").toLowerCase();
  const item = (sale.itemDescription ?? "").toLowerCase();

  if (
    t === "FREIGHT_ON_SALE" ||
    other.includes("freight") ||
    item.includes("freight")
  ) {
    return "FREIGHT";
  }
  if (
    t === "INSPECTION_CHARGE" ||
    other.includes("inspection") ||
    item.includes("inspection")
  ) {
    return "INSPECTION";
  }
  if (
    t === "INTEREST_INCOME" ||
    other.includes("interest") ||
    item.includes("interest") ||
    other.includes("lc charge") ||
    item.includes("lc charge")
  ) {
    return "INTEREST";
  }
  return "GOODS";
}
