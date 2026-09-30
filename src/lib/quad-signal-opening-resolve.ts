import { prisma } from "@/lib/db";
import { getQuadSignalCableProcesses } from "@/lib/plant-catalogs";
import { plantIdFilter } from "@/lib/plant-merge";
import { isSignallingCableName } from "@/lib/quad-signal-wip";
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

  if (signalling) {
    delete opening[INSULATION_KEY];
    delete production[INSULATION_KEY];
    const ins = buildCableStockStatus(byFill).sharedInsulation;
    if (ins) {
      opening[INSULATION_KEY] = ins.closing;
      insFromDate = ins.entryDate;
      insulationContributions = [];
    }
  }

  if (Object.keys(opening).length === 0 && !sameDayEntryId && production[INSULATION_KEY] == null) {
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
    openingFromDate: insFromDate ?? sizeOpen.fromDate,
    openingEditable: true,
    sameDayEntryId,
    production,
    insulationContributions,
  };
}
