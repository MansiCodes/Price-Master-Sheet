import { NextRequest, NextResponse } from "next/server";
import { PettyCashKind } from "@prisma/client";
import { requirePlantAccess, requireSession } from "@/lib/api";
import { dateRangeFromSearchParams } from "@/lib/api-date-range";
import { parseDateOnly, toIsoDateString } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { normalizePvcExpenseHead } from "@/lib/plant-catalogs";
import { monthStartsInRange } from "@/lib/pnl/calculate/helpers";
import { plantIdFilter, resolveReportPlantIds } from "@/lib/plant-merge";
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
  billPhotoUrl?: string | null;
  billPhotoUrls?: string[];
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

function pettyPhotoFields(row: {
  billPhotoUrl: string | null;
  billPhotoUrls: string[];
}) {
  return {
    billPhotoUrl: row.billPhotoUrl,
    billPhotoUrls: row.billPhotoUrls,
  };
}

export async function GET(request: NextRequest, context: RouteContext) {
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
  const pageSize = Number(sp.get("pageSize")) || 20;
  const category = sp.get("category")?.trim() || null;

  const fromDate =
    filter.date instanceof Date
      ? filter.date
      : filter.date && typeof filter.date === "object" && "gte" in filter.date
        ? (filter.date as { gte?: Date }).gte
        : undefined;
  const toDate =
    filter.date instanceof Date
      ? filter.date
      : filter.date && typeof filter.date === "object" && "lte" in filter.date
        ? (filter.date as { lte?: Date }).lte
        : undefined;
  const fromMonth = fromDate ? startOfUtcMonth(fromDate) : undefined;
  const toMonth = toDate ? startOfUtcMonth(toDate) : undefined;

  const [electricityRows, pettyRows, assetRows] = await Promise.all([
    prisma.electricityRent.findMany({
      where: {
        ...pScope,
        ...((fromMonth || toMonth)
          ? {
              month: {
                ...(fromMonth ? { gte: fromMonth } : {}),
                ...(toMonth ? { lte: toMonth } : {}),
              },
            }
          : {}),
      },
      orderBy: { month: "asc" },
    }),
    prisma.pettyCashEntry.findMany({
      where: {
        ...pScope,
        ...filter,
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    }),
    prisma.fixedAsset.findMany({
      where: { ...pScope },
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
        expenseLabel: "Fuel & Power",
        sortDate: monthIso,
        periodLabel: monthLabel(monthIso),
        description: "Fuel & power / electricity bill",
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
    const head = normalizePvcExpenseHead(row.expenseHead.trim() || "Expense");

    if (row.entryType === PettyCashKind.PETTY_CASH) {
      const contractor = Number(row.contractorSalary) || 0;
      const supervisor = Number(row.supervisorSalary) || 0;
      const cashAmount = Number(row.amount) || 0;

      if (contractor > 0) {
        unified.push({
          id: `labour-${row.id}`,
          expenseLabel: "Labour Contractor",
          sortDate: dateIso,
          periodLabel: formatDay(dateIso),
          description: row.description?.trim() || "Labour contractor",
          details: row.payMode?.trim() || null,
          amount: contractor,
          source: "pettyCash",
          ...pettyPhotoFields(row),
        });
      }
      if (supervisor > 0) {
        unified.push({
          id: `salary-${row.id}`,
          expenseLabel: "Salary Expenses",
          sortDate: dateIso,
          periodLabel: formatDay(dateIso),
          description: row.description?.trim() || "Salary expenses",
          details: row.payMode?.trim() || null,
          amount: supervisor,
          source: "pettyCash",
          ...pettyPhotoFields(row),
        });
      }
      if (cashAmount > 0) {
        const isFin = head === "Financial Cost";
        unified.push({
          id: `petty-${row.id}`,
          expenseLabel: isFin ? "Financial Cost" : "Petty Cash",
          sortDate: dateIso,
          periodLabel: formatDay(dateIso),
          description:
            row.description?.trim() || (isFin ? "Financial Cost" : "Petty cash"),
          details: row.nature?.trim() || row.payMode?.trim() || null,
          amount: cashAmount,
          source: "pettyCash",
          ...pettyPhotoFields(row),
        });
      }
      continue;
    }

    if (head === "Factory Rent") {
      const alreadyInElec = electricityRows.some(
        (e) =>
          Number(e.rentAmount) > 0 &&
          e.month.getUTCFullYear() === row.date.getUTCFullYear() &&
          e.month.getUTCMonth() === row.date.getUTCMonth(),
      );
      if (alreadyInElec) {
        // Skip duplicate petty cash entry since rent for this month is already in the monthly rent register
        continue;
      }
    }

    unified.push({
      id: `petty-${row.id}`,
      expenseLabel: head,
      sortDate: dateIso,
      periodLabel: formatDay(dateIso),
      description: row.description?.trim() || head,
      details: (() => {
        const isUnload = /unloading/i.test(head);
        if (isUnload && (row.openingReading != null || row.closingReading != null)) {
          const qty =
            row.openingReading != null ? Number(row.openingReading) : null;
          const rate =
            row.closingReading != null ? Number(row.closingReading) : null;
          if (qty != null && rate != null) {
            return `${qty.toLocaleString("en-IN")} MT @ ₹${rate.toLocaleString("en-IN")}`;
          }
          if (qty != null) return `${qty.toLocaleString("en-IN")} MT`;
          if (rate != null) return `₹${rate.toLocaleString("en-IN")}/MT`;
        }
        if (row.openingReading != null || row.closingReading != null) {
          return [
            row.openingReading != null ? `Opening ${row.openingReading}` : null,
            row.closingReading != null ? `Closing ${row.closingReading}` : null,
          ]
            .filter(Boolean)
            .join(" · ");
        }
        return null;
      })(),
      amount: Number(row.amount) || 0,
      source: "pettyCash",
      ...pettyPhotoFields(row),
    });
  }

  const farMonthsList = monthStartsInRange(
    fromDate ?? new Date("2026-01-01"),
    toDate ?? new Date("2026-10-31"),
  );
  const pvcFarMonths = Math.max(
    1,
    farMonthsList.filter(
      (m) =>
        (m.getUTCFullYear() === 2026 && m.getUTCMonth() >= 1) ||
        m.getUTCFullYear() > 2026,
    ).length,
  );

  for (const row of assetRows) {
    const dateIso = row.billDate
      ? toIsoDateString(row.billDate)
      : toIsoDateString(row.createdAt);
    const dateToCompare = row.billDate ?? row.createdAt;
    if (dateToCompare) {
      const time = dateToCompare.getTime();
      if (fromDate && time < fromDate.getTime()) continue;
      if (toDate && time > toDate.getTime()) continue;
    }

    const cost = Number(row.cost) || 0;
    const depPercent = Number(row.depreciationPercent) || 18.1;
    const annual = cost * (depPercent / 100);
    const depAmount = Math.round(((annual * pvcFarMonths) / 12) * 100) / 100;

    const vendorBill = [row.vendor, row.billNumber].filter(Boolean).join(" · ");
    const details = [
      `Asset Cost: ₹${cost.toLocaleString("en-IN")} @ ${depPercent}% p.a. (${pvcFarMonths} mos)`,
      vendorBill,
    ]
      .filter(Boolean)
      .join(" · ");

    unified.push({
      id: `far-${row.id}`,
      expenseLabel: "FAR",
      sortDate: dateIso,
      periodLabel: formatDay(dateIso),
      description: row.assetDescription,
      details,
      amount: depAmount,
      source: "fixedAsset",
    });
  }

  unified.sort((a, b) => {
    const byDate = b.sortDate.localeCompare(a.sortDate);
    if (byDate !== 0) return byDate;
    return a.expenseLabel.localeCompare(b.expenseLabel);
  });

  const filtered = category
    ? unified.filter((row) => {
        const label = normalizePvcExpenseHead(row.expenseLabel);
        const want = normalizePvcExpenseHead(category);
        return label === want;
      })
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
