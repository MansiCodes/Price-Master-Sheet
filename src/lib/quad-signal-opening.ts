import { prisma } from "@/lib/db";
import {
  encodeQuadSignalStockNotes,
  getQuadSignalCableProcesses,
  parseQuadSignalStockNotes,
  quadSignalClosingFromMeta,
  type QuadSignalStockMeta,
} from "@/lib/plant-catalogs";
import { plantIdFilter } from "@/lib/plant-merge";
import {
  calculateQuadSignalWip,
  resolveQuadSignalVariant,
} from "@/lib/quad-signal-wip";

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

function matchesCableSize(
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

/**
 * Opening WIP for Quad/Signal cable stock.
 * Default: editable only once (first entry per cable+size).
 * Designated editor may always override Opening; next day still uses this
 * entry's Closing as Opening.
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

  const priorRows = await prisma.stockEntry.findMany({
    where: {
      ...pScope,
      date: { lt: day },
      category: "FG",
      OR: [{ itemName }, { notes: { startsWith: "QSSTOCK:" } }],
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: 40,
    select: { id: true, date: true, itemName: true, notes: true },
  });

  for (const row of priorRows) {
    const { match, meta } = matchesCableSize(row, cable, size, itemName);
    if (!match) continue;
    return {
      opening: quadSignalClosingFromMeta(meta),
      openingFromDate: row.date.toISOString().slice(0, 10),
      openingEditable: alwaysEditable,
      sameDayEntryId: null,
    };
  }

  const sameDayRows = await prisma.stockEntry.findMany({
    where: {
      ...pScope,
      date: day,
      category: "FG",
      OR: [{ itemName }, { notes: { startsWith: "QSSTOCK:" } }],
    },
    orderBy: [{ createdAt: "asc" }],
    take: 40,
    select: { id: true, itemName: true, notes: true },
  });

  for (const row of sameDayRows) {
    const { match, meta } = matchesCableSize(row, cable, size, itemName);
    if (!match) continue;
    return {
      opening: meta?.opening ?? {},
      openingFromDate: null,
      openingEditable: alwaysEditable,
      sameDayEntryId: row.id,
    };
  }

  return {
    opening: {},
    openingFromDate: null,
    openingEditable: true,
    sameDayEntryId: null,
  };
}

/**
 * On create/update: if opening is locked, force server opening and recompute closing.
 * First-time seed / designated editor keeps client opening.
 */
export async function applyQuadSignalOpeningLockToNotes(params: {
  plantIds: string[];
  day: Date;
  notes: string | null | undefined;
  /** When editing, keep the opening that was already saved (non-editors). */
  lockOpeningTo?: Record<string, number> | null;
  /** Designated editor may submit a new Opening anytime. */
  allowOpeningOverride?: boolean;
}): Promise<string | null | undefined> {
  const {
    plantIds,
    day,
    notes,
    lockOpeningTo,
    allowOpeningOverride = false,
  } = params;
  if (notes == null) return notes;

  const { meta, userNotes } = parseQuadSignalStockNotes(notes);
  if (!meta || meta.kind !== "cable" || !meta.cable || !meta.size) {
    return notes;
  }

  const cable = meta.cable;
  const size = meta.size;
  const production = meta.production ?? {};
  const salesKm = Number(meta.salesKm) || 0;

  if (allowOpeningOverride) {
    const opening = meta.opening ?? {};
    const processes = [...getQuadSignalCableProcesses(cable)];
    const variant = resolveQuadSignalVariant(size);
    const lengthFactor =
      meta.calcSnapshot?.lengthFactor ?? variant?.lengthFactor ?? 1;
    const coreCount = meta.calcSnapshot?.coreCount ?? variant?.coreCount ?? 1;
    if (processes.length > 0 && variant) {
      const wip = calculateQuadSignalWip({
        processes,
        opening,
        production,
        salesKm,
        coreCount,
        lengthFactor,
      });
      const next: QuadSignalStockMeta = {
        ...meta,
        opening,
        closing: wip.byProcess,
        processes: wip.byProcess,
        calcSnapshot: {
          ...wip.calcSnapshot,
          drumLabel: meta.calcSnapshot?.drumLabel ?? variant.drumLabel,
        },
      };
      return encodeQuadSignalStockNotes(next, userNotes);
    }
    return notes;
  }

  let opening = meta.opening ?? {};
  let mustLock = lockOpeningTo != null;

  if (lockOpeningTo != null) {
    opening = lockOpeningTo;
  } else {
    const resolved = await resolveQuadSignalStockOpening({
      plantIds,
      day,
      cable,
      size,
    });
    if (!resolved.openingEditable) {
      opening = resolved.opening;
      mustLock = true;
    }
  }

  if (!mustLock) return notes;

  const processes = [...getQuadSignalCableProcesses(cable)];
  const variant = resolveQuadSignalVariant(size);
  const lengthFactor =
    meta.calcSnapshot?.lengthFactor ?? variant?.lengthFactor ?? 1;
  const coreCount = meta.calcSnapshot?.coreCount ?? variant?.coreCount ?? 1;

  if (processes.length > 0 && variant) {
    const wip = calculateQuadSignalWip({
      processes,
      opening,
      production,
      salesKm,
      coreCount,
      lengthFactor,
    });
    const next: QuadSignalStockMeta = {
      ...meta,
      opening,
      closing: wip.byProcess,
      processes: wip.byProcess,
      calcSnapshot: {
        ...wip.calcSnapshot,
        drumLabel: meta.calcSnapshot?.drumLabel ?? variant.drumLabel,
      },
    };
    return encodeQuadSignalStockNotes(next, userNotes);
  }

  return encodeQuadSignalStockNotes({ ...meta, opening }, userNotes);
}
