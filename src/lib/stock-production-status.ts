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
  /** Signalling shared Insulation closing when present on this entry. */
  insulationNote: string | null;
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

/**
 * Build cable-size production status blocks from QSSTOCK FG rows.
 * Keeps the newest entry per cable · size (rows should be newest-first).
 */
export function buildCableStockStatus(rows: Array<{
  id: string;
  date: Date;
  itemName: string;
  notes: string | null;
}>): CableStockStatusBlock[] {
  const byKey = new Map<string, CableStockStatusBlock>();

  for (const row of rows) {
    const { meta, userNotes } = parseQuadSignalStockNotes(row.notes);
    if (!meta || meta.kind !== "cable") continue;
    const cable = (meta.cable ?? "").trim();
    const size = (meta.size ?? "").trim();
    if (!cable || !size) continue;
    const key = `${cable} · ${size}`;
    if (byKey.has(key)) continue;

    const procs = [...getQuadSignalCableProcesses(cable)];
    const production = meta.production ?? {};
    const closing = quadSignalClosingFromMeta(meta);
    const names =
      procs.length > 0
        ? procs
        : Array.from(
            new Set([...Object.keys(closing), ...Object.keys(production)]),
          );

    const processes: StockProcessLine[] = names.map((name) => ({
      name,
      shortName: shortProcessName(name),
      closing: Number(closing[name]) || 0,
      production: Number(production[name]) || 0,
    }));

    const totalKm = processes.reduce((s, p) => s + p.closing, 0);
    let insulationNote: string | null = null;
    if (
      isSignallingCableName(cable) &&
      meta.sharedInsulation &&
      Number.isFinite(meta.sharedInsulation.closing)
    ) {
      insulationNote = `Shared Insul closing: ${fmtKm(meta.sharedInsulation.closing)}km`;
    }

    byKey.set(key, {
      key,
      cable,
      size,
      entryDate: toIsoDateString(row.date),
      processes,
      totalKm: Math.round(totalKm * 1000) / 1000,
      salesKm: Number(meta.salesKm) || 0,
      userNotes: userNotes.trim(),
      insulationNote,
    });
  }

  return Array.from(byKey.values());
}
