import {
  getQuadSignalCableProcesses,
  parseQuadSignalStockNotes,
  quadSignalCableSizeDedupeKey,
  quadSignalClosingFromMeta,
  type QuadSignalStockMeta,
} from "@/lib/plant-catalogs";
import { toIstDateString } from "@/lib/dates";
import { getQuadFactorFromSize, isSignallingCableName } from "@/lib/quad-signal-wip";
import {
  isIdleSizeWipFill,
  processQtyFromMeta,
  signallingProcessClosingsFromMeta,
  stageClosingFromMeta,
} from "@/lib/quad-signal-opening-match";
import { pickSharedInsulationPool, pickNewestInsulation, familyInsulationCandidate } from "./build-cable-insulation";
import {
  isOuterProcess,
  outerClosingAfterPutup,
  parsePutupKm,
  shortProcessName,
} from "./format";
import type { CableStockStatusBlock, SharedInsulationStatus, StockProcessLine } from "./types";
import { collapseDispatchRows } from "./dispatch-history";

type PutupRow = {
  qty: number;
  callPutup: string;
  putupDate: string;
  partyName: string;
};

function normalizePutupDate(date: string): string {
  const s = String(date ?? "").trim();
  if (!s) return "";
  const iso = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1]!;
  return s.toLowerCase().replace(/[^0-9]/g, "");
}

function putupPartyKey(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function putupMergeKey(item: PutupRow): string {
  const party = putupPartyKey(item.partyName);
  const date = normalizePutupDate(item.putupDate);
  const qty = String(Math.round(item.qty * 1000) / 1000);
  if (party && date) return `${party}|${date}|${qty}`;
  if (party) return `${party}|${qty}`;
  return `|${date}|${qty}`;
}

function isSamePutup(a: PutupRow, b: PutupRow): boolean {
  const pa = putupPartyKey(a.partyName);
  const pb = putupPartyKey(b.partyName);
  if (!pa || !pb) return false;
  if (pa !== pb && !pa.includes(pb) && !pb.includes(pa)) return false;
  if (Math.round(a.qty * 1000) !== Math.round(b.qty * 1000)) return false;
  const da = normalizePutupDate(a.putupDate);
  const db = normalizePutupDate(b.putupDate);
  return !da || !db || da === db;
}

function mergeOrderPutups(into: PutupRow[], extras: PutupRow[]): PutupRow[] {
  const seen = new Set(into.map(putupMergeKey));
  const next = [...into];
  for (const item of extras) {
    const key = putupMergeKey(item);
    if (key && seen.has(key)) continue;
    if (next.some((row) => isSamePutup(row, item))) continue;
    if (key) seen.add(key);
    next.push(item);
  }
  return next;
}

function putupItemsFromMeta(meta: QuadSignalStockMeta): PutupRow[] {
  const legacyPutupKm = parsePutupKm(meta.callPutup);
  const callPutup = String(meta.callPutup ?? "").trim();
  const putupDate = String(meta.putupDate ?? "").trim();
  const partyName = String(meta.partyName ?? "").trim();
  const rawPutupItems =
    Array.isArray(meta.callPutupItems) && meta.callPutupItems.length > 0
      ? meta.callPutupItems
      : legacyPutupKm > 0 || callPutup || partyName
        ? [{ qty: legacyPutupKm > 0 ? legacyPutupKm : callPutup, date: putupDate, partyName }]
        : [];
  return rawPutupItems
    .map((item) => {
      const q = Number(item.qty);
      const qty = Number.isFinite(q) && q > 0 ? q : 0;
      const callPutupStr = String(item.qty ?? "").trim();
      const pDate = String(item.date ?? putupDate ?? "").trim();
      const pName = String(item.partyName ?? partyName ?? "").trim();
      return {
        qty,
        callPutup: callPutupStr ? `${callPutupStr}km` : "",
        putupDate: pDate,
        partyName: pName,
      };
    })
    .filter((item) => item.qty > 0);
}

function singleQuadClosingFromMeta(
  meta: QuadSignalStockMeta,
  size: string,
  storedClosing: number,
): number {
  const opening = processQtyFromMeta(meta.opening, "Single Quad");
  const prod = processQtyFromMeta(meta.production, "Single Quad");
  const laying = processQtyFromMeta(meta.production, "Laying");
  const outbound = laying * getQuadFactorFromSize(size);
  if (opening === 0 && prod === 0 && laying === 0) return storedClosing;
  return Math.round((opening + prod - outbound) * 1000) / 1000;
}

function processLinesFromMeta(
  meta: QuadSignalStockMeta,
  cable: string,
  size: string,
): StockProcessLine[] {
  const procs = [...getQuadSignalCableProcesses(cable)];
  const production = meta.production ?? {};
  const closing = quadSignalClosingFromMeta(meta);
  let names =
    procs.length > 0
      ? procs
      : Array.from(
          new Set([...Object.keys(closing), ...Object.keys(production)]),
        );
  if (isSignallingCableName(cable)) {
    names = names.filter((n) => n.trim().toLowerCase() !== "insulation");
    const by = signallingProcessClosingsFromMeta(meta, names);
    return names.map((name) => ({
      name,
      shortName: shortProcessName(name),
      closing: Math.round((by[name] ?? processQtyFromMeta(closing, name)) * 1000) / 1000,
      production: processQtyFromMeta(production, name),
    }));
  }
  const idle = isIdleSizeWipFill(meta);
  return names.map((name, i) => {
    const prod = processQtyFromMeta(production, name);
    const stored = processQtyFromMeta(closing, name);
    const nextName = names[i + 1];
    const nextP = nextName ? processQtyFromMeta(production, nextName) : 0;
    let closingQty = stored;
    if (name.trim().toLowerCase() === "single quad") {
      closingQty = singleQuadClosingFromMeta(meta, size, stored);
    } else if (!idle && nextP > 0) {
      closingQty = stageClosingFromMeta(meta, name, nextName) ?? stored;
    }
    return {
      name,
      shortName: shortProcessName(name),
      closing: Math.round(closingQty * 1000) / 1000,
      production: prod,
    };
  });
}

function totalKmFromProcesses(
  processes: StockProcessLine[],
  totalPutupKm: number,
): number {
  const totalKm = processes.reduce((s, p) => {
    const n = p.name.trim().toLowerCase();
    if (n === "insulation" || n === "single quad") return s;
    if (isOuterProcess(p.name)) {
      return s + outerClosingAfterPutup(p.closing, totalPutupKm);
    }
    return s + p.closing;
  }, 0);
  return Math.round(totalKm * 1000) / 1000;
}

/**
 * Build cable-size production status from the last fill per cable · size
 * (newest save, any date — not last calendar day).
 * Near-duplicate "Other" spellings collapse via normalizeQuadSignalCableSizeKey.
 * Signalling Insulation is returned separately (shared across sizes).
 */
export function buildCableStockStatus(
  rows: Array<{
    id: string;
    date: Date;
    itemName: string;
    notes?: string | null;
  }>,
): {
  blocks: CableStockStatusBlock[];
  sharedInsulation: SharedInsulationStatus | null;
  quadInsulation: SharedInsulationStatus | null;
} {
  const byKey = new Map<string, CableStockStatusBlock>();
  const signallingInsul: SharedInsulationStatus[] = [];
  const quadInsul: SharedInsulationStatus[] = [];

  for (const row of rows) {
    try {
      const { meta, userNotes } = parseQuadSignalStockNotes(row.notes);
      if (!meta || meta.kind !== "cable" || !meta.cable || !meta.size) {
        continue;
      }

      const cable = meta.cable.trim();
      const size = meta.size.trim();

      const entryDate = toIstDateString(row.date);
      const sig = familyInsulationCandidate(cable, meta, entryDate, "signalling");
      if (sig) signallingInsul.push(sig);
      const qd = familyInsulationCandidate(cable, meta, entryDate, "quad");
      if (qd) quadInsul.push(qd);

      // Prefer normalized key so "100P" / "100 Pair" / "100Pair" show as one card.
      const key = quadSignalCableSizeDedupeKey(cable, size);
      if (byKey.has(key)) {
        const block = byKey.get(key)!;
        block.orderPutupItems = mergeOrderPutups(
          block.orderPutupItems ?? block.callPutupItems ?? [],
          putupItemsFromMeta(meta),
        );
        continue;
      }

      const callPutup = String(meta.callPutup ?? "").trim();
      const putupDate = String(meta.putupDate ?? "").trim();
      const partyName = String(meta.partyName ?? "").trim();
      const dispatchParty = String(meta.dispatchParty ?? "").trim();
      const dispatchRaw = Number(meta.dispatchPending);
      const dispatchPending =
        Number.isFinite(dispatchRaw) && dispatchRaw > 0 ? dispatchRaw : 0;

      const callPutupItems = putupItemsFromMeta(meta);
      const totalPutupKm = callPutupItems.reduce((sum, item) => sum + item.qty, 0);

      const rawDispatchItems = Array.isArray(meta.dispatchPendingItems) && meta.dispatchPendingItems.length > 0
        ? meta.dispatchPendingItems
        : dispatchPending > 0 || dispatchParty
          ? [{ qty: dispatchPending, partyName: dispatchParty }]
          : [];

      const dispatchPendingItems = collapseDispatchRows(
        rawDispatchItems.map((item) => ({
          qty: item.qty,
          partyName: String(item.partyName ?? dispatchParty ?? "").trim(),
        })),
      );
      const totalDispatchPending = dispatchPendingItems.reduce((sum, item) => sum + item.qty, 0);

      const processes = processLinesFromMeta(meta, cable, size);
      const totalKm = totalKmFromProcesses(processes, totalPutupKm);

      byKey.set(key, {
        key: `${cable} · ${size}`,
        cable,
        size,
        entryDate,
        processes,
        totalKm: Math.round(totalKm * 1000) / 1000,
        salesKm: Number(meta.salesKm) || 0,
        putupKm: Math.round(totalPutupKm * 1000) / 1000,
        callPutup,
        putupDate,
        partyName,
        dispatchParty,
        dispatchPending: Math.round(totalDispatchPending * 1000) / 1000,
        dispatchSettledKm: 0,
        dispatchSettledItems: [],
        userNotes: String(userNotes ?? "").trim(),
        callPutupItems,
        orderPutupItems: [...callPutupItems],
        dispatchPendingItems,
      });
    } catch (err) {
      console.error("[buildCableStockStatus] skipped bad row", row.id, err);
    }
  }

  return {
    blocks: Array.from(byKey.values()),
    sharedInsulation: pickSharedInsulationPool(signallingInsul),
    quadInsulation: pickNewestInsulation(quadInsul),
  };
}
