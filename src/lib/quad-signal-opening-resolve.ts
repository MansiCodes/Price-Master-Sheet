import { prisma } from "@/lib/db";
import {
  getQuadSignalCableProcesses,
  quadSignalClosingFromMeta,
} from "@/lib/plant-catalogs";
import { plantIdFilter } from "@/lib/plant-merge";
import { isSignallingCableName, normalizeCableName } from "@/lib/quad-signal-wip";
import {
  findLatestInsulationPoolMeta,
  findLatestSharedInsulationOpening,
  INSULATION_KEY,
  lastInsulationContributions,
  lastPositiveProductionByProcess,
  matchesCableSize,
} from "@/lib/quad-signal-opening-match";

export type InsulationPoolContribution = {
  size: string;
  layingProduced: number;
  coreCount: number;
  lengthFactor: number;
  consumed: number;
};

export type QuadSignalOpeningResolve = {
  opening: Record<string, number>;
  openingFromDate: string | null;
  openingEditable: boolean;
  sameDayEntryId: string | null;
  /** Last saved Process WIP production (Stock Excel process columns). */
  production: Record<string, number>;
  insulationContributions: InsulationPoolContribution[];
};

/**
 * Opening WIP for Quad/Signal cable stock.
 *
 * Signalling Insulation is one pool for the day:
 * - Once any Signalling size saves Insulation today, later sizes use that
 *   entry's Insulation CLOSING (e.g. 227.24), not an older size-specific
 *   opening (e.g. yesterday's 46).
 * - Other stages (Laying → Outer) stay size-specific from that size's prior closing.
 */
function cableItemNamePrefixes(cable: string): string[] {
  const names = new Set([cable.trim(), normalizeCableName(cable)]);
  if (isSignallingCableName(cable)) {
    names.add("Signalling Cable");
    names.add("Signaling Cable");
  }
  return [...names].filter(Boolean).map((n) => `${n} ·`);
}

export async function resolveQuadSignalStockOpening(params: {
  plantIds: string[];
  day: Date;
  cable: string;
  size: string;
  /** When true (Tarun), Opening stays editable even with history. */
  alwaysEditable?: boolean;
}): Promise<QuadSignalOpeningResolve> {
  const { plantIds, day, cable, size, alwaysEditable = false } = params;
  const pScope = plantIdFilter(plantIds);
  const itemName = `${cable} · ${size}`;
  const signalling = isSignallingCableName(cable);
  const cablePrefixes = cableItemNamePrefixes(cable);

  const [priorRows, sameDayRows, cableRows] = await Promise.all([
    prisma.stockEntry.findMany({
      where: {
        ...pScope,
        date: { lt: day },
        category: "FG",
        OR: [{ itemName }, { notes: { startsWith: "QSSTOCK:" } }],
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 2500,
      select: { id: true, date: true, itemName: true, notes: true },
    }),
    prisma.stockEntry.findMany({
      where: {
        ...pScope,
        date: day,
        category: "FG",
        OR: [{ itemName }, { notes: { startsWith: "QSSTOCK:" } }],
      },
      orderBy: [{ createdAt: "desc" }],
      take: 2500,
      select: { id: true, date: true, itemName: true, notes: true },
    }),
    prisma.stockEntry.findMany({
      where: {
        ...pScope,
        category: "FG",
        OR: cablePrefixes.map((prefix) => ({
          itemName: { startsWith: prefix },
        })),
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 1500,
      select: { id: true, date: true, itemName: true, notes: true },
    }),
  ]);

  let sizeOpening: Record<string, number> | null = null;
  let sizeOpeningFromDate: string | null = null;
  let sameDayEntryId: string | null = null;
  let sameDayOpening: Record<string, number> | null = null;
  let sameDayInsulProd = 0;

  for (const row of sameDayRows) {
    const { match, meta } = matchesCableSize(row, cable, size, itemName);
    if (!match) continue;
    sameDayEntryId = row.id;
    sameDayOpening = { ...(meta?.opening ?? {}) };
    sameDayInsulProd = Number(meta?.production?.[INSULATION_KEY]) || 0;
    break;
  }

  for (const row of priorRows) {
    const { match, meta } = matchesCableSize(row, cable, size, itemName);
    if (!match) continue;
    sizeOpening = quadSignalClosingFromMeta(meta);
    sizeOpeningFromDate = row.date.toISOString().slice(0, 10);
    break;
  }

  const seenProd = new Set<string>();
  const cableHistory: typeof cableRows = [];
  for (const row of [...cableRows, ...sameDayRows, ...priorRows]) {
    if (seenProd.has(row.id)) continue;
    seenProd.add(row.id);
    cableHistory.push(row);
  }
  const sizeProduction = lastPositiveProductionByProcess(
    cableHistory, cable, size, itemName, getQuadSignalCableProcesses(cable),
  );
  const sizeContributions = lastInsulationContributions(
    cableHistory, cable, size, itemName,
  );

  const poolRows = sameDayEntryId
    ? sameDayRows.filter((r) => r.id !== sameDayEntryId)
    : sameDayRows;
  const poolToday = signalling ? findLatestInsulationPoolMeta(poolRows) : null;
  const poolPrior = signalling ? findLatestInsulationPoolMeta(priorRows) : null;
  const poolMeta = poolToday ?? poolPrior;

  // Same-day shared Insulation CLOSING beats any prior-day Insulation value.
  const sharedToday = signalling
    ? findLatestSharedInsulationOpening(poolRows)
    : null;
  const sharedPrior = signalling
    ? findLatestSharedInsulationOpening(priorRows)
    : null;
  const sharedIns = sharedToday ?? sharedPrior;

  const hasSizeHistory = sizeOpening != null || sameDayEntryId != null;
  const openingEditable =
    alwaysEditable ||
    (!hasSizeHistory && !(signalling && sharedToday != null));

  let opening: Record<string, number> = {};
  if (sameDayOpening && Object.keys(sameDayOpening).length > 0) {
    opening = { ...sameDayOpening };
  } else if (sizeOpening) {
    opening = { ...sizeOpening };
  }

  if (signalling && sharedIns != null && !(sameDayEntryId && sameDayInsulProd > 0)) {
    // Insulation opening = last filled pool (Stock card), even if this size
    // was saved today with a stale Opening and Insulation P: 0.
    opening[INSULATION_KEY] = sharedIns.value;
  }

  const production: Record<string, number> = { ...sizeProduction };
  if (signalling && poolMeta && poolMeta.production > 0 && production[INSULATION_KEY] == null) {
    production[INSULATION_KEY] = poolMeta.production;
  }
  const insulationContributions =
    sizeContributions.length > 0
      ? sizeContributions
      : (poolMeta?.contributions ?? []);

  if (Object.keys(opening).length === 0 && !sameDayEntryId) {
    return {
      opening: {},
      openingFromDate: null,
      openingEditable: true,
      sameDayEntryId: null,
      production,
      insulationContributions,
    };
  }

  return {
    opening,
    openingFromDate: sharedToday
      ? null
      : (sharedIns?.fromDate ?? sizeOpeningFromDate),
    openingEditable,
    sameDayEntryId,
    production,
    insulationContributions,
  };
}
