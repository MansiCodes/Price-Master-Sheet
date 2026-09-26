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
  };
}

/**
 * Shared insulation is one pool. Prefer the row that actually received
 * today's insulation production (e.g. 188.24 with 134km), not a later
 * size save that only copied a stale closing.
 */
export function pickBestInsulation(
  rows: SharedInsulationStatus[],
): SharedInsulationStatus | null {
  if (rows.length === 0) return null;
  const latest = rows.reduce(
    (d, r) => (r.entryDate > d ? r.entryDate : d),
    rows[0]!.entryDate,
  );
  const onDay = rows.filter((r) => r.entryDate === latest);
  const withProd = onDay.filter((r) => r.production > 0);
  return withProd[0] ?? onDay[0] ?? null;
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
