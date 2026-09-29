import {
  normalizeQuadSignalCableSizeKey,
  parseQuadSignalStockNotes,
  quadSignalClosingFromMeta,
  type QuadSignalStockMeta,
} from "@/lib/plant-catalogs";
import { isSignallingCableName, normalizeCableName } from "@/lib/quad-signal-wip";

export const INSULATION_KEY = "Insulation";

const PROCESS_KEY_ALIASES: Record<string, string[]> = {
  insulation: ["Insulation"],
  laying: ["Laying"],
  inner: ["Inner Sheath", "Inner"],
  "inner sheath": ["Inner Sheath", "Inner"],
  outer: ["Outer Sheath", "Outer"],
  "outer sheath": ["Outer Sheath", "Outer"],
  armouring: ["Armouring", "Armoring"],
  armoring: ["Armouring", "Armoring"],
  intermediate: ["Intermediate", "Intermediate Sheath"],
  "intermediate sheath": ["Intermediate", "Intermediate Sheath"],
};

function qtyOnMap(map: Record<string, number> | undefined, proc: string): number {
  if (!map) return 0;
  const names = [proc, ...(PROCESS_KEY_ALIASES[proc.trim().toLowerCase()] ?? [])];
  const want = new Set(names.map((n) => n.trim().toLowerCase()));
  let zero = 0;
  for (const [key, raw] of Object.entries(map)) {
    if (!want.has(key.trim().toLowerCase())) continue;
    const n = Number(raw);
    if (!Number.isFinite(n)) continue;
    if (n > 0) return n;
    zero = n;
  }
  return zero;
}

function rowCableName(
  row: { itemName: string },
  meta: QuadSignalStockMeta | null,
): string {
  if (meta?.kind === "cable" && meta.cable) return normalizeCableName(meta.cable);
  const sep = row.itemName.indexOf(" · ");
  return sep >= 0 ? normalizeCableName(row.itemName.slice(0, sep)) : "";
}

function rowSizeName(
  row: { itemName: string },
  meta: QuadSignalStockMeta | null,
): string {
  if (meta?.kind === "cable" && meta.size) return meta.size;
  const sep = row.itemName.indexOf(" · ");
  return sep >= 0 ? row.itemName.slice(sep + 3) : "";
}

function isSameCableRow(
  row: { itemName: string },
  cable: string,
  meta: QuadSignalStockMeta | null,
): boolean {
  return rowCableName(row, meta) === normalizeCableName(cable);
}

function isSameSizeRow(
  row: { itemName: string },
  cable: string,
  size: string,
  itemName: string,
  meta: QuadSignalStockMeta | null,
): boolean {
  if (row.itemName === itemName) return true;
  if (meta?.kind !== "cable") return false;
  return (
    isSameCableRow(row, cable, meta) &&
    normalizeQuadSignalCableSizeKey(rowSizeName(row, meta)) ===
      normalizeQuadSignalCableSizeKey(size)
  );
}

/** Last closing after a real P>0 (skip P:0 carry-forward that left Opening at 2 instead of 4). */
export function lastClosingAfterProduction(
  rows: Array<{ itemName: string; notes: string | null }>,
  cable: string,
  size: string,
  itemName: string,
  processName: string,
  nextProcessName?: string,
): number | null {
  for (const row of rows) {
    const { meta } = parseQuadSignalStockNotes(row.notes);
    if (meta?.kind !== "cable" || !isSameSizeRow(row, cable, size, itemName, meta)) {
      continue;
    }
    const fresh = freshClosingAfterProd(meta, processName, nextProcessName);
    if (fresh != null) return fresh;
  }
  return null;
}

export function freshClosingAfterProd(
  meta: QuadSignalStockMeta,
  processName: string,
  nextProcessName?: string,
): number | null {
  const p = qtyOnMap(meta.production, processName);
  if (p <= 0) return null;
  const o = qtyOnMap(meta.opening, processName);
  const c = qtyOnMap(quadSignalClosingFromMeta(meta), processName);
  const outbound = nextProcessName ? qtyOnMap(meta.production, nextProcessName) : 0;
  const implied = o + p - outbound;
  if (Number.isFinite(implied) && implied > c + 1e-9) return implied;
  return c;
}

/**
 * Last P>0 per process for this size only (never Insulation, never another size).
 */
export function lastPositiveProductionByProcess(
  rows: Array<{ itemName: string; notes: string | null }>,
  cable: string,
  size: string,
  itemName: string,
  processNames: readonly string[] = [],
): Record<string, number> {
  const names = processNames.filter(
    (p) => p.trim().toLowerCase() !== "insulation",
  );
  const out: Record<string, number> = {};
  const keys = names.length > 0 ? names : [];
  if (keys.length === 0) {
    for (const row of rows) {
      const { meta } = parseQuadSignalStockNotes(row.notes);
      if (meta?.kind !== "cable" || !isSameSizeRow(row, cable, size, itemName, meta)) {
        continue;
      }
      for (const [proc, raw] of Object.entries(meta.production ?? {})) {
        if (proc.trim().toLowerCase() === "insulation" || out[proc] != null) continue;
        const n = Number(raw);
        if (Number.isFinite(n) && n > 0) out[proc] = n;
      }
    }
    return out;
  }
  for (const proc of keys) {
    for (const row of rows) {
      const { meta } = parseQuadSignalStockNotes(row.notes);
      if (meta?.kind !== "cable" || !isSameSizeRow(row, cable, size, itemName, meta)) {
        continue;
      }
      const n = qtyOnMap(meta.production, proc);
      if (n > 0) {
        out[proc] = n;
        break;
      }
    }
  }
  delete out[INSULATION_KEY];
  return out;
}

export function lastInsulationContributions(
  rows: Array<{ itemName: string; notes: string | null }>,
  cable: string,
  size: string,
  itemName: string,
): NonNullable<QuadSignalStockMeta["sharedInsulation"]>["contributions"] {
  for (const row of rows) {
    const { match, meta } = matchesCableSize(row, cable, size, itemName);
    if (!match) continue;
    const contrib = meta?.sharedInsulation?.contributions ?? [];
    if (contrib.some((c) => Number(c.layingProduced) > 0)) return contrib;
  }
  return [];
}

export function matchesCableSize(
  row: { itemName: string; notes: string | null },
  cable: string,
  size: string,
  itemName: string,
): { match: boolean; meta: QuadSignalStockMeta | null } {
  const { meta } = parseQuadSignalStockNotes(row.notes);
  const match = isSameSizeRow(row, cable, size, itemName, meta);
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

function insulationPoolTouch(meta: QuadSignalStockMeta | null): boolean {
  if (!meta || meta.kind !== "cable") return false;
  if (insulationProductionFromMeta(meta) > 0) return true;
  return Number(meta.sharedInsulation?.consumed) > 0;
}

export function findLatestInsulationPoolMeta(
  rows: Array<{ date?: Date; itemName: string; notes: string | null }>,
): {
  closing: number;
  production: number;
  contributions: NonNullable<QuadSignalStockMeta["sharedInsulation"]>["contributions"];
  fromDate: string | null;
} | null {
  for (const row of rows) {
    const sig = matchesSignallingCable(row);
    if (!sig.match || !insulationPoolTouch(sig.meta)) continue;
    const ins = insulationClosingFromMeta(sig.meta);
    if (ins == null) continue;
    return {
      closing: ins,
      production: insulationProductionFromMeta(sig.meta),
      contributions: sig.meta?.sharedInsulation?.contributions ?? [],
      fromDate: rowDateIso(row),
    };
  }
  return null;
}

/**
 * Last Signalling Insulation pool: Insulation production or extra-size Out.
 * Laying → Outer Sheath saves do not move this value.
 */
export function findLatestSharedInsulationOpening(
  rows: Array<{ date?: Date; itemName: string; notes: string | null }>,
): { value: number; fromDate: string | null } | null {
  for (const row of rows) {
    const sig = matchesSignallingCable(row);
    if (!sig.match || !insulationPoolTouch(sig.meta)) continue;
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
