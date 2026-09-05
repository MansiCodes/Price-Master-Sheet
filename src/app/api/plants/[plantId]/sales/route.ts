import { NextRequest, NextResponse } from "next/server";
import { ManpowerShift, SaleType } from "@prisma/client";
import { z } from "zod";
import {
  requireCanEnter,
  requireDeleteConfirmation,
  requirePlantAccess,
  requireSession,
  round2,
  zodErrorResponse,
} from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { entryApprovalCreateData, entryApprovalResetOnEdit, resolveEntryApprovalFlags } from "@/lib/entry-approval";
import { safeRefreshDailyStatus } from "@/lib/daily-status";
import { maybeAwardCreditScore, maybeRevokeCreditScore } from "@/lib/credit-score";
import { dateOnlyRegex, isBackdated, parseDateOnly } from "@/lib/dates";
import { dateRangeFromSearchParams } from "@/lib/api-date-range";
import { prisma } from "@/lib/db";
import { isCat6Plant } from "@/lib/plant-layout";
import { seesOwnEntriesOnly } from "@/lib/rbac";
import { paginate } from "@/lib/ui/paginate";
import { normalizeBillPhotoUrls } from "@/lib/cloudinary";

const saleHeaderFields = {
  date: z.string().regex(dateOnlyRegex),
  shift: z.enum(ManpowerShift).default(ManpowerShift.DAY),
  type: z.enum(SaleType),
  typeOther: z.string().optional().nullable(),
  customerName: z.string().min(1),
  billNumber: z.string().optional().nullable(),
  billDate: z.string().regex(dateOnlyRegex).optional().nullable(),
  notes: z.string().optional().nullable(),
  billPhotoUrl: z.string().url().optional().nullable(),
  billPhotoUrls: z.array(z.string().url()).max(20).optional(),
};

const saleItemSchema = z.object({
  itemDescription: z.string().min(1),
  unit: z.string().min(1),
  quantity: z.coerce.number().positive(),
  rate: z.coerce.number().nonnegative(),
  inMeter: z.coerce.number().nonnegative().optional().nullable(),
  qtyMtr: z.coerce.number().nonnegative().optional().nullable(),
  meterUnit: z.string().optional().nullable(),
});

const saleSingleSchema = z.object({
  ...saleHeaderFields,
  itemDescription: z.string().min(1),
  unit: z.string().min(1),
  quantity: z.coerce.number().positive(),
  rate: z.coerce.number().nonnegative(),
  inMeter: z.coerce.number().nonnegative().optional().nullable(),
  qtyMtr: z.coerce.number().nonnegative().optional().nullable(),
  meterUnit: z.string().optional().nullable(),
});

const saleBatchSchema = z.object({
  ...saleHeaderFields,
  items: z.array(saleItemSchema).min(1),
});

type RouteContext = { params: Promise<{ plantId: string }> };

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
  const register = sp.get("register") === "1";

  const plant = await prisma.plant.findUnique({
    where: { id: plantId },
    select: { code: true },
  });
  const cat6 = isCat6Plant(plant?.code);
  const isPvc = plant?.code?.toUpperCase() === "PVC";
  const ownOnly = seesOwnEntriesOnly(session.user.globalRole);

  const sales = await prisma.sale.findMany({
    where: {
      plantId,
      ...(ownOnly ? { enteredById: session.user.id } : {}),
      ...(register && isPvc ? {} : filter),
      ...(cat6
        ? {
            OR: [
              // User-entered rows have `sourceKey = NULL`. In SQL, `NOT (cond)`
              // with NULL inside becomes NULL/false, so we must explicitly allow NULL.
              { sourceKey: null },
              {
                NOT: {
                  OR: [
                    { sourceKey: { endsWith: "sales-online:excel" } },
                    { sourceKey: { contains: "sales-pnl-extra:" } },
                  ],
                },
              },
            ],
          }
        : {}),
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    include: { enteredBy: { select: { globalRole: true } } },
  });

  const { slice, ...pageInfo } = paginate(sales, page, pageSize);
  const totals = sales.reduce(
    (acc, row) => {
      acc.salesValue += Number(row.salesValue) || 0;
      acc.quantity += Number(row.quantity) || 0;
      acc.inMeter += Number(row.inMeter) || 0;
      acc.qtyMtr += Number(row.qtyMtr) || 0;
      return acc;
    },
    { salesValue: 0, quantity: 0, inMeter: 0, qtyMtr: 0 },
  );

  const rowsWithStatus = slice.map((s) => ({
    ...s,
    ...resolveEntryApprovalFlags(s, s.enteredBy?.globalRole ?? null),
  }));

  return NextResponse.json({ rows: rowsWithStatus, ...pageInfo, totals });
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
    Array.isArray((body as { items?: unknown }).items);

  if (isBatch) {
    const parsed = saleBatchSchema.safeParse(body);
    if (!parsed.success) return zodErrorResponse(parsed.error);

    const data = parsed.data;
    const backdated = isBackdated(data.date);
    const day = parseDateOnly(data.date);
    const photos = normalizeBillPhotoUrls(
      data.billPhotoUrls,
      data.billPhotoUrl,
    );
    const approval = entryApprovalCreateData(session.user.globalRole, data.date);
    const approvalFields = {
      ...approval,
      ...(approval.approvedByHead
        ? { approvedByHeadId: session.user.id }
        : {}),
    };

    const sales = await prisma.$transaction(
      data.items.map((item) => {
        const salesValue = round2(item.quantity * item.rate);
        return prisma.sale.create({
          data: {
            plantId,
            date: day,
            shift: data.shift,
            type: data.type,
            typeOther:
              data.type === SaleType.OTHERS
                ? data.typeOther?.trim() || null
                : null,
            customerName: data.customerName,
            billNumber: data.billNumber ?? null,
            billDate: data.billDate ? parseDateOnly(data.billDate) : null,
            notes: data.notes?.trim() || null,
            itemDescription: item.itemDescription,
            unit: item.unit,
            quantity: item.quantity,
            rate: item.rate,
            salesValue,
            inMeter: item.inMeter ?? null,
            qtyMtr: item.qtyMtr ?? null,
            meterUnit: item.meterUnit?.trim() || null,
            billPhotoUrl: photos.billPhotoUrl,
            billPhotoUrls: photos.billPhotoUrls,
            enteredById: session.user.id,
            isBackdated: backdated,
            ...approvalFields,
          },
        });
      }),
    );

    await writeAuditLog({
      entityType: "Sale",
      entityId: sales[0].id,
      field: "create",
      newValue: {
        customerName: data.customerName,
        billNumber: data.billNumber ?? null,
        shift: data.shift,
        itemCount: sales.length,
        items: sales.map((s) => s.itemDescription),
        salesValue: sales.reduce((sum, s) => sum + Number(s.salesValue), 0),
      },
      actorId: session.user.id,
      plantId,
      isBackdated: backdated,
    });

    await safeRefreshDailyStatus(plantId, day, data.shift, session.user.id);
    await maybeAwardCreditScore(session.user.id, plantId, day, data.shift);

    return NextResponse.json({ sales }, { status: 201 });
  }

  const parsed = saleSingleSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  const data = parsed.data;
  const salesValue = round2(data.quantity * data.rate);
  const backdated = isBackdated(data.date);
  const photos = normalizeBillPhotoUrls(data.billPhotoUrls, data.billPhotoUrl);
  const approval = entryApprovalCreateData(session.user.globalRole, data.date);
  const approvalFields = {
    ...approval,
    ...(approval.approvedByHead ? { approvedByHeadId: session.user.id } : {}),
  };

  const sale = await prisma.sale.create({
    data: {
      plantId,
      date: parseDateOnly(data.date),
      shift: data.shift,
      type: data.type,
      typeOther:
        data.type === SaleType.OTHERS
          ? data.typeOther?.trim() || null
          : null,
      customerName: data.customerName,
      billNumber: data.billNumber ?? null,
      billDate: data.billDate ? parseDateOnly(data.billDate) : null,
      notes: data.notes?.trim() || null,
      itemDescription: data.itemDescription,
      unit: data.unit,
      quantity: data.quantity,
      rate: data.rate,
      salesValue,
      inMeter: data.inMeter ?? null,
      qtyMtr: data.qtyMtr ?? null,
      meterUnit: data.meterUnit?.trim() || null,
      billPhotoUrl: photos.billPhotoUrl,
      billPhotoUrls: photos.billPhotoUrls,
      enteredById: session.user.id,
      isBackdated: backdated,
      ...approvalFields,
    },
  });

  await writeAuditLog({
    entityType: "Sale",
    entityId: sale.id,
    field: "create",
    newValue: sale,
    actorId: session.user.id,
    plantId,
    isBackdated: backdated,
  });

  await safeRefreshDailyStatus(
    plantId,
    parseDateOnly(data.date),
    data.shift,
    session.user.id,
  );
  await maybeAwardCreditScore(
    session.user.id,
    plantId,
    parseDateOnly(data.date),
    data.shift,
  );

  return NextResponse.json({ sale }, { status: 201 });
}

export async function PATCH(
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

  const parsed = saleSingleSchema
    .partial()
    .extend({ id: z.string().min(1) })
    .safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  const data = parsed.data;
  const existing = await prisma.sale.findFirst({
    where: { id: data.id, plantId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Sale not found" }, { status: 404 });
  }

  const quantity = data.quantity ?? Number(existing.quantity);
  const rate = data.rate ?? Number(existing.rate);
  const dateStr = data.date ?? existing.date.toISOString().slice(0, 10);
  const approvalReset = entryApprovalResetOnEdit(
    session.user.globalRole,
    dateStr,
  );
  const photos =
    data.billPhotoUrls !== undefined || data.billPhotoUrl !== undefined
      ? normalizeBillPhotoUrls(data.billPhotoUrls, data.billPhotoUrl)
      : null;

  const sale = await prisma.sale.update({
    where: { id: existing.id },
    data: {
      date: data.date ? parseDateOnly(data.date) : undefined,
      type: data.type,
      typeOther: data.typeOther,
      customerName: data.customerName,
      billNumber: data.billNumber,
      billDate:
        data.billDate === undefined
          ? undefined
          : data.billDate
            ? parseDateOnly(data.billDate)
            : null,
      notes: data.notes,
      itemDescription: data.itemDescription,
      unit: data.unit,
      quantity: data.quantity,
      rate: data.rate,
      salesValue: round2(quantity * rate),
      inMeter: data.inMeter,
      qtyMtr: data.qtyMtr,
      meterUnit: data.meterUnit,
      ...(photos
        ? {
            billPhotoUrl: photos.billPhotoUrl,
            billPhotoUrls: photos.billPhotoUrls,
          }
        : {}),
      isBackdated: isBackdated(dateStr),
      ...approvalReset,
    },
  });

  await writeAuditLog({
    entityType: "Sale",
    entityId: sale.id,
    field: "update",
    oldValue: existing,
    newValue: sale,
    actorId: session.user.id,
    plantId,
    isBackdated: sale.isBackdated,
  });

  return NextResponse.json({ sale });
}

export async function DELETE(
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

  const unconfirmed = await requireDeleteConfirmation(request);
  if (unconfirmed) return unconfirmed;

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const existing = await prisma.sale.findFirst({
    where: { id, plantId },
    select: { id: true, date: true, shift: true, enteredById: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Sale not found" }, { status: 404 });
  }

  await prisma.sale.delete({ where: { id } });
  await writeAuditLog({
    entityType: "Sale",
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
