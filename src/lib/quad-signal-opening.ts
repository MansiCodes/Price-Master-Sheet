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
  calculateSharedSignallingInsulation,
  isSignallingCableName,
  resolveQuadSignalVariant,
  type SharedInsulationSizeContribution,
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

const INSULATION_KEY = "Insulation";

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

function matchesSignallingCable(row: {
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
function insulationClosingFromMeta(
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

/**
 * Prefer newest Signalling entry with sharedInsulation.closing (multi-size total).
 * Else newest Insulation closing. rows must be newest-first.
 */
function findLatestSharedInsulationOpening(
  rows: Array<{ date?: Date; itemName: string; notes: string | null }>,
): { value: number; fromDate: string | null } | null {
  for (const row of rows) {
    const sig = matchesSignallingCable(row);
    if (!sig.match || !sig.meta?.sharedInsulation) continue;
    if (!Number.isFinite(sig.meta.sharedInsulation.closing)) continue;
    return {
      value: Number(sig.meta.sharedInsulation.closing),
      fromDate: row.date ? row.date.toISOString().slice(0, 10) : null,
    };
  }
  for (const row of rows) {
    const sig = matchesSignallingCable(row);
    if (!sig.match) continue;
    const ins = insulationClosingFromMeta(sig.meta);
    if (ins == null) continue;
    return {
      value: ins,
      fromDate: row.date ? row.date.toISOString().slice(0, 10) : null,
    };
  }
  return null;
}

function recomputeCableNotesWithOpening(
  meta: QuadSignalStockMeta,
  userNotes: string,
  opening: Record<string, number>,
): string {
  const cable = meta.cable!;
  const size = meta.size!;
  const production = meta.production ?? {};
  const salesKm = Number(meta.salesKm) || 0;
  const processes = [...getQuadSignalCableProcesses(cable)];
  const variant = resolveQuadSignalVariant(size);
  const lengthFactor =
    meta.calcSnapshot?.lengthFactor ?? variant?.lengthFactor ?? 1;
  const coreCount = meta.calcSnapshot?.coreCount ?? variant?.coreCount ?? 1;

  if (!(processes.length > 0 && variant)) {
    return encodeQuadSignalStockNotes({ ...meta, opening }, userNotes);
  }

  let insulationConsumedOverride: number | undefined;
  let sharedInsulation = meta.sharedInsulation;

  if (
    isSignallingCableName(cable) &&
    Array.isArray(meta.sharedInsulation?.contributions) &&
    meta.sharedInsulation!.contributions.length > 0
  ) {
    const shared = calculateSharedSignallingInsulation({
      opening: opening[INSULATION_KEY] ?? 0,
      production: production[INSULATION_KEY] ?? 0,
      sizes: meta.sharedInsulation!.contributions.map((c) => ({
        size: c.size,
        layingProduced: c.layingProduced,
        coreCount: c.coreCount,
        lengthFactor: c.lengthFactor,
      })),
    });
    insulationConsumedOverride = shared.consumed;
    sharedInsulation = {
      consumed: shared.consumed,
      closing: shared.closing,
      contributions: shared.contributions,
    };
  }

  const wip = calculateQuadSignalWip({
    processes,
    opening,
    production,
    salesKm,
    coreCount,
    lengthFactor,
    insulationConsumedOverride,
  });
  const next: QuadSignalStockMeta = {
    ...meta,
    opening,
    closing: wip.byProcess,
    processes: wip.byProcess,
    sharedInsulation,
    calcSnapshot: {
      ...wip.calcSnapshot,
      drumLabel: meta.calcSnapshot?.drumLabel ?? variant.drumLabel,
    },
  };
  return encodeQuadSignalStockNotes(next, userNotes);
}

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

  if (allowOpeningOverride) {
    return recomputeCableNotesWithOpening(
      meta,
      userNotes,
      meta.opening ?? {},
    );
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

  // Always refresh Signalling Insulation from shared pool when locking
  if (isSignallingCableName(cable)) {
    const resolved = await resolveQuadSignalStockOpening({
      plantIds,
      day,
      cable,
      size,
    });
    if (resolved.opening[INSULATION_KEY] != null) {
      opening = {
        ...opening,
        [INSULATION_KEY]: resolved.opening[INSULATION_KEY]!,
      };
    }
  }

  return recomputeCableNotesWithOpening(meta, userNotes, opening);
}

export type { SharedInsulationSizeContribution };
