import { ManpowerShift, StockCategory } from "@prisma/client";
import { z } from "zod";
import { round2, round4 } from "@/lib/api";
import {
  encodeQuadSignalStockNotes,
  parseQuadSignalStockNotes,
  quadSignalCableSizeDedupeKey,
} from "@/lib/plant-catalogs";
import { normalizeBillPhotoUrls } from "@/lib/cloudinary";
import { toIsoDateString } from "@/lib/dates";
import { isSignallingCableName } from "@/lib/quad-signal-wip";
import { weightedAveragePurchaseRate } from "@/lib/stock/purchase-average-rate";
import type { stockLineSchema } from "./stock-schemas";

type QuadCableRow = {
  date: Date | string;
  notes: string | null;
  category?: string | null;
  shift?: string | null;
  itemName?: string;
};

/**
 * Quad/Signal P&L Stock: one FG cable row per date + cable/size.
 * Repeated saves (any shift) keep the newest (list is newest-first).
 */
export function dedupeQuadCableRows<T extends QuadCableRow>(rows: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const row of rows) {
    if (row.category !== StockCategory.FG) {
      out.push(row);
      continue;
    }
    const day = toIsoDateString(row.date);
    const { meta } = parseQuadSignalStockNotes(row.notes);
    const sizeKey =
      meta?.kind === "cable" && meta.cable && meta.size
        ? quadSignalCableSizeDedupeKey(meta.cable, meta.size)
        : `item:${row.itemName ?? ""}`;
    const key = `${day}|${sizeKey}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

/** Same Insulation O/P/C on every Signalling size row for that date. */
export function stampSharedInsulationOnRows<T extends QuadCableRow>(rows: T[]): T[] {
  const byDay = new Map<
    string,
    { opening?: number; production?: number; closing?: number }
  >();
  for (const row of rows) {
    if (row.category !== StockCategory.FG) continue;
    const { meta } = parseQuadSignalStockNotes(row.notes);
    if (meta?.kind !== "cable" || !isSignallingCableName(meta.cable ?? "")) continue;
    const day = toIsoDateString(row.date);
    if (byDay.has(day)) continue;
    byDay.set(day, {
      opening: meta.opening?.Insulation,
      production: meta.production?.Insulation,
      closing: meta.sharedInsulation?.closing ?? meta.closing?.Insulation,
    });
  }
  return rows.map((row) => {
    if (row.category !== StockCategory.FG) return row;
    const { meta, userNotes } = parseQuadSignalStockNotes(row.notes);
    if (meta?.kind !== "cable" || !isSignallingCableName(meta.cable ?? "")) {
      return row;
    }
    const ins = byDay.get(toIsoDateString(row.date));
    if (!ins) return row;
    const next = {
      ...meta,
      opening: { ...meta.opening },
      production: { ...meta.production },
      closing: { ...meta.closing },
    };
    if (ins.opening != null) next.opening.Insulation = ins.opening;
    if (ins.production != null) next.production.Insulation = ins.production;
    if (ins.closing != null) next.closing.Insulation = ins.closing;
    return { ...row, notes: encodeQuadSignalStockNotes(next, userNotes) };
  });
}

export function dedupeTodayQuadCableRows<
  T extends {
    date: Date | string;
    notes: string | null;
    category?: string | null;
    shift?: string | null;
    itemName?: string;
  },
>(rows: T[], _todayIso?: string): T[] {
  return dedupeQuadCableRows(rows);
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
