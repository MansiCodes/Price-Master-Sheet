import {
  parseQuadSignalStockNotes,
  quadSignalClosingFromMeta,
  type QuadSignalStockMeta,
} from "@/lib/plant-catalogs";
import { isSignallingCableName } from "@/lib/quad-signal-wip";

export const INSULATION_KEY = "Insulation";

export function matchesCableSize(
  row: { itemName: string; notes: string | null },
  cable: string,
  size: string,
  itemName: string,
): { match: boolean; meta: QuadSignalStockMeta | null } {
  const { meta } = parseQuadSignalStockNotes(row.notes);
  const match =
    row.itemName === itemName ||
    (meta?.kind === "cable" && meta.cable === cable && meta.size === size);
  return { match, meta };
}

export function matchesSignallingCable(row: {
  itemName: string;
  notes: string | null;
}): { match: boolean; meta: QuadSignalStockMeta | null } {
  const { meta } = parseQuadSignalStockNotes(row.notes);
  if (meta?.kind === "cable" && meta.cable && isSignallingCableName(meta.cable)) {
    return { match: true, meta };
  }
  if (row.itemName.toLowerCase().startsWith("signalling cable")) {
    return { match: true, meta };
  }
  return { match: false, meta };
}

/** Shared Insulation closing from a Signalling Cable stock entry. */
export function insulationClosingFromMeta(
  meta: QuadSignalStockMeta | null | undefined,
): number | null {
  if (!meta || meta.kind !== "cable") return null;
  if (
    meta.sharedInsulation &&
    Number.isFinite(meta.sharedInsulation.closing)
  ) {
    return Number(meta.sharedInsulation.closing);
  }
  const closing = quadSignalClosingFromMeta(meta);
  if (
    closing[INSULATION_KEY] != null &&
    Number.isFinite(closing[INSULATION_KEY])
  ) {
    return Number(closing[INSULATION_KEY]);
  }
  return null;
}

function rowDateIso(row: { date?: Date }): string | null {
  return row.date ? row.date.toISOString().slice(0, 10) : null;
}

function insulationProductionFromMeta(meta: QuadSignalStockMeta | null): number {
  if (!meta || meta.kind !== "cable") return 0;
  return Number(meta.production?.[INSULATION_KEY]) || 0;
}

/**
 * Last filled Signalling Insulation (same as the Stock Insulation card):
 * newest row with Insulation production > 0, else newest Insulation closing.
 * Do not prefer an old sharedInsulation snapshot over a later fill.
 * rows must be newest-first.
 */
export function findLatestSharedInsulationOpening(
  rows: Array<{ date?: Date; itemName: string; notes: string | null }>,
): { value: number; fromDate: string | null } | null {
  for (const row of rows) {
    const sig = matchesSignallingCable(row);
    if (!sig.match) continue;
    if (insulationProductionFromMeta(sig.meta) <= 0) continue;
    const ins = insulationClosingFromMeta(sig.meta);
    if (ins == null) continue;
    return { value: ins, fromDate: rowDateIso(row) };
  }
  for (const row of rows) {
    const sig = matchesSignallingCable(row);
    if (!sig.match) continue;
    const ins = insulationClosingFromMeta(sig.meta);
    if (ins == null) continue;
    return { value: ins, fromDate: rowDateIso(row) };
  }
  return null;
}
