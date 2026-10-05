import {
  quadSignalClosingFromMeta,
  type QuadSignalStockMeta,
} from "@/lib/plant-catalogs";
import { isQuadCableName, isSignallingCableName } from "@/lib/quad-signal-wip";
import type { SharedInsulationStatus } from "./types";

function sameKm(a: number, b: number) {
  return Math.round(a * 1000) === Math.round(b * 1000);
}

function insulationExtrasTouched(meta: QuadSignalStockMeta): boolean {
  const rows = meta.sharedInsulation?.contributions;
  if (!Array.isArray(rows) || rows.length === 0) return false;
  return rows.some(
    (c) => Number(c.layingProduced) > 0 || Number(c.consumed) > 0,
  );
}

export function insulationFromMeta(
  meta: QuadSignalStockMeta,
  entryDate: string,
): SharedInsulationStatus | null {
  if (meta.kind !== "cable") return null;
  const production = Number(meta.production?.Insulation) || 0;
  const extrasTouch = insulationExtrasTouched(meta);
  if (
    meta.sharedInsulation &&
    Number.isFinite(Number(meta.sharedInsulation.closing))
  ) {
    return {
      entryDate,
      opening: Number(meta.opening?.Insulation) || 0,
      production,
      consumed: Number(meta.sharedInsulation.consumed) || 0,
      closing: Number(meta.sharedInsulation.closing),
      poolTouch: extrasTouch,
    };
  }
  const closingMap = quadSignalClosingFromMeta(meta);
  if (
    meta.opening?.Insulation == null &&
    meta.production?.Insulation == null &&
    closingMap.Insulation == null
  ) {
    return null;
  }
  const opening = Number(meta.opening?.Insulation) || 0;
  const closeRaw = Number(closingMap.Insulation);
  const closing = Number.isFinite(closeRaw) ? closeRaw : 0;
  if (opening === 0 && production === 0 && closing === 0) return null;
  return {
    entryDate,
    opening,
    production,
    consumed: Math.max(0, Math.round((opening + production - closing) * 1000) / 1000),
    closing,
    poolTouch: extrasTouch,
  };
}

/** Size WIP ate Insulation (closing ≠ opening + extras-only P). Use typed Opening. */
function sizeWipAteInsulation(s: SharedInsulationStatus): boolean {
  if (s.poolTouch) return false;
  if (s.production > 0) return false;
  return s.consumed > 0;
}

function asPoolSnap(s: SharedInsulationStatus): SharedInsulationStatus {
  if (s.poolTouch) return s;
  if (s.production > 0) return s;
  if (sizeWipAteInsulation(s)) {
    return { ...s, closing: s.opening, consumed: 0, production: 0 };
  }
  if (s.opening > 0 && s.production === 0 && !sameKm(s.opening, s.closing)) {
    return { ...s, closing: s.opening, consumed: 0 };
  }
  return s;
}

function isIdleInsulationFill(s: SharedInsulationStatus): boolean {
  return s.production === 0 && s.consumed === 0 && !s.poolTouch;
}

/**
 * Last real Insulation fill wins for production. Later size-only saves
 * (P=0) must not wipe that production. Closing still follows the newest snap.
 */
export function pickSharedInsulationPool(
  rows: SharedInsulationStatus[],
): SharedInsulationStatus | null {
  if (rows.length === 0) return null;
  let newestSnap: SharedInsulationStatus | null = null;
  for (let i = 0; i < rows.length; i++) {
    const s = asPoolSnap(rows[i]!);
    if (!newestSnap) newestSnap = s;
    if (isIdleInsulationFill(s)) continue;
    const older = rows.slice(i + 1);
    const replayPrefill =
      s.production > 0 &&
      older.some(
        (o) =>
          o.production > 0 &&
          sameKm(o.production, s.production) &&
          sameKm(s.opening, o.closing),
      );
    if (replayPrefill) continue;
    return {
      ...s,
      closing: newestSnap.closing,
      opening: newestSnap.opening,
      entryDate: newestSnap.entryDate,
    };
  }
  return newestSnap;
}

export function pickNewestInsulation(
  rows: SharedInsulationStatus[],
): SharedInsulationStatus | null {
  return pickSharedInsulationPool(rows);
}

export function familyInsulationCandidate(
  cable: string,
  meta: QuadSignalStockMeta,
  entryDate: string,
  family: "signalling" | "quad",
): SharedInsulationStatus | null {
  if (family === "signalling" && !isSignallingCableName(cable)) return null;
  if (family === "quad" && !isQuadCableName(cable)) return null;
  return insulationFromMeta(meta, entryDate);
}
