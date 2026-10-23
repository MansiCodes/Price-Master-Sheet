import type { SaleType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { plantIdFilter } from "@/lib/plant-merge";
import { invoiceNumberMatchWhere } from "@/lib/pnl/excel-import/dedupe";

export async function findMatchingSale(opts: {
  plantIds: string[];
  date?: Date;
  billNumber: string | null | undefined;
  type?: SaleType;
  quantity?: number;
  rate?: number;
  itemDescription?: string | null;
}) {
  const billRaw = opts.billNumber?.trim() ?? "";
  if (!billRaw) return null;
  const invoiceWhere = invoiceNumberMatchWhere(billRaw);
  if (invoiceWhere.length === 0) return null;

  return prisma.sale.findFirst({
    where: {
      ...plantIdFilter(opts.plantIds),
      ...(opts.type ? { type: opts.type } : {}),
      OR: invoiceWhere,
    },
    select: { id: true, billNumber: true },
  });
}
