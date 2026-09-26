import { normalizeCableName } from "@/lib/quad-signal-wip";
import { quadSignalCableSizeDedupeKey } from "@/lib/plant-catalogs";
import type { CableStockStatusBlock, RawMaterialStockRow } from "@/lib/stock-production-status";
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
  isCatalogCable,
  type DisplayCard,
} from "./stock-status-constants";

export function getPartyInHandKm(
  partyName: string,
  block?: CableStockStatusBlock | null,
): number {
  if (!block) return 0;
  const party = (partyName ?? "").trim().toLowerCase();
  const cleanParty = party.replace(/[^a-z0-9]/g, "");
  if (!cleanParty) return 0;

  function matchesParty(targetName: string): boolean {
    const target = (targetName ?? "").trim().toLowerCase();
    const cleanTarget = target.replace(/[^a-z0-9]/g, "");
    if (!cleanTarget) return false;
    if (cleanParty.includes(cleanTarget) || cleanTarget.includes(cleanParty)) {
      return true;
    }
    const words = target.split(/\s+/).filter((w) => w.length > 1);
    return words.length > 0 && words.every((w) => party.includes(w));
  }

  let putupSum = 0;
  if (Array.isArray(block.callPutupItems) && block.callPutupItems.length > 0) {
    for (const item of block.callPutupItems) {
      const q = Number(item.qty);
      const qty = Number.isFinite(q) && q > 0 ? q : 0;
      if (qty > 0 && matchesParty(item.partyName ?? "")) {
        putupSum += qty;
      }
    }
  } else if (block.putupKm && block.putupKm > 0) {
    if (matchesParty(block.partyName ?? "")) {
      putupSum = block.putupKm;
    }
  }

  let dispatchSum = 0;
  if (Array.isArray(block.dispatchPendingItems) && block.dispatchPendingItems.length > 0) {
    for (const item of block.dispatchPendingItems) {
      const q = Number(item.qty);
      const qty = Number.isFinite(q) && q > 0 ? q : 0;
      if (qty > 0 && matchesParty(item.dispatchParty ?? "")) {
        dispatchSum += qty;
      }
    }
  } else if (block.dispatchPending && block.dispatchPending > 0) {
    if (matchesParty(block.dispatchParty || block.partyName || "")) {
      dispatchSum = block.dispatchPending;
    }
  }

  return Math.round((putupSum + dispatchSum) * 10000) / 10000;
}

export function extraCablesFromBlocks(
  cableBlocks: CableStockStatusBlock[],
): string[] {
  const set = new Set<string>();
  for (const b of cableBlocks) {
    const cable = b.cable.trim();
    if (cable && !isCatalogCable(cable)) set.add(cable);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export function catalogSizesForView(
  showAllCables: boolean,
  activeCable: string,
): string[] {
  if (showAllCables) {
    const set = new Set<string>();
    for (const cable of CABLE_TYPES) {
      for (const s of catalogSizesForCable(cable)) set.add(s);
    }
    return Array.from(set);
  }
  return catalogSizesForCable(activeCable);
}

export function extraSizesFromData(
  cableBlocks: CableStockStatusBlock[],
  ordersByKey: Record<string, StockOrderBySize> | null,
  showAllCables: boolean,
  activeCable: string,
): string[] {
  const set = new Set<string>();
  for (const b of cableBlocks) {
    const cable = normalizeCableName(b.cable);
    if (
      !showAllCables &&
      cable !== normalizeCableName(activeCable)
    )
      continue;
    const known = new Set(catalogSizesForCable(cable));
    if (b.size && !known.has(b.size)) set.add(b.size);
  }
  if (ordersByKey) {
    for (const order of Object.values(ordersByKey)) {
      const matched = matchCableAndSize(order.size);
      const cable = matched?.cable || order.cable || "Signalling Cable";
      if (!showAllCables && cable !== activeCable) continue;
      const known = new Set(catalogSizesForCable(cable));
      const size = matched?.size || order.size;
      if (size && !known.has(size)) set.add(size);
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export function lookupCableBlock(
  blocksByKey: Map<string, CableStockStatusBlock>,
  cableBlocks: CableStockStatusBlock[],
  cable: string,
  size: string,
): CableStockStatusBlock | null {
  const direct = blocksByKey.get(quadSignalCableSizeDedupeKey(cable, size));
  if (direct) return direct;

  const sizeKey = toSizeMatchKey(size);
  const cableN = normalizeCableName(cable);
  if (!sizeKey) return null;

  for (const b of cableBlocks) {
    if (normalizeCableName(b.cable) !== cableN) continue;
    if (toSizeMatchKey(b.size) === sizeKey) return b;
  }
  return null;
}

export function blocksByDedupeKey(
  cableBlocks: CableStockStatusBlock[],
): Map<string, CableStockStatusBlock> {
  const map = new Map<string, CableStockStatusBlock>();
  for (const b of cableBlocks) {
    const key = quadSignalCableSizeDedupeKey(b.cable, b.size);
    if (!map.has(key)) {
      map.set(key, b);
    }
  }
  return map;
}

export function computeRawTotals(rawRows: RawMaterialStockRow[]) {
  let qty = 0;
  let value = 0;
  let hasQty = false;
  let hasValue = false;
  for (const row of rawRows) {
    if (!row.hasData) continue;
    if (row.qty != null && Number.isFinite(row.qty)) { qty += row.qty; hasQty = true; }
    if (row.value != null && Number.isFinite(row.value)) { value += row.value; hasValue = true; }
  }
  return {
    qty: hasQty ? Math.round(qty * 10000) / 10000 : null,
    value: hasValue ? Math.round(value * 10000) / 10000 : null,
    hasAny: hasQty || hasValue,
  };
}
