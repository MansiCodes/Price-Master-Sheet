import { NextRequest, NextResponse } from "next/server";
import { PurchaseType } from "@prisma/client";
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
import { dateOnlyRegex, isBackdated, parseDateOnly } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { paginate } from "@/lib/ui/paginate";

const purchaseHeaderFields = {
  date: z.string().regex(dateOnlyRegex),
  type: z.enum(PurchaseType),
  vendorName: z.string().min(1),
  billNumber: z.string().optional().nullable(),
  billDate: z.string().regex(dateOnlyRegex).optional().nullable(),
  billPhotoUrl: z.string().optional().nullable(),
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
  const dateStr = sp.get("date");
  if (dateStr && !dateOnlyRegex.test(dateStr)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }
  const page = Number(sp.get("page")) || 1;
  const pageSize = Number(sp.get("pageSize")) || 10;

  const purchases = await prisma.purchase.findMany({
    where: { plantId, ...(dateStr ? { date: parseDateOnly(dateStr) } : {}) },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  const { slice, ...pageInfo } = paginate(purchases, page, pageSize);

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
    const parsed = purchaseBatchSchema.safeParse(body);
    if (!parsed.success) return zodErrorResponse(parsed.error);

    const data = parsed.data;
    const backdated = isBackdated(data.date);
    const day = parseDateOnly(data.date);
    const headerGst = data.gstPercent ?? 0;

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
            type: data.type,
            vendorName: data.vendorName,
            billNumber: data.billNumber ?? null,
            billDate: data.billDate ? parseDateOnly(data.billDate) : null,
            itemDescription: item.itemDescription,
            unit: item.unit,
            quantity: item.quantity,
            rate: item.rate,
            basicValue,
            gstPercent,
            gstAmount,
            invoiceValue,
            billPhotoUrl: data.billPhotoUrl ?? null,
            enteredById: session.user.id,
            isBackdated: backdated,
          },
        });
      }),
    );

    await Promise.all(
      purchases.map((purchase) =>
        writeAuditLog({
          entityType: "Purchase",
          entityId: purchase.id,
          field: "create",
          newValue: purchase,
          actorId: session.user.id,
          plantId,
          isBackdated: backdated,
        }),
      ),
    );

    await refreshDailyStatus(plantId, day, session.user.id);

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

  const purchase = await prisma.purchase.create({
    data: {
      plantId,
      date: parseDateOnly(data.date),
      type: data.type,
      vendorName: data.vendorName,
      billNumber: data.billNumber ?? null,
      billDate: data.billDate ? parseDateOnly(data.billDate) : null,
      itemDescription: data.itemDescription,
      unit: data.unit,
      quantity: data.quantity,
      rate: data.rate,
      basicValue,
      gstPercent,
      gstAmount,
      invoiceValue,
      billPhotoUrl: data.billPhotoUrl ?? null,
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

  await refreshDailyStatus(plantId, parseDateOnly(data.date), session.user.id);

  return NextResponse.json({ purchase }, { status: 201 });
}
