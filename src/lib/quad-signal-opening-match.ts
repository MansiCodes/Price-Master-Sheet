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
  const aliases = [proc, ...(PROCESS_KEY_ALIASES[proc.trim().toLowerCase()] ?? [])];
  const seen = new Set<string>();
  for (const name of aliases) {
    const want = name.trim().toLowerCase();
    if (!want || seen.has(want)) continue;
    seen.add(want);
    for (const [key, raw] of Object.entries(map)) {
      if (key.trim().toLowerCase() !== want) continue;
      const n = Number(raw);
      if (Number.isFinite(n)) return n;
    }
  }
  return 0;
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

/** Latest size-row closing: opening + production − next production (P=0 still counts). */
export function stageClosingFromMeta(
  meta: QuadSignalStockMeta,
  processName: string,
  nextProcessName?: string,
): number | null {
  const p = qtyOnMap(meta.production, processName);
  const o = qtyOnMap(meta.opening, processName);
  const c = qtyOnMap(quadSignalClosingFromMeta(meta), processName);
  const outbound = nextProcessName ? qtyOnMap(meta.production, nextProcessName) : 0;
  if (o === 0 && p === 0 && c === 0 && outbound === 0) return null;
  const implied = o + p - outbound;
  if (Number.isFinite(implied)) return Math.round(implied * 1000) / 1000;
  return c;
}

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
    const fresh = stageClosingFromMeta(meta, processName, nextProcessName);
    if (fresh != null) return fresh;
  }
  return null;
}

export function freshClosingAfterProd(
  meta: QuadSignalStockMeta,
  processName: string,
  nextProcessName?: string,
): number | null {
  return stageClosingFromMeta(meta, processName, nextProcessName);
}

export function processQtyFromMeta(
  map: Record<string, number> | undefined,
  proc: string,
): number {
  return qtyOnMap(map, proc);
}

export function lastEnteredOpeningByProcess(
  rows: Array<{ date?: Date; itemName: string; notes: string | null }>,
  cable: string,
  size: string,
  itemName: string,
  processNames: readonly string[] = [],
  skipInsulation = false,
): { opening: Record<string, number>; fromDate: string | null } {
  const names = skipInsulation
    ? processNames.filter((p) => p.trim().toLowerCase() !== "insulation")
    : [...processNames];
  for (const row of rows) {
    const { meta } = parseQuadSignalStockNotes(row.notes);
    if (meta?.kind !== "cable" || !isSameSizeRow(row, cable, size, itemName, meta)) {
      continue;
    }
    const src = {
      ...quadSignalClosingFromMeta(meta),
      ...(meta.opening ?? {}),
    };
    const out: Record<string, number> = {};
    const keys = names.length > 0 ? names : Object.keys(src);
    for (const proc of keys) {
      if (skipInsulation && proc.trim().toLowerCase() === "insulation") continue;
      const n = qtyOnMap(src, proc);
      if (Number.isFinite(n)) out[proc] = n;
    }
    return { opening: out, fromDate: rowDateIso(row) };
  }
  return { opening: {}, fromDate: null };
}

export function lastEnteredProductionByProcess(
  rows: Array<{ itemName: string; notes: string | null }>,
  cable: string,
  size: string,
  itemName: string,
  processNames: readonly string[] = [],
  skipInsulation = false,
): Record<string, number> {
  const names = skipInsulation
    ? processNames.filter((p) => p.trim().toLowerCase() !== "insulation")
    : [...processNames];
  let fallback: Record<string, number> | null = null;
  for (const row of rows) {
    const { meta } = parseQuadSignalStockNotes(row.notes);
    if (meta?.kind !== "cable" || !isSameSizeRow(row, cable, size, itemName, meta)) {
      continue;
    }
    const out: Record<string, number> = {};
    let anyPositive = false;
    const keys = names.length > 0 ? names : Object.keys(meta.production ?? {});
    for (const proc of keys) {
      if (skipInsulation && proc.trim().toLowerCase() === "insulation") continue;
      const n = qtyOnMap(meta.production, proc);
      out[proc] = n;
      if (n > 0) anyPositive = true;
    }
    if (!anyPositive) {
      for (const [key, raw] of Object.entries(meta.production ?? {})) {
        if (skipInsulation && key.trim().toLowerCase() === "insulation") continue;
        const n = Number(raw);
        if (!Number.isFinite(n) || n <= 0) continue;
        out[key] = n;
        anyPositive = true;
      }
    }
    if (!fallback) fallback = out;
    if (anyPositive) return out;
  }
  return fallback ?? {};
}

/** @deprecated Use lastEnteredProductionByProcess — latest row, including P=0. */
export function lastPositiveProductionByProcess(
  rows: Array<{ itemName: string; notes: string | null }>,
  cable: string,
  size: string,
  itemName: string,
  processNames: readonly string[] = [],
): Record<string, number> {
  return lastEnteredProductionByProcess(rows, cable, size, itemName, processNames);
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
    return contrib;
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

function insulationConsumedFromMeta(meta: QuadSignalStockMeta | null): number {
  if (!meta || meta.kind !== "cable") return 0;
  return Number(meta.sharedInsulation?.consumed) || 0;
}

function insulationOpeningFromMeta(
  meta: QuadSignalStockMeta | null,
  closing: number,
): number {
  const openMap = meta?.opening;
  if (openMap) {
    for (const key of Object.keys(openMap)) {
      if (key.trim().toLowerCase() !== "insulation") continue;
      return qtyOnMap(openMap, INSULATION_KEY);
    }
  }
  return closing;
}

function canonicalizeInsulationSnap(s: {
  opening: number;
  production: number;
  consumed: number;
  closing: number;
}): {
  opening: number;
  production: number;
  consumed: number;
  closing: number;
} {
  const idle = s.production === 0 && s.consumed === 0;
  if (idle && Math.round(s.opening * 1000) !== Math.round(s.closing * 1000)) {
    return { ...s, opening: s.closing };
  }
  return s;
}

function insulationSnapKey(s: {
  opening: number;
  production: number;
  consumed: number;
  closing: number;
}): string {
  const r = (n: number) => String(Math.round(n * 1000) / 1000);
  return `${r(s.opening)}|${r(s.production)}|${r(s.consumed)}|${r(s.closing)}`;
}

/**
 * Last Insulation fill: later size saves that only copy an older idle
 * snapshot (P=0, Out=0) do not replace a newer distinct Opening the user typed.
 */
export function pickLastInsulationFillRow<T>(
  newestFirst: T[],
  toSnap: (row: T) => {
    opening: number;
    production: number;
    consumed: number;
    closing: number;
  } | null,
): T | null {
  const oldestFirst = [...newestFirst].reverse();
  const seenIdle = new Set<string>();
  let last: T | null = null;
  for (const row of oldestFirst) {
    const raw = toSnap(row);
    if (!raw) continue;
    const snap = canonicalizeInsulationSnap(raw);
    const key = insulationSnapKey(snap);
    const idle = snap.production === 0 && snap.consumed === 0;
    if (!idle) {
      last = row;
      seenIdle.add(key);
      continue;
    }
    if (last == null) {
      last = row;
      seenIdle.add(key);
      continue;
    }
    if (seenIdle.has(key)) continue;
    last = row;
    seenIdle.add(key);
  }
  return last;
}

export function findLatestInsulationPoolMeta(
  rows: Array<{ date?: Date; itemName: string; notes: string | null }>,
): {
  opening: number;
  closing: number;
  production: number;
  contributions: NonNullable<QuadSignalStockMeta["sharedInsulation"]>["contributions"];
  fromDate: string | null;
} | null {
  const picked = pickLastInsulationFillRow(rows, (row) => {
    const sig = matchesSignallingCable(row);
    if (!sig.match) return null;
    const ins = insulationClosingFromMeta(sig.meta);
    if (ins == null) return null;
    return {
      opening: insulationOpeningFromMeta(sig.meta, ins),
      production: insulationProductionFromMeta(sig.meta),
      consumed: insulationConsumedFromMeta(sig.meta),
      closing: ins,
    };
  });
  if (!picked) return null;
  const sig = matchesSignallingCable(picked);
  const ins = insulationClosingFromMeta(sig.meta);
  if (ins == null) return null;
  const production = insulationProductionFromMeta(sig.meta);
  const consumed = insulationConsumedFromMeta(sig.meta);
  const openingRaw = insulationOpeningFromMeta(sig.meta, ins);
  const snap = canonicalizeInsulationSnap({
    opening: openingRaw,
    production,
    consumed,
    closing: ins,
  });
  return {
    opening: snap.opening,
    closing: snap.closing,
    production: snap.production,
    contributions: sig.meta?.sharedInsulation?.contributions ?? [],
    fromDate: rowDateIso(picked),
  };
}

/**
 * Latest Signalling Insulation closing from the newest matching save.
 */
export function findLatestSharedInsulationOpening(
  rows: Array<{ date?: Date; itemName: string; notes: string | null }>,
): { value: number; fromDate: string | null } | null {
  for (const row of rows) {
    const sig = matchesSignallingCable(row);
    if (!sig.match) continue;
    const ins = insulationClosingFromMeta(sig.meta);
    if (ins == null) continue;
    return { value: ins, fromDate: rowDateIso(row) };
  }
  return null;
}
