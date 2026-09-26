import {
  encodeQuadSignalStockNotes,
  getQuadSignalCableProcesses,
  type QuadSignalStockMeta,
} from "@/lib/plant-catalogs";
import {
  calculateQuadSignalWip,
  resolveQuadSignalVariant,
} from "@/lib/quad-signal-wip";

export function recomputeCableNotesWithOpening(
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
  const sharedInsulation = meta.sharedInsulation;

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
