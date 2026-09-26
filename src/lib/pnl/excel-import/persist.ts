/**
 * Persist parsed P&L Excel rows into Prisma tables.
 * Skips rows that already exist (same content) — re-uploading the same file
 * or overlapping rows across files will not create duplicates.
 */
import { GlobalRole, ManpowerShift, type PrismaClient } from "@prisma/client";
import { parseDateOnly } from "@/lib/dates";
import { safeRefreshDailyStatus } from "@/lib/daily-status";
import type { ParsedPnlWorkbook } from "@/lib/pnl/excel-import/parse";
import {
  importFamilyKey,
  plantIdFilter,
  resolveCanonicalWritePlantId,
  resolveReportPlantIds,
} from "@/lib/plant-merge";
import { persistExpenses } from "@/lib/pnl/excel-import/persist-expenses";
import { persistPurchases } from "@/lib/pnl/excel-import/persist-purchases";
import { persistSales } from "@/lib/pnl/excel-import/persist-sales";
import { persistStock } from "@/lib/pnl/excel-import/persist-stock";
import {
  type ImportSummary,
  type PersistCtx,
} from "@/lib/pnl/excel-import/persist-types";

export type { ImportSummary } from "@/lib/pnl/excel-import/persist-types";

export async function persistPnlImport(opts: {
  prisma: PrismaClient;
  plantId: string;
  enteredById: string;
  role: GlobalRole;
  parsed: ParsedPnlWorkbook;
  batchId: string;
  uploadedAt: Date;
}): Promise<ImportSummary> {
  const { prisma, plantId, enteredById, role, parsed, batchId, uploadedAt } =
    opts;

  const writePlantId = await resolveCanonicalWritePlantId(plantId);
  const scopeIds = await resolveReportPlantIds(plantId);
  const plant = await prisma.plant.findUnique({
    where: { id: plantId },
    select: { code: true },
  });
  const familyKey = importFamilyKey(plant?.code);
  const pScope = plantIdFilter(scopeIds);

  const summary: ImportSummary = {
    batchId,
    uploadedAt: uploadedAt.toISOString(),
    sales: 0,
    purchases: 0,
    stock: 0,
    expenses: 0,
    electricity: 0,
    rent: 0,
    far: 0,
    duplicates: 0,
    updated: 0,
    alreadyUploaded: false,
    skipped: [...parsed.skipped],
    sheetsFound: parsed.sheetsFound,
  };

  const seenKeys = new Set<string>();
  const daysToRefresh = new Map<string, ManpowerShift>();

  function markDuplicate(sheet: string, row: number, reason: string) {
    summary.duplicates += 1;
    summary.skipped.push({ sheet, row, reason });
  }

  const ctx: PersistCtx = {
    prisma,
    writePlantId,
    enteredById,
    role,
    familyKey,
    pScope,
    uploadedAt,
    summary,
    seenKeys,
    daysToRefresh,
    markDuplicate,
  };

  await persistSales(ctx, parsed.sales);
  await persistPurchases(ctx, parsed.purchases);
  await persistStock(ctx, parsed.stock);
  await persistExpenses(ctx, parsed.expenses);

  for (const [key, shift] of daysToRefresh) {
    const dateYmd = key.split("|")[0]!;
    await safeRefreshDailyStatus(
      writePlantId,
      parseDateOnly(dateYmd),
      shift,
      enteredById,
    );
  }

  const imported =
    summary.sales +
    summary.purchases +
    summary.stock +
    summary.expenses +
    summary.electricity +
    summary.rent +
    summary.far;
  summary.alreadyUploaded =
    imported === 0 && summary.duplicates > 0 && summary.updated === 0;

  return summary;
}
