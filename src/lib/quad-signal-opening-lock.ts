import { parseQuadSignalStockNotes } from "@/lib/plant-catalogs";
import { recomputeCableNotesWithOpening } from "@/lib/quad-signal-opening-recompute";
import { resolveQuadSignalStockOpening } from "@/lib/quad-signal-opening-resolve";

function hasOpeningValues(opening: Record<string, number> | undefined): boolean {
  if (!opening) return false;
  return Object.values(opening).some((n) => Number.isFinite(Number(n)));
}

/**
 * Keep the submitted last fill when the form sent Opening.
 * Only seed Opening from the last fill when the client left it empty.
 */
export async function applyQuadSignalOpeningLockToNotes(params: {
  plantIds: string[];
  day: Date;
  notes: string | null | undefined;
  lockOpeningTo?: Record<string, number> | null;
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

  if (allowOpeningOverride || lockOpeningTo != null) {
    const opening = lockOpeningTo ?? meta.opening ?? {};
    return recomputeCableNotesWithOpening(meta, userNotes, opening);
  }

  if (hasOpeningValues(meta.opening)) {
    return recomputeCableNotesWithOpening(meta, userNotes, meta.opening ?? {});
  }

  const resolved = await resolveQuadSignalStockOpening({
    plantIds,
    day,
    cable: meta.cable,
    size: meta.size,
  });
  if (Object.keys(resolved.opening).length === 0) return notes;
  return recomputeCableNotesWithOpening(meta, userNotes, resolved.opening);
}
