import { ManpowerShift, StockCategory } from "@prisma/client";
import { z } from "zod";
import { round2, round4 } from "@/lib/api";
import {
  parseQuadSignalStockNotes,
  quadSignalCableSizeDedupeKey,
} from "@/lib/plant-catalogs";
import { normalizeBillPhotoUrls } from "@/lib/cloudinary";
import { toIsoDateString } from "@/lib/dates";
import { weightedAveragePurchaseRate } from "@/lib/stock/purchase-average-rate";
import type { stockLineSchema } from "./stock-schemas";

/**
 * For Quad/Signal P&L Stock table: on today's date only, collapse near-duplicate
 * FG cable rows (Other spellings / double submits). Keeps newest (list is newest-first).
 */
export function dedupeTodayQuadCableRows<
  T extends { date: Date; notes: string | null; category?: string | null },
>(rows: T[], todayIso: string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const row of rows) {
    const day = toIsoDateString(row.date);
    if (day !== todayIso || row.category !== StockCategory.FG) {
      out.push(row);
      continue;
    }
    const { meta } = parseQuadSignalStockNotes(row.notes);
    if (!meta || meta.kind !== "cable" || !meta.cable || !meta.size) {
      out.push(row);
      continue;
    }
    const key = quadSignalCableSizeDedupeKey(meta.cable, meta.size);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

export function lineAmounts(quantity: number, rate?: number, value?: number) {
  if (value != null && Number.isFinite(value)) {
    const closingValue = round2(value);
    const computedRate =
      quantity > 0 ? round4(closingValue / quantity) : round4(rate ?? 0);
    return { quantity, rate: computedRate, closingValue };
  }
  const safeRate = round4(rate ?? 0);
  return {
    quantity,
    rate: safeRate,
    closingValue: round2(quantity * safeRate),
  };
}

export async function resolveStockLineAmounts(
  plantId: string,
  day: Date,
  quantity: number,
  rate?: number,
  value?: number,
  itemName?: string,
) {
  if (
    itemName &&
    (!(rate != null && rate > 0) || value == null) &&
    quantity > 0
  ) {
    const avg = await weightedAveragePurchaseRate(plantId, itemName, day);
    if (avg && avg.rate > 0) {
      return lineAmounts(quantity, avg.rate, value);
    }
  }
  return lineAmounts(quantity, rate, value);
}

export function stockEntryCreateData(
  plantId: string,
  enteredById: string,
  header: {
    shift: ManpowerShift;
    photoUrl?: string | null;
    photoUrls?: string[];
  },
  line: z.infer<typeof stockLineSchema>,
  amounts: ReturnType<typeof lineAmounts>,
  photos: ReturnType<typeof normalizeBillPhotoUrls>,
  approvalFields: Record<string, unknown>,
  backdated: boolean,
  day: Date,
) {
  return {
    plantId,
    date: day,
    shift: header.shift,
    itemName: line.itemName,
    category: line.category,
    unit: line.unit,
    quantity: amounts.quantity,
    rate: amounts.rate,
    closingValue: amounts.closingValue,
    notes: line.notes ?? null,
    photoUrl: photos.billPhotoUrl,
    photoUrls: photos.billPhotoUrls,
    enteredById,
    isBackdated: backdated,
    ...approvalFields,
  };
}
