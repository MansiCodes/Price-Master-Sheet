import { NextRequest, NextResponse } from "next/server";
import { ManpowerShift, StockCategory } from "@prisma/client";
import { z } from "zod";
import {
  requireCanEnterStock,
  requireDeleteConfirmation,
  requirePlantAccess,
  requireSession,
  round2,
  round4,
  zodErrorResponse,
} from "@/lib/api";
import { writeAuditLog, safeWriteAuditLog } from "@/lib/audit";
import { entryApprovalCreateData, entryApprovalResetOnEdit, resolveEntryApprovalFlags } from "@/lib/entry-approval";
import { safeRefreshDailyStatus } from "@/lib/daily-status";
import { maybeAwardCreditScore, maybeRevokeCreditScore } from "@/lib/credit-score";
import { dateOnlyRegex, isBackdated, parseDateOnly } from "@/lib/dates";
import { dateRangeFromSearchParams } from "@/lib/api-date-range";
import { prisma } from "@/lib/db";
import { CAT6_PNL_ONLY_STOCK_ITEMS, isCat6Plant } from "@/lib/plant-layout";
import {
  atclStockEntryFilter,
  closingStockEntryFilter,
} from "@/lib/plant-catalogs";
import { seesOwnEntriesOnly } from "@/lib/rbac";
import { normalizeBillPhotoUrls } from "@/lib/cloudinary";
import { paginate } from "@/lib/ui/paginate";
import { weightedAveragePurchaseRate } from "@/lib/stock/purchase-average-rate";

const stockLineSchema = z.object({
  itemName: z.string().min(1),
  category: z.enum(StockCategory).default(StockCategory.RM),
  unit: z.string().min(1).default("kg"),
  quantity: z.coerce.number().nonnegative(),
  rate: z.coerce.number().nonnegative().optional(),
  value: z.coerce.number().nonnegative().optional(),
  notes: z.string().optional().nullable(),
});

const stockBatchSchema = z.object({
  date: z.string().regex(dateOnlyRegex),
  shift: z.enum(ManpowerShift).default(ManpowerShift.DAY),
  photoUrl: z.string().url().optional().nullable(),
  photoUrls: z.array(z.string().url()).max(20).optional(),
  entries: z.array(stockLineSchema).min(1),
});

const stockSingleSchema = z.object({
  date: z.string().regex(dateOnlyRegex),
  shift: z.enum(ManpowerShift).default(ManpowerShift.DAY),
  itemName: z.string().min(1),
  category: z.enum(StockCategory).default(StockCategory.RM),
  unit: z.string().min(1).default("kg"),
  quantity: z.coerce.number().nonnegative(),
  rate: z.coerce.number().nonnegative().optional(),
  value: z.coerce.number().nonnegative().optional(),
  notes: z.string().optional().nullable(),
  photoUrl: z.string().url().optional().nullable(),
  photoUrls: z.array(z.string().url()).max(20).optional(),
});

type RouteContext = { params: Promise<{ plantId: string }> };

function lineAmounts(quantity: number, rate?: number, value?: number) {
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

async function resolveStockLineAmounts(
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

function stockEntryCreateData(
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

export async function GET(
  request: NextRequest,
  context: RouteContext,
) {
  const session = await requireSession();
  if ("error" in session) return session.error;

  const { plantId } = await context.params;
  const denied = await requirePlantAccess(session.user.id, plantId);
  if (denied) return denied;

  const sp = request.nextUrl.searchParams;
  const { filter, error } = dateRangeFromSearchParams(sp);
  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }
  const page = Number(sp.get("page")) || 1;
  const pageSize = Number(sp.get("pageSize")) || 10;

  const plant = await prisma.plant.findUnique({
    where: { id: plantId },
    select: { code: true },
  });
  const cat6 = isCat6Plant(plant?.code);
  const snapshot = sp.get("snapshot") === "1";
  const atcl = sp.get("atcl") === "1";
  const ownOnly = seesOwnEntriesOnly(session.user.globalRole);

  const entries = await prisma.stockEntry.findMany({
    where: {
      plantId,
      ...(ownOnly ? { enteredById: session.user.id } : {}),
      ...filter,
      ...(cat6 ? { itemName: { notIn: [...CAT6_PNL_ONLY_STOCK_ITEMS] } } : {}),
      ...(snapshot ? closingStockEntryFilter() : {}),
      ...(atcl ? atclStockEntryFilter() : {}),
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    include: { enteredBy: { select: { globalRole: true } } },
  });

  const { slice, ...pageInfo } = paginate(entries, page, pageSize);
  const totals = entries.reduce(
    (acc, row) => {
      acc.quantity += Number(row.quantity) || 0;
      acc.closingValue += Number(row.closingValue) || 0;
      return acc;
    },
    { quantity: 0, closingValue: 0 },
  );

  const rowsWithStatus = slice.map((e) => ({
    ...e,
    ...resolveEntryApprovalFlags(e, e.enteredBy?.globalRole ?? null),
  }));

  return NextResponse.json({ rows: rowsWithStatus, ...pageInfo, totals });
}

export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  const session = await requireSession();
  if ("error" in session) return session.error;

  const enterDenied = requireCanEnterStock(session.user.globalRole);
  if (enterDenied) return enterDenied;

  const { plantId } = await context.params;
  const denied = await requirePlantAccess(session.user.id, plantId);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const isBatch =
    typeof body === "object" &&
    body !== null &&
    Array.isArray((body as { entries?: unknown }).entries);

  try {
    if (isBatch) {
      const parsed = stockBatchSchema.safeParse(body);
      if (!parsed.success) return zodErrorResponse(parsed.error);

      const data = parsed.data;
      const backdated = isBackdated(data.date);
      const day = parseDateOnly(data.date);
      const photos = normalizeBillPhotoUrls(data.photoUrls, data.photoUrl);
      const approval = entryApprovalCreateData(
        session.user.globalRole,
        data.date,
      );
      const approvalFields = {
        ...approval,
        ...(approval.approvedByHead
          ? { approvedByHeadId: session.user.id }
          : {}),
      };

      const resolved = await Promise.all(
        data.entries.map(async (line) => ({
          line,
          amounts: await resolveStockLineAmounts(
            plantId,
            day,
            line.quantity,
            line.rate,
            line.value,
            line.itemName,
          ),
        })),
      );

      const created = await prisma.$transaction(async (tx) => {
        const entries = [];
        for (const { line, amounts } of resolved) {
          entries.push(
            await tx.stockEntry.create({
              data: stockEntryCreateData(
                plantId,
                session.user.id,
                data,
                line,
                amounts,
                photos,
                approvalFields,
                backdated,
                day,
              ),
            }),
          );
        }
        return entries;
      });

      await safeWriteAuditLog({
        entityType: "StockEntry",
        entityId: created[0]!.id,
        field: "create",
        newValue: {
          itemCount: created.length,
          items: created.map((entry) => entry.itemName),
          closingValue: created.reduce(
            (sum, entry) => sum + Number(entry.closingValue),
            0,
          ),
        },
        actorId: session.user.id,
        plantId,
        isBackdated: backdated,
      });

      await safeRefreshDailyStatus(plantId, day, data.shift, session.user.id);
      await maybeAwardCreditScore(session.user.id, plantId, day, data.shift);

      return NextResponse.json({ entries: created }, { status: 201 });
    }

    const parsed = stockSingleSchema.safeParse(body);
    if (!parsed.success) return zodErrorResponse(parsed.error);

    const data = parsed.data;
    const backdated = isBackdated(data.date);
    const day = parseDateOnly(data.date);
    const photos = normalizeBillPhotoUrls(data.photoUrls, data.photoUrl);
    const amounts = await resolveStockLineAmounts(
      plantId,
      day,
      data.quantity,
      data.rate,
      data.value,
      data.itemName,
    );
    const approval = entryApprovalCreateData(session.user.globalRole, data.date);
    const approvalFields = {
      ...approval,
      ...(approval.approvedByHead ? { approvedByHeadId: session.user.id } : {}),
    };

    const entry = await prisma.stockEntry.create({
      data: stockEntryCreateData(
        plantId,
        session.user.id,
        data,
        data,
        amounts,
        photos,
        approvalFields,
        backdated,
        day,
      ),
    });

    await safeWriteAuditLog({
      entityType: "StockEntry",
      entityId: entry.id,
      field: "create",
      newValue: {
        itemName: entry.itemName,
        quantity: Number(entry.quantity),
        rate: Number(entry.rate),
        closingValue: Number(entry.closingValue),
      },
      actorId: session.user.id,
      plantId,
      isBackdated: backdated,
    });

    await safeRefreshDailyStatus(plantId, day, data.shift, session.user.id);
    await maybeAwardCreditScore(session.user.id, plantId, day, data.shift);

    return NextResponse.json({ entry }, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not save stock entry";
    console.error("stock POST failed", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
) {
  const session = await requireSession();
  if ("error" in session) return session.error;

  const enterDenied = requireCanEnterStock(session.user.globalRole);
  if (enterDenied) return enterDenied;

  const { plantId } = await context.params;
  const denied = await requirePlantAccess(session.user.id, plantId);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = stockSingleSchema
    .partial()
    .extend({ id: z.string().min(1) })
    .safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  const data = parsed.data;
  const existing = await prisma.stockEntry.findFirst({
    where: { id: data.id, plantId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Stock entry not found" }, { status: 404 });
  }

  const quantity = data.quantity ?? Number(existing.quantity);
  const rate = data.rate ?? Number(existing.rate);
  const value = data.value ?? Number(existing.closingValue);
  const amounts = lineAmounts(quantity, data.rate ?? rate, data.value ?? value);
  const dateStr = data.date ?? existing.date.toISOString().slice(0, 10);
  const approvalReset = entryApprovalResetOnEdit(
    session.user.globalRole,
    dateStr,
  );
  const photos =
    data.photoUrls !== undefined || data.photoUrl !== undefined
      ? normalizeBillPhotoUrls(data.photoUrls, data.photoUrl)
      : null;

  const entry = await prisma.stockEntry.update({
    where: { id: existing.id },
    data: {
      date: data.date ? parseDateOnly(data.date) : undefined,
      itemName: data.itemName,
      category: data.category,
      unit: data.unit,
      quantity: amounts.quantity,
      rate: amounts.rate,
      closingValue: amounts.closingValue,
      notes: data.notes,
      ...(photos
        ? {
            photoUrl: photos.billPhotoUrl,
            photoUrls: photos.billPhotoUrls,
          }
        : {}),
      isBackdated: isBackdated(dateStr),
      ...approvalReset,
    },
  });

  await writeAuditLog({
    entityType: "StockEntry",
    entityId: entry.id,
    field: "update",
    oldValue: existing,
    newValue: entry,
    actorId: session.user.id,
    plantId,
    isBackdated: entry.isBackdated,
  });

  return NextResponse.json({ entry });
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext,
) {
  const session = await requireSession();
  if ("error" in session) return session.error;

  const enterDenied = requireCanEnterStock(session.user.globalRole);
  if (enterDenied) return enterDenied;

  const { plantId } = await context.params;
  const denied = await requirePlantAccess(session.user.id, plantId);
  if (denied) return denied;

  const unconfirmed = await requireDeleteConfirmation(request);
  if (unconfirmed) return unconfirmed;

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const existing = await prisma.stockEntry.findFirst({
    where: { id, plantId },
    select: { id: true, date: true, shift: true, enteredById: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Stock entry not found" }, { status: 404 });
  }

  await prisma.stockEntry.delete({ where: { id } });
  await writeAuditLog({
    entityType: "StockEntry",
    entityId: id,
    field: "delete",
    oldValue: { id },
    actorId: session.user.id,
    plantId,
  });
  await maybeRevokeCreditScore(existing.enteredById, plantId, existing.date, existing.shift);
  await safeRefreshDailyStatus(plantId, existing.date, existing.shift);

  return NextResponse.json({ ok: true });
}
