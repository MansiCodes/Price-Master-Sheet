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

/**
 * Compact size key: digits + first letter of unit words + variant suffixes (LSZH, XLPE, etc.).
 * "12 Core x 1.5 sqmm LSZH" → "12c1.5lszh"
 * "12 Core x 1.5 sqmm" → "12c1.5"
 */
export function toSizeMatchKey(raw: string): string {
  let s = raw.toLowerCase().trim();
  if (!s) return "";
  s = s.replace(/\([^)]*\)/g, " ");
  s = s.replace(/\blzsh\b/gi, "lszh");
  s = s.replace(
    /\b(outer|sheath|dia\.?|hold|grey|gray|yellow|black|green|red|clr|colour|color)\b/gi,
    " ",
  );
  s = s.replace(/\bcores?\b/g, "c");
  s = s.replace(/\bquads?\b/g, "q");
  s = s.replace(/\bpairs?\b/g, "p");
  s = s.replace(/sq\.?\s*m\.?m\.?/g, "");
  s = s.replace(/mm2/g, "");
  s = s.replace(/mm\b/g, "");
  s = s.replace(/\bx\b/g, " ");
  s = s.replace(/\batc\b/g, "atc");
  s = s.replace(/\babc\b/g, "abc");
  s = s.replace(/[^a-z0-9./]/g, "");
  return s;
}

/** Lookup order for a stock card (cable + size). */
export function lookupStockOrder(
  byKey: Record<string, StockOrderBySize> | null | undefined,
  cable: string,
  size: string,
): StockOrderBySize | null {
  if (!byKey) return null;

  // 1. Direct key match (e.g. "Signalling Cable · 12 Core x 1.5sqmm LSZH")
  const direct = byKey[orderKey(cable, size)];
  if (direct) return direct;

  // 2. Exact size string match
  const sizeHits = Object.values(byKey).filter((o) => o.size === size);
  if (sizeHits.length === 1) return sizeHits[0]!;
  const sameCable = sizeHits.find((o) => o.cable === cable);
  if (sameCable) return sameCable;

  // 3. Variant-aware fuzzy match (preserves LSZH, XLPE, LZSH, etc.)
  const cardMatchKey = toSizeMatchKey(size);
  if (cardMatchKey) {
    const hits = Object.values(byKey).filter((o) => {
      if (o.cable && o.cable !== cable) return false;
      return toSizeMatchKey(o.size) === cardMatchKey;
    });
    if (hits.length > 0) return hits[0]!;
  }

  return null;
}
