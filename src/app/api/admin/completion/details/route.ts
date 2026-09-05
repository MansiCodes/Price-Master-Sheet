import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api";
import { isAdminOrHead } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { parseDateOnly } from "@/lib/dates";
import { ManpowerShift } from "@prisma/client";

export async function GET(request: NextRequest) {
  const session = await requireSession();
  if ("error" in session) return session.error;

  if (!isAdminOrHead(session.user.globalRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const plantId = searchParams.get("plantId");
  const dateStr = searchParams.get("date");
  const shiftStr = searchParams.get("shift");

  if (!plantId || !dateStr || !shiftStr) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const date = parseDateOnly(dateStr);
  const shift = shiftStr as ManpowerShift;

  const [sales, purchases, stocks, pettyCash] = await Promise.all([
    prisma.sale.findMany({
      where: { plantId, date, shift },
      orderBy: { createdAt: "asc" }
    }),
    prisma.purchase.findMany({
      where: { plantId, date, shift },
      orderBy: { createdAt: "asc" }
    }),
    prisma.stockEntry.findMany({
      where: { plantId, date, shift },
      orderBy: { createdAt: "asc" }
    }),
    prisma.pettyCashEntry.findMany({
      where: { plantId, date, shift },
      orderBy: { createdAt: "asc" }
    })
  ]);

  return NextResponse.json({
    ok: true,
    sales,
    purchases,
    stocks,
    pettyCash
  });
}
