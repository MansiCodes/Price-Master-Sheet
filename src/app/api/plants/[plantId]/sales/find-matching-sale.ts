import { prisma } from "@/lib/db";
import { plantIdFilter } from "@/lib/plant-merge";
import { invoiceNumberMatchWhere } from "@/lib/pnl/excel-import/dedupe";

export async function findMatchingSale(opts: {
  plantIds: string[];
  date?: Date;
  billNumber: string | null | undefined;
  quantity?: number;
  rate?: number;
  itemDescription?: string | null;
}) {
  const billRaw = opts.billNumber?.trim() ?? "";
  if (!billRaw) return null;
  const invoiceWhere = invoiceNumberMatchWhere(billRaw);
  if (invoiceWhere.length === 0) return null;

  // Primary: match by invoice number and itemDescription if provided
  if (opts.itemDescription?.trim()) {
    const itemMatch = await prisma.sale.findFirst({
      where: {
        ...plantIdFilter(opts.plantIds),
        OR: invoiceWhere.map((w) => ({
          ...w,
          itemDescription: {
            equals: opts.itemDescription!.trim(),
            mode: "insensitive",
          },
        })),
      },
      select: { id: true, billNumber: true },
    });
    if (itemMatch) return itemMatch;
  }

  // Secondary: match by invoice number alone
  return prisma.sale.findFirst({
    where: {
      ...plantIdFilter(opts.plantIds),
      OR: invoiceWhere,
    },
    select: { id: true, billNumber: true },
  });
}
