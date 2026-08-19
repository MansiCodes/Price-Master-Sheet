import { NextRequest, NextResponse } from "next/server";
import { PettyCashKind } from "@prisma/client";
import { requirePlantAccess, requireSession } from "@/lib/api";
import { dateRangeFromSearchParams } from "@/lib/api-date-range";
import { parseDateOnly, toIsoDateString } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { paginate } from "@/lib/ui/paginate";

type RouteContext = { params: Promise<{ plantId: string }> };

export type PvcExpenseRegisterRow = {
  id: string;
  expenseLabel: string;
  sortDate: string;
  periodLabel: string;
  description: string;
  details: string | null;
  amount: number;
  source: "electricityRent" | "pettyCash" | "fixedAsset";
};

function startOfUtcMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

function monthLabel(iso: string): string {
  const d = parseDateOnly(iso);
  return d.toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatDay(iso: string): string {
  const d = parseDateOnly(iso);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  });
}

export async function GET(request: NextRequest, context: RouteContext) {
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
  const pageSize = Number(sp.get("pageSize")) || 20;
  const category = sp.get("category")?.trim() || null;

  const fromDate =
    filter.date &&
    typeof filter.date === "object" &&
    "gte" in filter.date
      ? filter.date.gte
      : undefined;
  const toDate =
    filter.date &&
    typeof filter.date === "object" &&
    "lte" in filter.date
      ? filter.date.lte
      : undefined;
  const fromMonth = fromDate ? startOfUtcMonth(fromDate) : undefined;
  const toMonth = toDate ? startOfUtcMonth(toDate) : undefined;

  const [electricityRows, pettyRows, assetRows] = await Promise.all([
    prisma.electricityRent.findMany({
      where: {
        plantId,
        ...(fromMonth && toMonth
          ? { month: { gte: fromMonth, lte: toMonth } }
          : {}),
      },
      orderBy: { month: "asc" },
    }),
    prisma.pettyCashEntry.findMany({
      where: {
        plantId,
        entryType: PettyCashKind.EXPENSE,
        ...filter,
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    }),
    prisma.fixedAsset.findMany({
      where: { plantId },
      orderBy: [{ billDate: "desc" }, { createdAt: "desc" }],
    }),
  ]);

  const unified: PvcExpenseRegisterRow[] = [];

  for (const row of electricityRows) {
    const monthIso = toIsoDateString(row.month);
    const bill = Number(row.billAmount) || 0;
    const rent = Number(row.rentAmount) || 0;

    if (bill > 0) {
      const details = [
        row.openingReading != null ? `Opening ${row.openingReading}` : null,
        row.closingReading != null ? `Closing ${row.closingReading}` : null,
        row.consumedUnits != null ? `Consumed ${row.consumedUnits}` : null,
      ]
        .filter(Boolean)
        .join(" · ");
      unified.push({
        id: `elec-bill-${row.id}`,
        expenseLabel: "Electricity",
        sortDate: monthIso,
        periodLabel: monthLabel(monthIso),
        description: "Electricity bill",
        details: details || row.notes,
        amount: bill,
        source: "electricityRent",
      });
    }

    if (rent > 0) {
      const area = row.coveredAreaSqft != null ? Number(row.coveredAreaSqft) : null;
      const rate =
        row.rentRatePerSqft != null ? Number(row.rentRatePerSqft) : null;
      const details =
        area != null && rate != null
          ? `${area.toLocaleString("en-IN")} SQFT @ ${rate}`
          : row.notes;
      unified.push({
        id: `elec-rent-${row.id}`,
        expenseLabel: "Factory Rent",
        sortDate: monthIso,
        periodLabel: monthLabel(monthIso),
        description: "Factory rent",
        details,
        amount: rent,
        source: "electricityRent",
      });
    }
  }

  for (const row of pettyRows) {
    const dateIso = toIsoDateString(row.date);
    const head = row.expenseHead.trim() || "Expense";
    unified.push({
      id: `petty-${row.id}`,
      expenseLabel: head,
      sortDate: dateIso,
      periodLabel: formatDay(dateIso),
      description: row.description?.trim() || head,
      details:
        row.openingReading != null || row.closingReading != null
          ? [
              row.openingReading != null ? `Opening ${row.openingReading}` : null,
              row.closingReading != null ? `Closing ${row.closingReading}` : null,
            ]
              .filter(Boolean)
              .join(" · ")
          : null,
      amount: Number(row.amount) || 0,
      source: "pettyCash",
    });
  }

  for (const row of assetRows) {
    const dateIso = row.billDate
      ? toIsoDateString(row.billDate)
      : toIsoDateString(row.createdAt);
    if (fromDate && toDate && row.billDate) {
      const billTime = row.billDate.getTime();
      if (billTime < fromDate.getTime() || billTime > toDate.getTime()) {
        continue;
      }
    }
    unified.push({
      id: `far-${row.id}`,
      expenseLabel: "FAR",
      sortDate: dateIso,
      periodLabel: formatDay(dateIso),
      description: row.assetDescription,
      details: [row.vendor, row.billNumber].filter(Boolean).join(" · ") || null,
      amount: Number(row.cost) || 0,
      source: "fixedAsset",
    });
  }

  unified.sort((a, b) => {
    const byDate = b.sortDate.localeCompare(a.sortDate);
    if (byDate !== 0) return byDate;
    return a.expenseLabel.localeCompare(b.expenseLabel);
  });

  const filtered = category
    ? unified.filter((row) => row.expenseLabel === category)
    : unified;

  const totals = filtered.reduce(
    (acc, row) => {
      acc.amount += row.amount;
      return acc;
    },
    { amount: 0 },
  );

  const { slice, ...pageInfo } = paginate(filtered, page, pageSize);
  return NextResponse.json({ rows: slice, ...pageInfo, totals });
}
