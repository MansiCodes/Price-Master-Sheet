import {
  getQuadSignalCableProcesses,
  parseQuadSignalStockNotes,
  quadSignalCableSizeDedupeKey,
  quadSignalClosingFromMeta,
} from "@/lib/plant-catalogs";
import { toIstDateString } from "@/lib/dates";
import { isSignallingCableName } from "@/lib/quad-signal-wip";
import { processQtyFromMeta, stageClosingFromMeta } from "@/lib/quad-signal-opening-match";
import { pickSharedInsulationPool, pickNewestInsulation, familyInsulationCandidate } from "./build-cable-insulation";
import {
  isOuterProcess,
  outerClosingAfterPutup,
  parsePutupKm,
  shortProcessName,
} from "./format";
import type { CableStockStatusBlock, SharedInsulationStatus, StockProcessLine } from "./types";
import {
  collapseDispatchRows,
  liveDispatchLock,
  pendingOnlyFromMeta,
  settledFromHistory,
} from "./dispatch-history";

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
  const harvestedDispatch = new Set<string>();
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
        const pending = collapseDispatchRows(
          (block.dispatchPendingItems ?? []).map((d) => ({
            qty: d.qty,
            partyName: d.dispatchParty,
          })),
        );
        if (!harvestedDispatch.has(key)) {
          const extras = settledFromHistory(
            pendingOnlyFromMeta(meta, String(meta.dispatchParty ?? "")),
            pending,
          );
          if (extras.settledItems.length > 0) {
            block.dispatchSettledItems = extras.settledItems;
            block.dispatchSettledKm = extras.settledKm;
            harvestedDispatch.add(key);
          } else {
            const live = settledFromHistory(
              (block.dispatchSettledItems ?? []).map((d) => ({
                qty: d.qty,
                partyName: d.dispatchParty,
              })),
              pending,
            );
            block.dispatchSettledItems = live.settledItems;
            block.dispatchSettledKm = live.settledKm;
          }
        }
        const putup = block.putupKm;
        const settled = block.dispatchSettledKm ?? 0;
        block.totalKm = Math.round(block.processes.reduce((s, p) => {
          const n = p.name.trim().toLowerCase();
          if (n === "insulation" || n === "single quad") return s;
          if (isOuterProcess(p.name)) {
            return s + outerClosingAfterPutup(p.closing, putup, settled);
          }
          return s + p.closing;
        }, 0) * 1000) / 1000;
        continue;
      }

      const procs = [...getQuadSignalCableProcesses(cable)];
      const production = meta.production ?? {};
      const closing = quadSignalClosingFromMeta(meta);
      let names =
        procs.length > 0
          ? procs
          : Array.from(
              new Set([...Object.keys(closing), ...Object.keys(production)]),
            );

      // Signalling Insulation lives in the shared top card, not per-size.
      // Quad keeps Insulation on the size card so it matches P&L PROCESS WIP.
      if (isSignallingCableName(cable)) {
        names = names.filter((n) => n.trim().toLowerCase() !== "insulation");
      }

      const legacyPutupKm = parsePutupKm(meta.callPutup);
      const callPutup = String(meta.callPutup ?? "").trim();
      const putupDate = String(meta.putupDate ?? "").trim();
      const partyName = String(meta.partyName ?? "").trim();
      const dispatchParty = String(meta.dispatchParty ?? "").trim();
      const dispatchRaw = Number(meta.dispatchPending);
      const dispatchPending =
        Number.isFinite(dispatchRaw) && dispatchRaw > 0 ? dispatchRaw : 0;

      const rawPutupItems = Array.isArray(meta.callPutupItems) && meta.callPutupItems.length > 0
        ? meta.callPutupItems
        : legacyPutupKm > 0 || callPutup || partyName
          ? [{ qty: legacyPutupKm > 0 ? legacyPutupKm : callPutup, date: putupDate, partyName }]
          : [];

      const callPutupItems = rawPutupItems
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
        .filter((item) => item.qty > 0 || item.partyName || item.callPutup);

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
      const dispatchSettledItems = collapseDispatchRows(
        (Array.isArray(meta.dispatchSettledItems) ? meta.dispatchSettledItems : []).map((item) => ({
          qty: item.qty,
          partyName: String(item.partyName ?? dispatchParty ?? "").trim(),
        })),
      );
      const fromItems = liveDispatchLock(
        dispatchPendingItems,
        dispatchPendingItems,
        dispatchSettledItems,
      );
      const dispatchSettledKm = fromItems.settledKm;
      const settledItems =
        fromItems.settledItems.length > 0 ? fromItems.settledItems : dispatchSettledItems;

      const processes: StockProcessLine[] = names.map((name, i) => {
        const prod = processQtyFromMeta(production, name);
        const fresh = stageClosingFromMeta(meta, name, names[i + 1]);
        const closingQty = fresh != null ? fresh : processQtyFromMeta(closing, name);
        return {
          name,
          shortName: shortProcessName(name),
          closing: Math.round(closingQty * 1000) / 1000,
          production: prod,
        };
      });

      // Insul + Single Quad stay out of Total. Outer uses closing after Call putup.
      const totalKm = processes.reduce((s, p) => {
        const n = p.name.trim().toLowerCase();
        if (n === "insulation" || n === "single quad") return s;
        if (isOuterProcess(p.name)) {
          return s + outerClosingAfterPutup(p.closing, totalPutupKm, dispatchSettledKm);
        }
        return s + p.closing;
      }, 0);

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
        dispatchSettledKm: Math.round(dispatchSettledKm * 1000) / 1000,
        dispatchSettledItems: settledItems,
        userNotes: String(userNotes ?? "").trim(),
        callPutupItems,
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
