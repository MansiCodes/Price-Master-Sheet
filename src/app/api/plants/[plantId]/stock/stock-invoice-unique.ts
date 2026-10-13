import type { ManpowerShift, StockCategory } from "@prisma/client";
import { prisma } from "@/lib/db";
import { formatDayMonthYear } from "@/lib/dates";
import { parseQuadSignalStockNotes } from "@/lib/plant-catalogs";

type StockLineKey = {
  itemName: string;
  category: StockCategory;
  notes?: string | null;
};

function invoiceKey(value: string) {
  return value.trim().toLowerCase();
}

function stockNoteInvoices(notes: string | null | undefined) {
  const { meta } = parseQuadSignalStockNotes(notes);
  return (meta?.saleItems ?? [])
    .map((row) => String(row.invoiceNo ?? "").trim())
    .filter(Boolean);
}

/** Returns an error message when a stock-form invoice no. is repeated or already saved. */
export async function findStockInvoiceConflict(args: {
  plantIds: string[];
  day: Date;
  shift: ManpowerShift;
  lines: StockLineKey[];
}): Promise<string | null> {
  const seen = new Map<string, string>();
  for (const line of args.lines) {
    for (const invoice of stockNoteInvoices(line.notes)) {
      const key = invoiceKey(invoice);
      if (seen.has(key)) return `Invoice no. "${invoice}" is entered more than once in this form.`;
      seen.set(key, invoice);
    }
  }
  if (seen.size === 0) return null;

  const candidates = await prisma.stockEntry.findMany({
    where: {
      plantId: { in: args.plantIds },
      OR: [...seen.values()].map((invoice) => ({
        notes: { contains: invoice, mode: "insensitive" as const },
      })),
    },
    select: { date: true, shift: true, itemName: true, category: true, notes: true },
  });

  const dayTime = args.day.getTime();
  for (const row of candidates) {
    const replacedBySave =
      row.date.getTime() === dayTime &&
      row.shift === args.shift &&
      args.lines.some((l) => l.itemName === row.itemName && l.category === row.category);
    if (replacedBySave) continue;
    for (const invoice of stockNoteInvoices(row.notes)) {
      const original = seen.get(invoiceKey(invoice));
      if (original) {
        return `Invoice no. "${original}" is already filled (${row.itemName}, ${formatDayMonthYear(row.date)}).`;
      }
    }
  }
  return null;
}
