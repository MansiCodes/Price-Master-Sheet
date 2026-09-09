import { prisma } from "@/lib/db";
import { isQuadSignalPlant } from "@/lib/plant-layout";

const QUAD_SIGNAL_CODES = ["QUAD", "SIGNALLING", "QUADSIGNAL"] as const;

export type PlantIdFilter =
  | { plantId: string }
  | { plantId: { in: string[] } };

/** Prisma `where` fragment for one or many plant ids. */
export function plantIdFilter(plantIds: string[]): PlantIdFilter {
  const ids = [...new Set(plantIds.filter(Boolean))];
  if (ids.length <= 1) return { plantId: ids[0] ?? "" };
  return { plantId: { in: ids } };
}

/**
 * Plants to include when reading P&L / registers.
 * Quad + Signal is one logical plant: always include QUAD and legacy SIGNALLING.
 */
export async function resolveReportPlantIds(plantId: string): Promise<string[]> {
  const plant = await prisma.plant.findUnique({
    where: { id: plantId },
    select: { id: true, code: true },
  });
  if (!plant) return [plantId];
  if (!isQuadSignalPlant(plant.code)) return [plant.id];

  const siblings = await prisma.plant.findMany({
    where: { code: { in: [...QUAD_SIGNAL_CODES] } },
    select: { id: true },
  });
  const ids = siblings.map((s) => s.id);
  return ids.length > 0 ? ids : [plant.id];
}

/**
 * Writes (Today entry, Excel import) always go to the canonical QUAD plant
 * when the selected plant is Quad + Signal (or legacy Signal).
 */
export async function resolveCanonicalWritePlantId(
  plantId: string,
): Promise<string> {
  const plant = await prisma.plant.findUnique({
    where: { id: plantId },
    select: { id: true, code: true },
  });
  if (!plant) return plantId;
  if (!isQuadSignalPlant(plant.code)) return plant.id;

  const quad = await prisma.plant.findFirst({
    where: { code: "QUAD" },
    select: { id: true },
  });
  return quad?.id ?? plant.id;
}

/** Stable family key for Excel fingerprints (shared across QUAD / SIGNALLING). */
export function importFamilyKey(plantCode: string | null | undefined): string {
  if (isQuadSignalPlant(plantCode)) return "QUAD";
  return (plantCode ?? "").trim().toUpperCase() || "PLANT";
}
