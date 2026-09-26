import { NextRequest, NextResponse } from "next/server";
import { requirePlantAccess, requireSession, round2 } from "@/lib/api";
import { resolveEntryApprovalFlags } from "@/lib/entry-approval";
import { dateRangeFromSearchParams } from "@/lib/api-date-range";
import { prisma } from "@/lib/db";
import { isCat6Plant } from "@/lib/plant-layout";
import { isAtclPurchase } from "@/lib/plant-catalogs";
import { seesOwnEntriesOnly } from "@/lib/rbac";
import { paginate } from "@/lib/ui/paginate";
import { plantIdFilter, resolveReportPlantIds } from "@/lib/plant-merge";
import type { RouteContext } from "./purchase-schemas";

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

    const plantIds = await resolveReportPlantIds(plantId);
    const pScope = plantIdFilter(plantIds);

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
    const ownOnly = seesOwnEntriesOnly(session.user.globalRole);

    let purchases = await prisma.purchase.findMany({
      where: {
        ...pScope,
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
