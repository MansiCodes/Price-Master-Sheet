import { parseQuadSignalStockNotes } from "@/lib/plant-catalogs";
import { isSignallingCableName } from "@/lib/quad-signal-wip";
import { INSULATION_KEY } from "@/lib/quad-signal-opening-match";
import { recomputeCableNotesWithOpening } from "@/lib/quad-signal-opening-recompute";
import { resolveQuadSignalStockOpening } from "@/lib/quad-signal-opening-resolve";

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
