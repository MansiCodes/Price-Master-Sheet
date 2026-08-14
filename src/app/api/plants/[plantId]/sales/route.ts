import { NextRequest, NextResponse } from "next/server";
import { ManpowerShift, SaleType } from "@prisma/client";
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
  billPhotoUrls: z.array(z.string().url()).max(3).optional(),
};

const saleItemSchema = z.object({
  itemDescription: z.string().min(1),
  unit: z.string().min(1),
  quantity: z.coerce.number().positive(),
  rate: z.coerce.number().nonnegative(),
});

const saleSingleSchema = z.object({
  ...saleHeaderFields,
  itemDescription: z.string().min(1),
  unit: z.string().min(1),
  quantity: z.coerce.number().positive(),
  rate: z.coerce.number().nonnegative(),
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

  const sales = await prisma.sale.findMany({
    where: { plantId, ...filter },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  const { slice, ...pageInfo } = paginate(sales, page, pageSize);

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
            billPhotoUrl: photos.billPhotoUrl,
            billPhotoUrls: photos.billPhotoUrls,
            enteredById: session.user.id,
            isBackdated: backdated,
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

    await refreshDailyStatus(plantId, day, data.shift, session.user.id);
    await maybeAwardCreditScore(session.user.id, plantId, day, data.shift);

    return NextResponse.json({ sales }, { status: 201 });
  }

  const parsed = saleSingleSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  const data = parsed.data;
  const salesValue = round2(data.quantity * data.rate);
  const backdated = isBackdated(data.date);
  const photos = normalizeBillPhotoUrls(data.billPhotoUrls, data.billPhotoUrl);

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
      billPhotoUrl: photos.billPhotoUrl,
      billPhotoUrls: photos.billPhotoUrls,
      enteredById: session.user.id,
      isBackdated: backdated,
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

  return NextResponse.json({ sale }, { status: 201 });
}
