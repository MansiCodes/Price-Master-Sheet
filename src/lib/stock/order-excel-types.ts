/** Shared types / lookup for Quad + Signal stock orders Excel (safe for client). */

export type StockOrderPartyLine = {
  partyName: string;
  qty: number;
  deliveryPeriod: string | null;
};

export type StockOrderBySize = {
  /** Catalog cable type, or "" when Excel had no cable column. */
  cable: string;
  size: string;
  totalQty: number;
  parties: StockOrderPartyLine[];
};

export type ParseStockOrdersResult = {
  byKey: Record<string, StockOrderBySize>;
  matchedRows: number;
  unmatchedSizes: string[];
  skippedRows: number;
};

export function orderKey(cable: string, size: string): string {
  return `${cable} · ${size}`;
}

/** Lookup order for a stock card (cable + size). */
export function lookupStockOrder(
  byKey: Record<string, StockOrderBySize> | null | undefined,
  cable: string,
  size: string,
): StockOrderBySize | null {
  if (!byKey) return null;
  const direct = byKey[orderKey(cable, size)];
  if (direct) return direct;
  const sizeHits = Object.values(byKey).filter((o) => o.size === size);
  if (sizeHits.length === 1) return sizeHits[0]!;
  const sameCable = sizeHits.find((o) => o.cable === cable);
  return sameCable ?? null;
}
