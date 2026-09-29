import type { QuadSignalStockMeta } from "@/lib/plant-catalogs";

export type DispatchPartyQty = {
  qty: number;
  dispatchParty: string;
};

export function dispatchPartyKey(name: string) {
  return (name ?? "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function dispatchPartiesMatch(a: string, b: string) {
  const ka = dispatchPartyKey(a);
  const kb = dispatchPartyKey(b);
  if (!ka || !kb) return false;
  if (ka === kb) return true;
  return ka.includes(kb) || kb.includes(ka);
}

function existingPartyKey(
  map: Map<string, { qty: number; partyName: string }>,
  name: string,
) {
  const k = dispatchPartyKey(name);
  if (!k) return "";
  if (map.has(k)) return k;
  for (const ek of map.keys()) {
    if (ek && (ek.includes(k) || k.includes(ek))) return ek;
  }
  return k;
}

export function accumulateDispatch(
  rows: Array<{ qty?: number | string; partyName?: string; dispatchParty?: string }>,
): Map<string, { qty: number; partyName: string }> {
  const map = new Map<string, { qty: number; partyName: string }>();
  for (const row of rows) {
    const q = Number(row.qty);
    const qty = Number.isFinite(q) && q > 0 ? q : 0;
    const partyName = String(row.partyName ?? row.dispatchParty ?? "").trim();
    if (qty <= 0 && !partyName) continue;
    const k = existingPartyKey(map, partyName) || `__${qty}`;
    const prev = map.get(k);
    const longer =
      partyName.length >= (prev?.partyName.length ?? 0) ? partyName : prev?.partyName ?? "";
    map.set(k, {
      qty: Math.max(prev?.qty ?? 0, qty),
      partyName: longer,
    });
  }
  return map;
}

export function collapseDispatchRows(
  rows: Array<{ qty?: number | string; partyName?: string; dispatchParty?: string }>,
): DispatchPartyQty[] {
  return Array.from(accumulateDispatch(rows).values()).map((row) => ({
    qty: row.qty,
    dispatchParty: row.partyName,
  }));
}

export function pendingOnlyFromMeta(
  meta: QuadSignalStockMeta,
  fallbackParty = "",
): Array<{ qty: number | string; partyName?: string }> {
  const party = String(meta.dispatchParty ?? fallbackParty ?? "").trim();
  const pendingRaw = Number(meta.dispatchPending);
  if (Array.isArray(meta.dispatchPendingItems) && meta.dispatchPendingItems.length > 0) {
    return meta.dispatchPendingItems;
  }
  if ((Number.isFinite(pendingRaw) && pendingRaw > 0) || party) {
    return [{ qty: Number.isFinite(pendingRaw) ? pendingRaw : 0, partyName: party }];
  }
  return [];
}

export function settledFromHistory(
  history: Array<{ qty?: number | string; partyName?: string; dispatchParty?: string }>,
  pending: Array<{ qty?: number | string; partyName?: string; dispatchParty?: string }>,
): { settledItems: DispatchPartyQty[]; settledKm: number } {
  const hist = accumulateDispatch(history);
  const pend = accumulateDispatch(pending);
  const settledItems: DispatchPartyQty[] = [];
  let settledKm = 0;
  for (const [k, h] of hist) {
    let still = 0;
    if (pend.has(k)) still = pend.get(k)!.qty;
    else {
      for (const [pk, pv] of pend) {
        if (dispatchPartiesMatch(h.partyName, pv.partyName) || pk === k) {
          still = Math.max(still, pv.qty);
        }
      }
    }
    const gone = Math.round(Math.max(0, h.qty - still) * 1000) / 1000;
    if (gone <= 0) continue;
    settledItems.push({ qty: gone, dispatchParty: h.partyName });
    settledKm += gone;
  }
  return { settledItems, settledKm: Math.round(settledKm * 1000) / 1000 };
}

/** Recompute gone-km from the current form vs last loaded pending + prior settled. */
export function liveDispatchLock(
  pending: Array<{ qty?: number | string; partyName?: string; dispatchParty?: string }>,
  loadedPending: Array<{ qty?: number | string; partyName?: string; dispatchParty?: string }>,
  prevSettled: Array<{ qty?: number | string; partyName?: string; dispatchParty?: string }>,
) {
  return settledFromHistory([...loadedPending, ...prevSettled], pending);
}
