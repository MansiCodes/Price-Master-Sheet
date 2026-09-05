export function isCat6Plant(code: string | null | undefined): boolean {
  return code?.trim().toUpperCase() === "CAT6";
}

/** P&L formula values stored as stock rows — not real Stock (UP&UK) items. */
export const CAT6_PNL_ONLY_STOCK_ITEMS = [
  "Opening Stock (CAT6)",
  "Additional Closing Stock (CAT6)",
] as const;

export function isCat6PnlOnlyStockItem(itemName: string): boolean {
  return (CAT6_PNL_ONLY_STOCK_ITEMS as readonly string[]).includes(itemName);
}

export function mapCat6PettyNature(nature: string): string {
  const n = nature.toUpperCase();
  if (
    n.includes("CONVEYANCE") ||
    n.includes("FREIGHT") ||
    n.includes("CARTAGE") ||
    n.includes("VEHICLE")
  ) {
    return "Transport";
  }
  if (n.includes("PRINTING") || n.includes("STATIONERY")) return "Office";
  if (n.includes("ELECTRICITY") || (n.includes("POWER") && !n.includes("MAINT"))) {
    return "Electricity";
  }
  if (n.includes("REPAIR") || n.includes("MAINT") || n.includes("ELECTRIC")) {
    return "Maintenance";
  }
  return "Miscellaneous";
}
