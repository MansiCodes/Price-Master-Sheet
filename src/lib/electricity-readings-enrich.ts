import { prisma } from "@/lib/db";
import { isElectricityExpenseHead } from "@/lib/electricity-readings";

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function toNum(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Fill missing opening/closing on expense rows from the month's electricityRent. */
export async function enrichExpenseElectricityReadings<
  T extends {
    date: Date;
    expenseHead: string;
    openingReading?: unknown;
    closingReading?: unknown;
  },
>(plantId: string, rows: T[]): Promise<T[]> {
  const need = rows.filter(
    (r) =>
      isElectricityExpenseHead(r.expenseHead) &&
      (toNum(r.openingReading) == null || toNum(r.closingReading) == null),
  );
  if (need.length === 0) return rows;

  const months = [
    ...new Map(
      need.map((r) => {
        const m = monthStart(r.date);
        return [monthKey(m), m] as const;
      }),
    ).values(),
  ];

  const rents = await prisma.electricityRent.findMany({
    where: { plantId, month: { in: months } },
    select: {
      month: true,
      openingReading: true,
      closingReading: true,
    },
  });

  const byMonth = new Map(
    rents.map((r) => [monthKey(r.month), r] as const),
  );

  return rows.map((row) => {
    if (!isElectricityExpenseHead(row.expenseHead)) return row;
    const open = toNum(row.openingReading);
    const close = toNum(row.closingReading);
    if (open != null && close != null) return row;
    const rent = byMonth.get(monthKey(row.date));
    if (!rent) return row;
    return {
      ...row,
      openingReading: open ?? rent.openingReading,
      closingReading: close ?? rent.closingReading,
    };
  });
}
