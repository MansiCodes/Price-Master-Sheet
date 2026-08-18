import { NextRequest, NextResponse } from "next/server";
import { ManpowerShift, PurchaseType } from "@prisma/client";
import { z } from "zod";
import {
  requireCanEnter,
  requirePlantAccess,
  requireSession,
  round2,
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
  billPhotoUrls: z.array(z.string().url()).max(3).optional(),
};

const purchaseItemSchema = z.object({
  itemDescription: z.string().min(1),
  unit: z.string().min(1),
  quantity: z.coerce.number().positive(),
  rate: z.coerce.number().nonnegative(),
  gstPercent: z.coerce.number().min(0).optional(),
});

const purchaseSingleSchema = z.object({
  ...purchaseHeaderFields,
  itemDescription: z.string().min(1),
  unit: z.string().min(1),
  quantity: z.coerce.number().positive(),
  rate: z.coerce.number().nonnegative(),
  gstPercent: z.coerce.number().min(0).default(0),
});

const purchaseBatchSchema = z.object({
  ...purchaseHeaderFields,
  gstPercent: z.coerce.number().min(0).optional(),
  items: z.array(purchaseItemSchema).min(1),
});

type RouteContext = { params: Promise<{ plantId: string }> };

function lineTotals(quantity: number, rate: number, gstPercent: number) {
  const basicValue = round2(quantity * rate);
  const gstAmount = round2(basicValue * (gstPercent / 100));
  const invoiceValue = round2(basicValue + gstAmount);
  return { basicValue, gstAmount, invoiceValue, gstPercent };
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

  const purchases = await prisma.purchase.findMany({
    where: { plantId, ...filter },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  const { slice, ...pageInfo } = paginate(purchases, page, pageSize);
  const totals = purchases.reduce(
    (acc, row) => {
      acc.quantity += Number(row.quantity) || 0;
      acc.basicValue += Number(row.basicValue) || 0;
      acc.invoiceValue += Number(row.invoiceValue) || 0;
      return acc;
    },
    { quantity: 0, basicValue: 0, invoiceValue: 0 },
  );

  return NextResponse.json({ rows: slice, ...pageInfo, totals });
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

    const purchases = await prisma.$transaction(
      data.items.map((item) => {
        const gstPercent = item.gstPercent ?? headerGst;
        const { basicValue, gstAmount, invoiceValue } = lineTotals(
          item.quantity,
          item.rate,
          gstPercent,
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

    await refreshDailyStatus(plantId, day, data.shift, session.user.id);
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
  );
  const backdated = isBackdated(data.date);
  const photos = normalizeBillPhotoUrls(data.billPhotoUrls, data.billPhotoUrl);

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

  await refreshDailyStatus(
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
