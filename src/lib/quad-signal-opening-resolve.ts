import { prisma } from "@/lib/db";
import { quadSignalClosingFromMeta } from "@/lib/plant-catalogs";
import { plantIdFilter } from "@/lib/plant-merge";
import { isSignallingCableName } from "@/lib/quad-signal-wip";
import {
  findLatestSharedInsulationOpening,
  INSULATION_KEY,
  matchesCableSize,
} from "@/lib/quad-signal-opening-match";

export type QuadSignalOpeningResolve = {
  opening: Record<string, number>;
  openingFromDate: string | null;
  /**
   * True for first entry of a cable+size, or when the designated editor
   * (Tarun) may always override Opening.
   */
  openingEditable: boolean;
  sameDayEntryId: string | null;
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
      take: 80,
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
      take: 80,
      select: { id: true, date: true, itemName: true, notes: true },
    }),
  ]);

  let sizeOpening: Record<string, number> | null = null;
  let sizeOpeningFromDate: string | null = null;
  let sameDayEntryId: string | null = null;
  let sameDayOpening: Record<string, number> | null = null;

  for (const row of sameDayRows) {
    const { match, meta } = matchesCableSize(row, cable, size, itemName);
    if (!match) continue;
    sameDayEntryId = row.id;
    sameDayOpening = { ...(meta?.opening ?? {}) };
    break;
  }

  for (const row of priorRows) {
    const { match, meta } = matchesCableSize(row, cable, size, itemName);
    if (!match) continue;
    sizeOpening = quadSignalClosingFromMeta(meta);
    sizeOpeningFromDate = row.date.toISOString().slice(0, 10);
    break;
  }

  // Same-day shared Insulation CLOSING beats any prior-day Insulation value.
  const sharedToday = signalling
    ? findLatestSharedInsulationOpening(
        sameDayEntryId
          ? sameDayRows.filter((r) => r.id !== sameDayEntryId)
          : sameDayRows,
      )
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

  if (signalling && sharedIns != null && !sameDayEntryId) {
    // New size today: Insulation opening = today's shared closing (e.g. 227),
    // never yesterday's size-specific closing (e.g. 46).
    opening[INSULATION_KEY] = sharedIns.value;
  }

  if (Object.keys(opening).length === 0 && !sameDayEntryId) {
    return {
      opening: {},
      openingFromDate: null,
      openingEditable: true,
      sameDayEntryId: null,
    };
  }

  return {
    opening,
    openingFromDate: sharedToday
      ? null
      : (sharedIns?.fromDate ?? sizeOpeningFromDate),
    openingEditable,
    sameDayEntryId,
  };
}
