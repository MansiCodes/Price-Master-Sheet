import { prisma } from "@/lib/db";
import { plantIdFilter } from "@/lib/plant-merge";
import { invoiceNumberMatchWhere } from "@/lib/pnl/excel-import/dedupe";

export async function findMatchingSale(opts: {
  plantIds: string[];
  date: Date;
  billNumber: string | null | undefined;
  quantity: number;
  rate: number;
}) {
  const billRaw = opts.billNumber?.trim() ?? "";
  const invoiceWhere = invoiceNumberMatchWhere(billRaw);
  if (invoiceWhere.length === 0) return null;
  return prisma.sale.findFirst({
    where: {
      ...plantIdFilter(opts.plantIds),
      OR: invoiceWhere.map((w) => ({
        ...w,
        date: opts.date,
        quantity: opts.quantity,
        rate: opts.rate,
      })),
    },
    select: { id: true, billNumber: true },
  });
}
