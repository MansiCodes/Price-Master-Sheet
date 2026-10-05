import { prisma } from "@/lib/db";
import { isCat6Plant } from "@/lib/plant-layout";
import { plantIdFilter, resolveReportPlantIds } from "@/lib/plant-merge";
import type { PlantPnlResult, PlantPnlStatement } from "@/lib/pnl/types";
import { buildCat6Dynamic } from "./cat6";
import { buildDynamic } from "./dynamic";
import { startOfUtcDay } from "./helpers";
import { buildPvcDynamic } from "./pvc";

function ymdUtc(d: Date): string {
  return startOfUtcDay(d).toISOString().slice(0, 10);
}

/** First sale / purchase / expense / stock / FAR date for this plant. */
export async function earliestPlantActivityYmd(
  plantId: string,
): Promise<string | null> {
  const plantIds = await resolveReportPlantIds(plantId);
  const where = plantIdFilter(plantIds);
  const [sale, purchase, petty, stock, manpower, asset] = await Promise.all([
    prisma.sale.aggregate({ where, _min: { date: true } }),
    prisma.purchase.aggregate({ where, _min: { date: true } }),
    prisma.pettyCashEntry.aggregate({ where, _min: { date: true } }),
    prisma.stockEntry.aggregate({ where, _min: { date: true } }),
    prisma.manpowerEntry.aggregate({ where, _min: { date: true } }),
    prisma.fixedAsset.aggregate({ where, _min: { billDate: true } }),
  ]);
  const dates = [
    sale._min.date,
    purchase._min.date,
    petty._min.date,
    stock._min.date,
    manpower._min.date,
    asset._min.billDate,
  ].filter((d): d is Date => d != null);
  if (!dates.length) return null;
  return ymdUtc(new Date(Math.min(...dates.map((d) => d.getTime()))));
}

export async function calculatePlantPnl(
  plantId: string,
  fromDate: Date,
  toDate: Date,
  options?: { enteredById?: string },
): Promise<PlantPnlResult> {
  const statement = await calculatePlantPnlStatement(
    plantId,
    fromDate,
    toDate,
    options,
  );
  return {
    salesRevenue: statement.salesRevenue,
    cogs: statement.cogs,
    manpower: statement.manpower,
    electricity: statement.electricity,
    rent: statement.rent,
    pettyCash: statement.pettyCash,
    depreciation: statement.depreciation,
    grossProfit: statement.grossProfit,
    netProfit: statement.netProfit,
  };
}

export async function calculatePlantPnlStatement(
  plantId: string,
  fromDate: Date,
  toDate: Date,
  options?: { enteredById?: string; approvedOnly?: boolean },
): Promise<PlantPnlStatement> {
  const from = startOfUtcDay(fromDate);
  const to = startOfUtcDay(toDate);
  const enteredById = options?.enteredById;
  const scoped = Boolean(enteredById);
  const approvedOnly = options?.approvedOnly;

  if (from.getTime() > to.getTime()) {
    throw new Error("fromDate must be on or before toDate");
  }

  const plant = await prisma.plant.findUnique({
    where: { id: plantId },
    select: { code: true },
  });
  const plantIds = await resolveReportPlantIds(plantId);

  if (isCat6Plant(plant?.code)) {
    return buildCat6Dynamic(plantIds, from, to, scoped, enteredById, approvedOnly);
  }

  if (plant?.code?.toUpperCase() === "PVC") {
    return buildPvcDynamic(plantIds, from, to, scoped, enteredById, approvedOnly);
  }

  return buildDynamic(plantIds, from, to, scoped, enteredById, plant?.code, approvedOnly);
}
