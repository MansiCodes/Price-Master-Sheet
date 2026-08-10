import { NextRequest, NextResponse } from "next/server";
import { SaleType } from "@prisma/client";
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

const saleHeaderFields = {
  date: z.string().regex(dateOnlyRegex),
  type: z.enum(SaleType),
  customerName: z.string().min(1),
  billNumber: z.string().optional().nullable(),
  billDate: z.string().regex(dateOnlyRegex).optional().nullable(),
  billPhotoUrl: z.string().optional().nullable(),
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
  const dateStr = sp.get("date");
  if (dateStr && !dateOnlyRegex.test(dateStr)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }
  const page = Number(sp.get("page")) || 1;
  const pageSize = Number(sp.get("pageSize")) || 10;

  const sales = await prisma.sale.findMany({
    where: { plantId, ...(dateStr ? { date: parseDateOnly(dateStr) } : {}) },
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

    const sales = await prisma.$transaction(
      data.items.map((item) => {
        const salesValue = round2(item.quantity * item.rate);
        return prisma.sale.create({
          data: {
            plantId,
            date: day,
            type: data.type,
            customerName: data.customerName,
            billNumber: data.billNumber ?? null,
            billDate: data.billDate ? parseDateOnly(data.billDate) : null,
            itemDescription: item.itemDescription,
            unit: item.unit,
            quantity: item.quantity,
            rate: item.rate,
            salesValue,
            billPhotoUrl: data.billPhotoUrl ?? null,
            enteredById: session.user.id,
            isBackdated: backdated,
          },
        });
      }),
    );

    await Promise.all(
      sales.map((sale) =>
        writeAuditLog({
          entityType: "Sale",
          entityId: sale.id,
          field: "create",
          newValue: sale,
          actorId: session.user.id,
          plantId,
          isBackdated: backdated,
        }),
      ),
    );

    await refreshDailyStatus(plantId, day, session.user.id);

    return NextResponse.json({ sales }, { status: 201 });
  }

  const parsed = saleSingleSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  const data = parsed.data;
  const salesValue = round2(data.quantity * data.rate);
  const backdated = isBackdated(data.date);

  const sale = await prisma.sale.create({
    data: {
      plantId,
      date: parseDateOnly(data.date),
      type: data.type,
      customerName: data.customerName,
      billNumber: data.billNumber ?? null,
      billDate: data.billDate ? parseDateOnly(data.billDate) : null,
      itemDescription: data.itemDescription,
      unit: data.unit,
      quantity: data.quantity,
      rate: data.rate,
      salesValue,
      billPhotoUrl: data.billPhotoUrl ?? null,
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

  await refreshDailyStatus(plantId, parseDateOnly(data.date), session.user.id);

  return NextResponse.json({ sale }, { status: 201 });
}
