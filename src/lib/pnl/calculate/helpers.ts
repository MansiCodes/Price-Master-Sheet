import { PurchaseType, Prisma } from "@prisma/client";
import { buildApprovedEntryWhere } from "@/lib/entry-approval";
import { plantIdFilter } from "@/lib/plant-merge";
import type { PnlStatementLine } from "@/lib/pnl/types";

export const COGS_PURCHASE_TYPES: PurchaseType[] = [
  PurchaseType.RAW_MATERIAL,
  PurchaseType.PACKING,
  PurchaseType.CONSUMABLE,
  PurchaseType.OTHERS,
  PurchaseType.CAPITAL_GOOD,
  PurchaseType.ASSET,
];

export const INCOME_TAX_RATE = 0.25;
/** Excel P&L hardcoded income-tax base (2525000×25%). */
export const PVC_INCOME_TAX_BASE = 2_525_000;
export const PVC_UNLOADING_RATE_PER_MT = 70;

// Excel quirk for CAT6:
// - P&L header ends 22-MAY-26, but Sales account includes sales up to 03-JUN-26
// - Purchases account includes purchases up to 20-MAY-26
export const CAT6_EXCEL_SALES_TO = new Date(Date.UTC(2026, 5, 3));
export const CAT6_EXCEL_PURCHASES_TO = new Date(Date.UTC(2026, 4, 20));

export async function getApprovedFilter(plantIds: string[], approvedOnly?: boolean, from?: Date, to?: Date) {
  if (!approvedOnly) return { rejectedByHead: false };

  return {
    ...plantIdFilter(plantIds),
    ...buildApprovedEntryWhere(from, to),
  };
}

export function toNumber(value: Prisma.Decimal | number | null | undefined): number {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  return Number(value.toString());
}

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function round4(n: number) {
  return Math.round(n * 10_000) / 10_000;
}

export function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

export function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function daysInclusive(from: Date, to: Date): number {
  const ms = startOfUtcDay(to).getTime() - startOfUtcDay(from).getTime();
  return Math.max(1, Math.floor(ms / 86_400_000) + 1);
}

export function monthStartsInRange(from: Date, to: Date): Date[] {
  const months: Date[] = [];
  let cursor = new Date(
    Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1),
  );
  const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), 1));

  while (cursor.getTime() <= end.getTime()) {
    months.push(new Date(cursor));
    cursor = new Date(
      Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1),
    );
  }
  return months;
}

export function ratioOf(amount: number, base: number): number | null {
  if (!(base > 0) || !(amount > 0)) return null;
  const ratio = round2((amount / base) * 100);
  if (ratio > 9999) return null;
  return ratio;
}

export function line(
  label: string,
  amount: number | null,
  ratio: number | null,
  kind: PnlStatementLine["kind"],
): PnlStatementLine {
  return { label, amount, ratio, kind };
}
