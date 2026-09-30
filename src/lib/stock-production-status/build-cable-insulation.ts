import {
  quadSignalClosingFromMeta,
  type QuadSignalStockMeta,
} from "@/lib/plant-catalogs";
import { isQuadCableName, isSignallingCableName } from "@/lib/quad-signal-wip";
import type { SharedInsulationStatus } from "./types";

export function insulationFromMeta(
  meta: QuadSignalStockMeta,
  entryDate: string,
): SharedInsulationStatus | null {
  if (meta.kind !== "cable") return null;
  if (
    meta.sharedInsulation &&
    Number.isFinite(Number(meta.sharedInsulation.closing))
  ) {
    return {
      entryDate,
      opening: Number(meta.opening?.Insulation) || 0,
      production: Number(meta.production?.Insulation) || 0,
      consumed: Number(meta.sharedInsulation.consumed) || 0,
      closing: Number(meta.sharedInsulation.closing),
      poolTouch:
        Number(meta.production?.Insulation) > 0 ||
        Number(meta.sharedInsulation.consumed) > 0,
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
  const production = Number(meta.production?.Insulation) || 0;
  const closeRaw = Number(closingMap.Insulation);
  const closing = Number.isFinite(closeRaw) ? closeRaw : 0;
  if (opening === 0 && production === 0 && closing === 0) return null;
  return {
    entryDate,
    opening,
    production,
    consumed: Math.max(0, Math.round((opening + production - closing) * 1000) / 1000),
    closing,
    poolTouch: production > 0,
  };
}

/**
 * Signalling Insulation is one pool. Newest real fill wins.
 * A later size save that copies the last Production onto the last
 * Closing (prefill double-add) is ignored.
 */
export function pickSharedInsulationPool(
  rows: SharedInsulationStatus[],
): SharedInsulationStatus | null {
  if (rows.length === 0) return null;
  const sameKm = (a: number, b: number) =>
    Math.round(a * 1000) === Math.round(b * 1000);
  for (let i = 0; i < rows.length; i++) {
    const s = rows[i];
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
    const idle = s.production === 0 && s.consumed === 0;
    if (!idle) return s;
    const olderHasSameClosing = older.some((o) => sameKm(o.closing, s.closing));
    if (!olderHasSameClosing) return s;
  }
  return rows[0] ?? null;
}

/**
 * Quad Insulation follows the latest P&L stock row for that family
 * (same as Process WIP on the newest Quad save).
 */
export function pickNewestInsulation(
  rows: SharedInsulationStatus[],
): SharedInsulationStatus | null {
  return rows[0] ?? null;
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
