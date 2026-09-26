import { prisma } from "@/lib/db";
import { plantIdFilter } from "@/lib/plant-merge";
import { addUtcDays, toNumber, round2 } from "./helpers";

/**
 * Opening stock for a period = the most recent closing-stock snapshot
 * entered on or before the day before `from`.
 * This means: Closing Stock (previous period) = Opening Stock (this period).
 */
export async function openingStockFromLastSnapshot(
  plantIds: string[],
  before: Date,
  approvedOnly?: boolean,
  approvedFilter?: any,
): Promise<number> {
  const dayBefore = addUtcDays(before, -1);
  return stockValueAsOf(plantIds, dayBefore, approvedOnly, approvedFilter);
}

/** Sum explicit closing-stock snapshot rows (matches Excel Stock & Rent SUM(I5:I21)). */
export async function pvcClosingStockSnapshot(
  plantIds: string[],
  asOf: Date,
  approvedOnly?: boolean,
  approvedFilter?: any,
): Promise<number> {
  return stockValueAsOf(plantIds, asOf, approvedOnly, approvedFilter);
}

/** Latest closing stock value as of a given date (inclusive). */
export async function stockValueAsOf(
  plantIds: string[],
  asOf: Date,
  approvedOnly?: boolean,
  approvedFilter?: any,
): Promise<number> {
  const entries = await prisma.stockEntry.findMany({
    where: {
      ...plantIdFilter(plantIds),
      date: { lte: asOf },
      ...approvedFilter,
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    select: {
      itemName: true,
      closingValue: true,
    },
  });

  if (entries.length === 0) return 0;

  const latestMap = new Map<string, number>();
  for (const entry of entries) {
    const key = entry.itemName.trim().toLowerCase();
    if (!latestMap.has(key)) {
      latestMap.set(key, toNumber(entry.closingValue));
    }
  }

  let total = 0;
  for (const val of latestMap.values()) {
    total += val;
  }
  return round2(total);
}
