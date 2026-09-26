import {
  getQuadSignalCableProcesses,
  parseQuadSignalStockNotes,
  quadSignalCableSizeDedupeKey,
  quadSignalClosingFromMeta,
} from "@/lib/plant-catalogs";
import { toIsoDateString } from "@/lib/dates";
import { isQuadCableName, isSignallingCableName } from "@/lib/quad-signal-wip";
import {
  isOuterProcess,
  outerClosingAfterPutup,
  parsePutupKm,
  shortProcessName,
} from "./format";
import type { CableStockStatusBlock, SharedInsulationStatus, StockProcessLine } from "./types";

/**
 * Build cable-size production status blocks from QSSTOCK FG rows.
 * Keeps the newest entry per cable · size (rows should be newest-first).
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
  let sharedInsulation: SharedInsulationStatus | null = null;
  let quadInsulation: SharedInsulationStatus | null = null;

  for (const row of rows) {
    try {
      const { meta, userNotes } = parseQuadSignalStockNotes(row.notes);
      if (!meta || meta.kind !== "cable" || !meta.cable || !meta.size) {
        continue;
      }

      const cable = meta.cable.trim();
      const size = meta.size.trim();

      const entryDate = toIsoDateString(row.date);
      if (!sharedInsulation && isSignallingCableName(cable)) {
        if (
          meta.sharedInsulation &&
          Number.isFinite(meta.sharedInsulation.closing)
        ) {
          sharedInsulation = {
            entryDate,
            opening: Number(meta.opening?.Insulation) || 0,
            production: Number(meta.production?.Insulation) || 0,
            consumed: Number(meta.sharedInsulation.consumed) || 0,
            closing: Number(meta.sharedInsulation.closing) || 0,
          };
        } else {
          const closingMap = quadSignalClosingFromMeta(meta);
          const insulClose = Number(closingMap.Insulation);
          const insulProd = Number(meta.production?.Insulation) || 0;
          if (Number.isFinite(insulClose) || insulProd) {
            const opening = Number(meta.opening?.Insulation) || 0;
            const closingVal = Number.isFinite(insulClose) ? insulClose : 0;
            sharedInsulation = {
              entryDate,
              opening,
              production: insulProd,
              consumed: Math.max(0, Math.round((opening + insulProd - closingVal) * 1000) / 1000),
              closing: closingVal,
            };
          }
        }
      }

      if (!quadInsulation && isQuadCableName(cable)) {
        const closingMap = quadSignalClosingFromMeta(meta);
        const insulClose = Number(closingMap.Insulation);
        const insulProd = Number(meta.production?.Insulation) || 0;
        if (Number.isFinite(insulClose) || insulProd) {
          const opening = Number(meta.opening?.Insulation) || 0;
          const closingVal = Number.isFinite(insulClose) ? insulClose : 0;
          quadInsulation = {
            entryDate,
            opening,
            production: insulProd,
            consumed: Math.max(
              0,
              Math.round((opening + insulProd - closingVal) * 1000) / 1000,
            ),
            closing: closingVal,
          };
        }
      }

      // Prefer normalized key so "100P" / "100 Pair" / "100Pair" show as one card.
      const key = quadSignalCableSizeDedupeKey(cable, size);
      if (byKey.has(key)) continue;

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

      const dispatchPendingItems = rawDispatchItems
        .map((item) => {
          const q = Number(item.qty);
          const qty = Number.isFinite(q) && q > 0 ? q : 0;
          const pName = String(item.partyName ?? dispatchParty ?? "").trim();
          return {
            qty,
            dispatchParty: pName,
          };
        })
        .filter((item) => item.qty > 0 || item.dispatchParty);

      const totalDispatchPending = dispatchPendingItems.reduce((sum, item) => sum + item.qty, 0);

      const processes: StockProcessLine[] = names.map((name) => {
        const closingQty = Number(closing[name]) || 0;
        return {
          name,
          shortName: shortProcessName(name),
          closing: Math.round(closingQty * 1000) / 1000,
          production: Number(production[name]) || 0,
        };
      });

      // Insul + Single Quad stay out of Total. Outer uses closing after Call putup.
      const totalKm = processes.reduce((s, p) => {
        const n = p.name.trim().toLowerCase();
        if (n === "insulation" || n === "single quad") return s;
        if (isOuterProcess(p.name)) {
          return s + outerClosingAfterPutup(p.closing, totalPutupKm);
        }
        return s + p.closing;
      }, 0);

      byKey.set(key, {
        key: `${cable} · ${size}`,
        cable,
        size,
        entryDate: toIsoDateString(row.date),
        processes,
        totalKm: Math.round(totalKm * 1000) / 1000,
        salesKm: Number(meta.salesKm) || 0,
        putupKm: Math.round(totalPutupKm * 1000) / 1000,
        callPutup,
        putupDate,
        partyName,
        dispatchParty,
        dispatchPending: Math.round(totalDispatchPending * 1000) / 1000,
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
    sharedInsulation,
    quadInsulation,
  };
}
