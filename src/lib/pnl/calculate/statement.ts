import { prisma } from "@/lib/db";
import { isCat6Plant } from "@/lib/plant-layout";
import { resolveReportPlantIds } from "@/lib/plant-merge";
import type { PlantPnlResult, PlantPnlStatement } from "@/lib/pnl/types";
import { buildCat6Dynamic } from "./cat6";
import { buildDynamic } from "./dynamic";
import { startOfUtcDay } from "./helpers";
import { buildPvcDynamic } from "./pvc";

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
