import {
  getQuadSignalCableProcesses,
  parseQuadSignalStockNotes,
  quadSignalClosingFromMeta,
} from "@/lib/plant-catalogs";
import { toIsoDateString } from "@/lib/dates";
import { isSignallingCableName } from "@/lib/quad-signal-wip";

export type StockProcessLine = {
  name: string;
  shortName: string;
  closing: number;
  production: number;
};

export type CableStockStatusBlock = {
  key: string;
  cable: string;
  size: string;
  entryDate: string;
  processes: StockProcessLine[];
  totalKm: number;
  salesKm: number;
  userNotes: string;
};

/** Signalling shared Insulation pool (one card for all sizes). */
export type SharedInsulationStatus = {
  entryDate: string;
  opening: number;
  production: number;
  consumed: number;
  closing: number;
};

function shortProcessName(name: string): string {
  const n = name.trim().toLowerCase();
  if (n === "insulation") return "Insul";
  if (n === "laying") return "Laying";
  if (n === "inner sheath") return "Inner";
  if (n === "outer sheath") return "Outer";
  if (n === "single quad") return "Single Quad";
  if (n === "intermediate sheath") return "Inter";
  if (n === "screening") return "Screening";
  if (n === "dst") return "DST";
  if (n === "armouring" || n === "armoring") return "Armed";
  return name;
}

function fmtKm(n: number): string {
  if (!Number.isFinite(n)) return "0";
  const r = Math.round(n * 1000) / 1000;
  return Number.isInteger(r) ? String(r) : String(r);
}

export function formatProcessStatusLine(line: StockProcessLine): string {
  return `${line.shortName}: ${fmtKm(line.closing)}km(${fmtKm(line.production)}km)`;
}

export function formatSharedInsulationLine(
  status: SharedInsulationStatus,
): string {
  return `Insul: ${fmtKm(status.closing)}km(${fmtKm(status.production)}km)`;
}

/**
 * Build cable-size production status blocks from QSSTOCK FG rows.
 * Keeps the newest entry per cable · size (rows should be newest-first).
 * Signalling Insulation is returned separately (shared across sizes).
 */
export function buildCableStockStatus(rows: Array<{
  id: string;
  date: Date;
  itemName: string;
  notes: string | null;
}>): {
  blocks: CableStockStatusBlock[];
  sharedInsulation: SharedInsulationStatus | null;
} {
  const byKey = new Map<string, CableStockStatusBlock>();
  let sharedInsulation: SharedInsulationStatus | null = null;

  for (const row of rows) {
    const { meta, userNotes } = parseQuadSignalStockNotes(row.notes);
    if (!meta || meta.kind !== "cable") continue;
    const cable = (meta.cable ?? "").trim();
    const size = (meta.size ?? "").trim();
    if (!cable || !size) continue;

    if (!sharedInsulation && isSignallingCableName(cable)) {
      const entryDate = toIsoDateString(row.date);
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
          sharedInsulation = {
            entryDate,
            opening: Number(meta.opening?.Insulation) || 0,
            production: insulProd,
            consumed: 0,
            closing: Number.isFinite(insulClose) ? insulClose : 0,
          };
        }
      }
    }

    const key = `${cable} · ${size}`;
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
    if (isSignallingCableName(cable)) {
      names = names.filter((n) => n.trim().toLowerCase() !== "insulation");
    }

    const processes: StockProcessLine[] = names.map((name) => ({
      name,
      shortName: shortProcessName(name),
      closing: Number(closing[name]) || 0,
      production: Number(production[name]) || 0,
    }));

    const totalKm = processes.reduce((s, p) => s + p.closing, 0);

    byKey.set(key, {
      key,
      cable,
      size,
      entryDate: toIsoDateString(row.date),
      processes,
      totalKm: Math.round(totalKm * 1000) / 1000,
      salesKm: Number(meta.salesKm) || 0,
      userNotes: userNotes.trim(),
    });
  }

  return {
    blocks: Array.from(byKey.values()),
    sharedInsulation,
  };
}
