import { normalizeCableName } from "@/lib/quad-signal-wip";
import { quadSignalCableSizeDedupeKey } from "@/lib/plant-catalogs";
import type { CableStockStatusBlock } from "@/lib/stock-production-status";
import { matchCableAndSize } from "@/lib/stock/order-excel-match";
import {
  lookupStockOrder,
  toSizeMatchKey,
  type StockOrderBySize,
} from "@/lib/stock/order-excel-types";
import {
  ALL_SIZES,
  CABLE_TYPES,
  catalogSizesForCable,
  type DisplayCard,
} from "./stock-status-constants";

export function buildDisplayCards({
  cablesInView,
  cableSize,
  blocksByKey,
  cableBlocks,
  ordersByKey,
  showAllCables,
  activeCable,
}: {
  cablesInView: string[];
  cableSize: string;
  blocksByKey: Map<string, CableStockStatusBlock>;
  cableBlocks: CableStockStatusBlock[];
  ordersByKey: Record<string, StockOrderBySize> | null;
  showAllCables: boolean;
  activeCable: string;
}): DisplayCard[] {
  const cards: DisplayCard[] = [];
  const seen = new Set<string>();

  for (const cable of cablesInView) {
    const sizes = catalogSizesForCable(cable);
    for (const size of sizes) {
      if (cableSize !== ALL_SIZES && toSizeMatchKey(size) !== toSizeMatchKey(cableSize)) continue;
      const dedupeKey = quadSignalCableSizeDedupeKey(cable, size);
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      cards.push({
        key: `${cable} · ${size}`,
        cable,
        size,
        block: blocksByKey.get(dedupeKey) ?? null,
      });
    }
  }

  for (const b of cableBlocks) {
    const dedupeKey = quadSignalCableSizeDedupeKey(b.cable, b.size);
    if (seen.has(dedupeKey)) continue;
    if (!showAllCables && normalizeCableName(b.cable) !== normalizeCableName(activeCable)) continue;
    if (cableSize !== ALL_SIZES && toSizeMatchKey(b.size) !== toSizeMatchKey(cableSize)) continue;
    seen.add(dedupeKey);
    cards.push({
      key: `${normalizeCableName(b.cable)} · ${b.size}`,
      cable: normalizeCableName(b.cable),
      size: b.size,
      block: b,
    });
  }

  if (ordersByKey) {
    for (const order of Object.values(ordersByKey)) {
      const matched = matchCableAndSize(order.size);
      const rawCable = matched?.cable || order.cable || "Signalling Cable";
      const cable = normalizeCableName(rawCable);
      const size = matched?.size || order.size;
      if (!size) continue;
      const dedupeKey = quadSignalCableSizeDedupeKey(cable, size);
      if (seen.has(dedupeKey)) continue;
      if (!showAllCables && cable !== normalizeCableName(activeCable)) continue;
      if (cableSize !== ALL_SIZES && toSizeMatchKey(size) !== toSizeMatchKey(cableSize)) continue;
      seen.add(dedupeKey);
      cards.push({
        key: `${cable} · ${size}`,
        cable,
        size,
        block: blocksByKey.get(dedupeKey) ?? null,
      });
    }
  }

  cards.sort((a, b) => {
    const aHas = a.block || lookupStockOrder(ordersByKey, a.cable, a.size) ? 0 : 1;
    const bHas = b.block || lookupStockOrder(ordersByKey, b.cable, b.size) ? 0 : 1;
    if (aHas !== bHas) return aHas - bHas;

    const aCable = CABLE_TYPES.indexOf(a.cable as (typeof CABLE_TYPES)[number]);
    const bCable = CABLE_TYPES.indexOf(b.cable as (typeof CABLE_TYPES)[number]);
    const aCableOrd = aCable === -1 ? 999 : aCable;
    const bCableOrd = bCable === -1 ? 999 : bCable;
    if (aCableOrd !== bCableOrd) return aCableOrd - bCableOrd;
    if (a.cable !== b.cable) return a.cable.localeCompare(b.cable);

    const sizes = catalogSizesForCable(a.cable);
    const aIdx = sizes.indexOf(a.size);
    const bIdx = sizes.indexOf(b.size);
    const aOrd = aIdx === -1 ? 9999 : aIdx;
    const bOrd = bIdx === -1 ? 9999 : bIdx;
    if (aOrd !== bOrd) return aOrd - bOrd;
    return a.size.localeCompare(b.size);
  });

  return cards;
}
