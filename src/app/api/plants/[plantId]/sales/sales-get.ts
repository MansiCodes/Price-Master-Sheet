import { NextRequest, NextResponse } from "next/server";
import { requirePlantAccess, requireSession } from "@/lib/api";
import { resolveEntryApprovalFlags } from "@/lib/entry-approval";
import { dateRangeFromSearchParams } from "@/lib/api-date-range";
import { prisma } from "@/lib/db";
import { isCat6Plant } from "@/lib/plant-layout";
import { seesOwnEntriesOnly } from "@/lib/rbac";
import { paginate } from "@/lib/ui/paginate";
import { plantIdFilter, resolveReportPlantIds } from "@/lib/plant-merge";
import type { RouteContext } from "./sale-schemas";

export async function GET(
  request: NextRequest,
  context: RouteContext,
) {
  const session = await requireSession();
  if ("error" in session) return session.error;

  const { plantId } = await context.params;
  const denied = await requirePlantAccess(session.user.id, plantId);
  if (denied) return denied;

  const plantIds = await resolveReportPlantIds(plantId);
  const pScope = plantIdFilter(plantIds);

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
      ...pScope,
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
