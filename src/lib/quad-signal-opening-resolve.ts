import { prisma } from "@/lib/db";
import {
  getQuadSignalCableProcesses,
  quadSignalClosingFromMeta,
} from "@/lib/plant-catalogs";
import { plantIdFilter } from "@/lib/plant-merge";
import { isSignallingCableName } from "@/lib/quad-signal-wip";
import {
  findLatestSharedInsulationOpening,
  INSULATION_KEY,
  lastInsulationContributions,
  lastClosingAfterProduction,
  lastEnteredProductionByProcess,
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

  const [priorRows, sameDayRows] = await Promise.all([
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
  ]);

  let sizeOpening: Record<string, number> | null = null;
  let sizeOpeningFromDate: string | null = null;
  let sameDayEntryId: string | null = null;
  let sameDayInsulProd = 0;

  for (const row of sameDayRows) {
    const { match, meta } = matchesCableSize(row, cable, size, itemName);
    if (!match) continue;
    sameDayEntryId = row.id;
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

  const sizeContributions = lastInsulationContributions(
    [...sameDayRows, ...priorRows], cable, size, itemName,
  );

  const sizeProduction = sameDayEntryId
    ? lastEnteredProductionByProcess(
        sameDayRows, cable, size, itemName, getQuadSignalCableProcesses(cable),
      )
    : {};

  const poolRows = sameDayEntryId
    ? sameDayRows.filter((r) => r.id !== sameDayEntryId)
    : sameDayRows;
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
  if (sizeOpening) opening = { ...sizeOpening };
  // Latest size-row closing (including P=0 days) is today's Opening.

  if (signalling && sharedIns != null && !(sameDayEntryId && sameDayInsulProd > 0)) {
    opening[INSULATION_KEY] = sharedIns.value;
  }

  const processes = getQuadSignalCableProcesses(cable);
  for (let i = 0; i < processes.length; i++) {
    const proc = processes[i]!;
    if (proc.trim().toLowerCase() === "insulation") continue;
    const afterP = lastClosingAfterProduction(
      [...sameDayRows, ...priorRows], cable, size, itemName, proc, processes[i + 1],
    );
    if (afterP != null) opening[proc] = afterP;
  }

  const production: Record<string, number> = { ...sizeProduction };
  delete production[INSULATION_KEY];
  const insulationContributions = sizeContributions;

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
