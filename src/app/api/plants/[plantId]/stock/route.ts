import { NextRequest, NextResponse } from "next/server";
import { ManpowerShift, StockCategory } from "@prisma/client";
import { z } from "zod";
import {
  requireCanEnter,
  requirePlantAccess,
  requireSession,
  round2,
  round4,
  zodErrorResponse,
} from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { refreshDailyStatus } from "@/lib/daily-status";
import { maybeAwardCreditScore } from "@/lib/credit-score";
import { dateOnlyRegex, isBackdated, parseDateOnly } from "@/lib/dates";
import { dateRangeFromSearchParams } from "@/lib/api-date-range";
import { prisma } from "@/lib/db";
import { normalizeBillPhotoUrls } from "@/lib/cloudinary";
import { paginate } from "@/lib/ui/paginate";

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
  photoUrls: z.array(z.string().url()).max(3).optional(),
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
  photoUrls: z.array(z.string().url()).max(3).optional(),
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

  const snapshot = sp.get("snapshot") === "1";
  const entries = await prisma.stockEntry.findMany({
    where: {
      plantId,
      ...filter,
      ...(snapshot ? { notes: { startsWith: "Closing stock" } } : {}),
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  const { slice, ...pageInfo } = paginate(entries, page, pageSize);

  return NextResponse.json({ rows: slice, ...pageInfo });
}

export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  const session = await requireSession();
  if ("error" in session) return session.error;

  const enterDenied = requireCanEnter(session.user.globalRole);
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

  if (isBatch) {
    const parsed = stockBatchSchema.safeParse(body);
    if (!parsed.success) return zodErrorResponse(parsed.error);

    const data = parsed.data;
    const backdated = isBackdated(data.date);
    const day = parseDateOnly(data.date);
    const photos = normalizeBillPhotoUrls(data.photoUrls, data.photoUrl);

    const created = await prisma.$transaction(
      data.entries.map((line) => {
        const amounts = lineAmounts(line.quantity, line.rate, line.value);
        return prisma.stockEntry.create({
          data: {
            plantId,
            date: day,
            shift: data.shift,
            itemName: line.itemName,
            category: line.category,
            unit: line.unit,
            quantity: amounts.quantity,
            rate: amounts.rate,
            closingValue: amounts.closingValue,
            notes: line.notes ?? null,
            photoUrl: photos.billPhotoUrl,
            photoUrls: photos.billPhotoUrls,
            enteredById: session.user.id,
            isBackdated: backdated,
          },
        });
      }),
    );

    await Promise.all(
      created.map((entry) =>
        writeAuditLog({
          entityType: "StockEntry",
          entityId: entry.id,
          field: "create",
          newValue: entry,
          actorId: session.user.id,
          plantId,
          isBackdated: backdated,
        }),
      ),
    );

    await refreshDailyStatus(plantId, day, data.shift, session.user.id);
    await maybeAwardCreditScore(session.user.id, plantId, day, data.shift);

    return NextResponse.json({ entries: created }, { status: 201 });
  }

  const parsed = stockSingleSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  const data = parsed.data;
  const backdated = isBackdated(data.date);
  const day = parseDateOnly(data.date);
  const photos = normalizeBillPhotoUrls(data.photoUrls, data.photoUrl);
  const amounts = lineAmounts(data.quantity, data.rate, data.value);

  const entry = await prisma.stockEntry.create({
    data: {
      plantId,
      date: day,
      shift: data.shift,
      itemName: data.itemName,
      category: data.category,
      unit: data.unit,
      quantity: amounts.quantity,
      rate: amounts.rate,
      closingValue: amounts.closingValue,
      notes: data.notes ?? null,
      photoUrl: photos.billPhotoUrl,
      photoUrls: photos.billPhotoUrls,
      enteredById: session.user.id,
      isBackdated: backdated,
    },
  });

  await writeAuditLog({
    entityType: "StockEntry",
    entityId: entry.id,
    field: "create",
    newValue: entry,
    actorId: session.user.id,
    plantId,
    isBackdated: backdated,
  });

  await refreshDailyStatus(plantId, day, data.shift, session.user.id);
  await maybeAwardCreditScore(session.user.id, plantId, day, data.shift);

  return NextResponse.json({ entry }, { status: 201 });
}
