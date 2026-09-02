import { NextRequest, NextResponse } from "next/server";
import { ManpowerShift, PurchaseType } from "@prisma/client";
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
import { normalizeBillPhotoUrls } from "@/lib/cloudinary";
import { isCat6Plant } from "@/lib/plant-layout";
import { isAtclPurchase } from "@/lib/plant-catalogs";
import { isAdminOrHead } from "@/lib/rbac";
import { paginate } from "@/lib/ui/paginate";

const purchaseHeaderFields = {
  date: z.string().regex(dateOnlyRegex),
  shift: z.enum(ManpowerShift).default(ManpowerShift.DAY),
  type: z.enum(PurchaseType),
  typeOther: z.string().optional().nullable(),
  vendorName: z.string().min(1),
  billNumber: z.string().optional().nullable(),
  billDate: z.string().regex(dateOnlyRegex).optional().nullable(),
  gstin: z.string().optional().nullable(),
  booksDate: z.string().regex(dateOnlyRegex).optional().nullable(),
  notes: z.string().optional().nullable(),
  billPhotoUrl: z.string().url().optional().nullable(),
  billPhotoUrls: z.array(z.string().url()).max(20).optional(),
};

const purchaseItemSchema = z.object({
  itemDescription: z.string().min(1),
  unit: z.string().min(1),
  quantity: z.coerce.number().positive(),
  rate: z.coerce.number().nonnegative(),
  gstPercent: z.coerce.number().min(0).optional(),
  debitQuantity: z.coerce.number().nonnegative().optional().default(0),
  openingReading: z.coerce.number().nonnegative().optional().nullable(),
  closingReading: z.coerce.number().nonnegative().optional().nullable(),
});

const purchaseSingleSchema = z.object({
  ...purchaseHeaderFields,
  itemDescription: z.string().min(1),
  unit: z.string().min(1),
  quantity: z.coerce.number().positive(),
  rate: z.coerce.number().nonnegative(),
  gstPercent: z.coerce.number().min(0).default(0),
  debitQuantity: z.coerce.number().nonnegative().optional().default(0),
  openingReading: z.coerce.number().nonnegative().optional().nullable(),
  closingReading: z.coerce.number().nonnegative().optional().nullable(),
});

const purchaseBatchSchema = z.object({
  ...purchaseHeaderFields,
  gstPercent: z.coerce.number().min(0).optional(),
  items: z.array(purchaseItemSchema).min(1),
});

type RouteContext = { params: Promise<{ plantId: string }> };

function lineTotals(quantity: number, rate: number, gstPercent: number, debitQuantity = 0) {
  const basicValue = round2((quantity - debitQuantity) * rate);
  const gstAmount = round2(basicValue * (gstPercent / 100));
  const invoiceValue = round2(basicValue + gstAmount);
  return { basicValue, gstAmount, invoiceValue, gstPercent };
}

export async function GET(
  request: NextRequest,
  context: RouteContext,
) {
  try {
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
    const excludeAtc = sp.get("excludeAtc") === "1";
    const excludeAtcl = sp.get("excludeAtcl") === "1";
    const atclOnly = sp.get("atclOnly") === "1";

    const plant = await prisma.plant.findUnique({
      where: { id: plantId },
      select: { code: true },
    });
    const cat6 = isCat6Plant(plant?.code);
    const unloadingRate = 70;
    const ownOnly = !isAdminOrHead(session.user.globalRole);

    let purchases = await prisma.purchase.findMany({
      where: {
        plantId,
        ...(ownOnly ? { enteredById: session.user.id } : {}),
        ...filter,
        ...(cat6 && excludeAtc
          ? {
              OR: [
                { sourceKey: null },
                { NOT: { sourceKey: { contains: "purchase-atc" } } },
              ],
            }
          : {}),
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      include: { enteredBy: { select: { globalRole: true } } },
    });

    if (excludeAtcl || atclOnly) {
      purchases = purchases.filter((row) =>
        atclOnly ? isAtclPurchase(row) : !isAtclPurchase(row),
      );
    }

    const { slice, ...pageInfo } = paginate(purchases, page, pageSize);
    const totals = purchases.reduce(
      (acc, row) => {
        acc.quantity += Number(row.quantity) || 0;
        acc.basicValue += Number(row.basicValue) || 0;
        acc.gstAmount += Number(row.gstAmount) || 0;
        acc.invoiceValue += Number(row.invoiceValue) || 0;
        return acc;
      },
      { quantity: 0, basicValue: 0, gstAmount: 0, invoiceValue: 0 },
    );
    const unloadingExpense = round2((totals.quantity / 1000) * unloadingRate);

    const rowsWithStatus = slice.map((p) => ({
      ...p,
      ...resolveEntryApprovalFlags(p, p.enteredBy?.globalRole ?? null),
    }));

    return NextResponse.json({
      rows: rowsWithStatus,
      ...pageInfo,
      totals: { ...totals, unloadingExpense, unloadingRate },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load purchases";
    console.error("purchases GET failed", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
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
    const parsed = purchaseBatchSchema.safeParse(body);
    if (!parsed.success) return zodErrorResponse(parsed.error);

    const data = parsed.data;
    const backdated = isBackdated(data.date);
    const day = parseDateOnly(data.date);
    const headerGst = data.gstPercent ?? 0;
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

    const purchases = await prisma.$transaction(
      data.items.map((item) => {
        const gstPercent = item.gstPercent ?? headerGst;
        const { basicValue, gstAmount, invoiceValue } = lineTotals(
          item.quantity,
          item.rate,
          gstPercent,
          item.debitQuantity,
        );
        return prisma.purchase.create({
          data: {
            plantId,
            date: day,
            shift: data.shift,
            type: data.type,
            typeOther:
              data.type === PurchaseType.OTHERS
                ? data.typeOther?.trim() || null
                : null,
            vendorName: data.vendorName,
            billNumber: data.billNumber ?? null,
            billDate: data.billDate ? parseDateOnly(data.billDate) : null,
            gstin: data.gstin?.trim() || null,
            debitQuantity: item.debitQuantity ?? 0,
            openingReading: item.openingReading ?? null,
            closingReading: item.closingReading ?? null,
            booksDate: data.booksDate ? parseDateOnly(data.booksDate) : null,
            notes: data.notes?.trim() || null,
            itemDescription: item.itemDescription,
            unit: item.unit,
            quantity: item.quantity,
            rate: item.rate,
            basicValue,
            gstPercent,
            gstAmount,
            invoiceValue,
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
      entityType: "Purchase",
      entityId: purchases[0].id,
      field: "create",
      newValue: {
        vendorName: data.vendorName,
        billNumber: data.billNumber ?? null,
        shift: data.shift,
        itemCount: purchases.length,
        items: purchases.map((p) => p.itemDescription),
        invoiceValue: purchases.reduce(
          (sum, p) => sum + Number(p.invoiceValue),
          0,
        ),
      },
      actorId: session.user.id,
      plantId,
      isBackdated: backdated,
    });

    await safeRefreshDailyStatus(plantId, day, data.shift, session.user.id);
    await maybeAwardCreditScore(session.user.id, plantId, day, data.shift);

    return NextResponse.json({ purchases }, { status: 201 });
  }

  const parsed = purchaseSingleSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  const data = parsed.data;
  const { basicValue, gstAmount, invoiceValue, gstPercent } = lineTotals(
    data.quantity,
    data.rate,
    data.gstPercent,
    data.debitQuantity ?? 0,
  );
  const backdated = isBackdated(data.date);
  const photos = normalizeBillPhotoUrls(data.billPhotoUrls, data.billPhotoUrl);
  const approval = entryApprovalCreateData(session.user.globalRole, data.date);
  const approvalFields = {
    ...approval,
    ...(approval.approvedByHead ? { approvedByHeadId: session.user.id } : {}),
  };

  const purchase = await prisma.purchase.create({
    data: {
      plantId,
      date: parseDateOnly(data.date),
      shift: data.shift,
      type: data.type,
      typeOther:
        data.type === PurchaseType.OTHERS
          ? data.typeOther?.trim() || null
          : null,
      vendorName: data.vendorName,
      billNumber: data.billNumber ?? null,
      billDate: data.billDate ? parseDateOnly(data.billDate) : null,
      gstin: data.gstin?.trim() || null,
      debitQuantity: data.debitQuantity ?? 0,
      openingReading: data.openingReading ?? null,
      closingReading: data.closingReading ?? null,
      booksDate: data.booksDate ? parseDateOnly(data.booksDate) : null,
      notes: data.notes?.trim() || null,
      itemDescription: data.itemDescription,
      unit: data.unit,
      quantity: data.quantity,
      rate: data.rate,
      basicValue,
      gstPercent,
      gstAmount,
      invoiceValue,
      billPhotoUrl: photos.billPhotoUrl,
      billPhotoUrls: photos.billPhotoUrls,
      enteredById: session.user.id,
      isBackdated: backdated,
      ...approvalFields,
    },
  });

  await writeAuditLog({
    entityType: "Purchase",
    entityId: purchase.id,
    field: "create",
    newValue: purchase,
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

  return NextResponse.json({ purchase }, { status: 201 });
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

  const parsed = purchaseSingleSchema
    .partial()
    .extend({ id: z.string().min(1) })
    .safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  const data = parsed.data;
  const existing = await prisma.purchase.findFirst({
    where: { id: data.id, plantId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
  }

  const quantity = data.quantity ?? Number(existing.quantity);
  const rate = data.rate ?? Number(existing.rate);
  const gstPercent = data.gstPercent ?? Number(existing.gstPercent);
  const totals = lineTotals(quantity, rate, gstPercent);
  const dateStr = data.date ?? existing.date.toISOString().slice(0, 10);
  const approvalReset = entryApprovalResetOnEdit(
    session.user.globalRole,
    dateStr,
  );

  const purchase = await prisma.purchase.update({
    where: { id: existing.id },
    data: {
      date: data.date ? parseDateOnly(data.date) : undefined,
      type: data.type,
      typeOther: data.typeOther,
      vendorName: data.vendorName,
      billNumber: data.billNumber,
      billDate:
        data.billDate === undefined
          ? undefined
          : data.billDate
            ? parseDateOnly(data.billDate)
            : null,
      gstin: data.gstin,
      booksDate:
        data.booksDate === undefined
          ? undefined
          : data.booksDate
            ? parseDateOnly(data.booksDate)
            : null,
      notes: data.notes,
      itemDescription: data.itemDescription,
      unit: data.unit,
      quantity: data.quantity,
      rate: data.rate,
      gstPercent: totals.gstPercent,
      basicValue: totals.basicValue,
      gstAmount: totals.gstAmount,
      invoiceValue: totals.invoiceValue,
      isBackdated: isBackdated(dateStr),
      ...approvalReset,
    },
  });

  await writeAuditLog({
    entityType: "Purchase",
    entityId: purchase.id,
    field: "update",
    oldValue: existing,
    newValue: purchase,
    actorId: session.user.id,
    plantId,
    isBackdated: purchase.isBackdated,
  });

  return NextResponse.json({ purchase });
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

  const existing = await prisma.purchase.findFirst({
    where: { id, plantId },
    select: { id: true, date: true, shift: true, enteredById: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
  }

  await prisma.purchase.delete({ where: { id } });
  await writeAuditLog({
    entityType: "Purchase",
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
