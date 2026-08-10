import { NextRequest, NextResponse } from "next/server";
import { StockCategory } from "@prisma/client";
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

const stockLineSchema = z.object({
  itemName: z.string().min(1),
  category: z.enum(StockCategory),
  unit: z.string().min(1),
  quantity: z.coerce.number().nonnegative(),
  rate: z.coerce.number().nonnegative(),
});

const stockSchema = z.object({
  date: z.string().regex(dateOnlyRegex),
  entries: z.array(stockLineSchema).min(1),
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

  const entries = await prisma.stockEntry.findMany({
    where: { plantId, ...(dateStr ? { date: parseDateOnly(dateStr) } : {}) },
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

  const parsed = stockSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  const data = parsed.data;
  const backdated = isBackdated(data.date);
  const day = parseDateOnly(data.date);

  const created = await prisma.$transaction(
    data.entries.map((line) => {
      const closingValue = round2(line.quantity * line.rate);
      return prisma.stockEntry.create({
        data: {
          plantId,
          date: day,
          itemName: line.itemName,
          category: line.category,
          unit: line.unit,
          quantity: line.quantity,
          rate: line.rate,
          closingValue,
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

  await refreshDailyStatus(plantId, day, session.user.id);

  return NextResponse.json({ entries: created }, { status: 201 });
}
