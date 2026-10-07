import { prisma } from "@/lib/db";
import { getQuadSignalCableProcesses, quadSignalCableSizeDedupeKey } from "@/lib/plant-catalogs";
import { plantIdFilter } from "@/lib/plant-merge";
import { isQuadCableName, isSignallingCableName } from "@/lib/quad-signal-wip";
import { buildCableStockStatus } from "@/lib/stock-production-status";
import {
  INSULATION_KEY,
  lastEnteredOpeningByProcess,
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
  production: Record<string, number>;
  insulationContributions: InsulationPoolContribution[];
  putupKm: number;
};

function fillRowOrder<T extends { updatedAt: Date; createdAt: Date }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const byUpd = b.updatedAt.getTime() - a.updatedAt.getTime();
    if (byUpd !== 0) return byUpd;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
}

/**
 * Size WIP = last fill. Signalling Insulation = the Stock card snapshot
 * (same rows + buildCableStockStatus), so the form Opening matches Insul km.
 */
export async function resolveQuadSignalStockOpening(params: {
  plantIds: string[];
  day: Date;
  cable: string;
  size: string;
  alwaysEditable?: boolean;
}): Promise<QuadSignalOpeningResolve> {
  const { plantIds, day, cable, size } = params;
  const pScope = plantIdFilter(plantIds);
  const itemName = `${cable} · ${size}`;
  const signalling = isSignallingCableName(cable);
  const dayIso = day.toISOString().slice(0, 10);

  const rows = await prisma.stockEntry.findMany({
    where: {
      ...pScope,
      category: "FG",
      date: { lte: day },
      notes: { startsWith: "QSSTOCK:" },
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: 2500,
    select: {
      id: true,
      date: true,
      createdAt: true,
      updatedAt: true,
      itemName: true,
      notes: true,
    },
  });

  const sameDayRows = rows.filter(
    (r) => r.date.toISOString().slice(0, 10) === dayIso,
  );
  const processes = getQuadSignalCableProcesses(cable);
  const byFill = fillRowOrder(rows);

  let sameDayEntryId: string | null = null;
  for (const row of sameDayRows) {
    const { match } = matchesCableSize(row, cable, size, itemName);
    if (!match) continue;
    sameDayEntryId = row.id;
    break;
  }

  const sizeOpen = lastEnteredOpeningByProcess(
    byFill, cable, size, itemName, processes, signalling, !sameDayEntryId,
  );
  const sizeProduction = lastEnteredProductionByProcess(
    byFill, cable, size, itemName, processes, signalling,
  );

  const opening: Record<string, number> = { ...sizeOpen.opening };
  const production: Record<string, number> = { ...sizeProduction };
  let insulationContributions: InsulationPoolContribution[] = [];
  let insFromDate: string | null = null;

  const built = buildCableStockStatus(byFill);
  const wantKey = quadSignalCableSizeDedupeKey(cable, size);
  const block = built.blocks.find(
    (b) => quadSignalCableSizeDedupeKey(b.cable, b.size) === wantKey,
  );

  const familyIns = signalling
    ? built.sharedInsulation
    : isQuadCableName(cable)
      ? built.quadInsulation
      : null;
  const putupKm = block
    ? Math.round(
        (block.callPutupItems ?? []).reduce(
          (sum, item) => sum + (Number(item.qty) > 0 ? Number(item.qty) : 0),
          0,
        ) * 1000,
      ) / 1000
    : 0;
  if (familyIns) {
    delete opening[INSULATION_KEY];
    delete production[INSULATION_KEY];
    opening[INSULATION_KEY] = familyIns.closing;
    insFromDate = familyIns.entryDate;
    insulationContributions = [];
  } else if (signalling) {
    delete opening[INSULATION_KEY];
    delete production[INSULATION_KEY];
  }

  if (Object.keys(opening).length === 0 && !sameDayEntryId && production[INSULATION_KEY] == null) {
    return {
      opening: {},
      openingFromDate: null,
      openingEditable: true,
      sameDayEntryId: null,
      production,
      insulationContributions,
      putupKm,
    };
  }

  return {
    opening,
    openingFromDate: insFromDate ?? sizeOpen.fromDate,
    openingEditable: true,
    sameDayEntryId,
    production,
    insulationContributions,
    putupKm,
  };
}
