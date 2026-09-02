import { NextRequest, NextResponse } from "next/server";
import { requirePlantAccess, requireSession } from "@/lib/api";
import { parseDateOnly } from "@/lib/dates";
import { weightedAveragePurchaseRate } from "@/lib/stock/purchase-average-rate";

type RouteContext = { params: Promise<{ plantId: string }> };

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

    const itemName = request.nextUrl.searchParams.get("itemName")?.trim() ?? "";
    const dateStr = request.nextUrl.searchParams.get("date")?.trim() ?? "";
    if (!itemName) {
      return NextResponse.json({ error: "itemName is required" }, { status: 400 });
    }
    if (!dateStr) {
      return NextResponse.json({ error: "date is required" }, { status: 400 });
    }

    const asOf = parseDateOnly(dateStr);
    const result = await weightedAveragePurchaseRate(plantId, itemName, asOf);
    if (!result) {
      return NextResponse.json({
        rate: null,
        purchaseCount: 0,
        totalQuantity: 0,
      });
    }

    return NextResponse.json(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not calculate purchase rate";
    console.error("stock average-rate GET failed", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
